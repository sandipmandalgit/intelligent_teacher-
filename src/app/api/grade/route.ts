export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import {
  getModel,
  fileToGenerativePart,
  isValidFileType,
} from "@/lib/gemini";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
const MAX_STUDENT_PAGES = 15;

// Kept just under `maxDuration` so we can return a clean 504 before the
// platform hard-kills the function at 60s.
const GEMINI_TIMEOUT_MS = 58_000;

const SUPPORTED_LANGUAGES = ["bengali", "hindi", "english"];
const ALLOWED_LABEL = "Allowed: PDF, JPG, PNG, WEBP, HEIC.";

/** Distinguishes a self-imposed timeout from a genuine Gemini API error. */
class GradingTimeoutError extends Error {}

function megabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** The exact grading instruction sent to Gemini 2.5 Pro. */
const GRADING_PROMPT = `You are an expert exam grader for an Indian college Computer Science course.

You will receive:
1. An ANSWER SCRIPT — the official model answers and rubrics from the teacher. It may be a PDF or one or more images.
2. STUDENT ANSWER PAGES — handwritten answers from a single student, in order. These may be PDFs or images, mixed.

TASKS:

STEP A — Parse the Answer Script and extract every question with:
  - question_number, question_text, model_answer, max_marks, rubric (list of {criterion, marks})

STEP B — Read all student page inputs IN ORDER (whether they are PDF pages or images). Some answers may SPAN MULTIPLE PAGES — stitch them together using the question number markers (Q1, Q2, Q3 etc.) the student wrote. If an answer continues to the next page without a clear new question marker, treat it as a continuation of the previous question.

STEP C — For EACH question in the answer script:
  1. Determine if the student attempted it. If not, mark attempted=false and skip grading.
  2. If attempted, extract the student's full answer text (combining across pages if needed).
  3. For each rubric criterion, decide YES / PARTIAL / NO based on the MEANING of the student's answer, not exact wording. Reward paraphrasing and conceptual understanding. Different sentence order or different wording with the same meaning must score full marks.
  4. Award marks: YES = full criterion marks, PARTIAL = half marks (rounded to nearest 0.5), NO = 0.
  5. Sum the marks to get the total score for that question.
  6. List the student's strengths (2 to 4 short bullets).
  7. List the student's mistakes (2 to 4 short bullets).
  8. Write 2 to 3 sentences of encouraging, constructive feedback in clear English.
  9. Translate that feedback into the requested feedback_language using natural, age-appropriate phrasing.
  10. Assess readability_confidence (HIGH / MEDIUM / LOW).

STEP D — Compute overall summary:
  - total_score, total_max_marks, percentage, questions_attempted, questions_unattempted
  - top_3_common_mistakes (deduplicated themes)

OUTPUT FORMAT — Return ONLY valid JSON matching this exact schema:

{
  "answer_script": {
    "subject": string,
    "total_questions": number,
    "total_max_marks": number
  },
  "student_summary": {
    "total_score": number,
    "total_max_marks": number,
    "percentage": number,
    "questions_attempted": number,
    "questions_unattempted": number,
    "overall_readability": "HIGH" | "MEDIUM" | "LOW"
  },
  "graded_questions": [
    {
      "question_number": number,
      "question_text": string,
      "max_marks": number,
      "attempted": boolean,
      "extracted_answer": string,
      "score": number,
      "rubric_evaluation": [
        {
          "criterion": string,
          "marks_possible": number,
          "marks_awarded": number,
          "status": "YES" | "PARTIAL" | "NO",
          "justification": string
        }
      ],
      "strengths": string[],
      "mistakes": string[],
      "feedback_english": string,
      "feedback_translated": string,
      "feedback_language": string,
      "source_pages": number[],
      "readability_confidence": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "common_mistakes": string[]
}

Do not include any text outside the JSON. Do not wrap in markdown code blocks.`;

export async function POST(req: Request) {
  try {
    // --- Parse multipart/form-data -----------------------------------------
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Expected multipart/form-data." },
        { status: 400 },
      );
    }

    const answerScript = formData.get("answer_script");
    const studentPageEntries = formData.getAll("student_pages");
    const feedbackLanguageRaw = formData.get("feedback_language");

    // --- feedback_language (default "bengali") -----------------------------
    let feedbackLanguage = "bengali";
    if (typeof feedbackLanguageRaw === "string" && feedbackLanguageRaw.trim()) {
      const candidate = feedbackLanguageRaw.trim().toLowerCase();
      if (SUPPORTED_LANGUAGES.includes(candidate)) {
        feedbackLanguage = candidate;
      }
    }

    // --- Validate the answer script ----------------------------------------
    if (!(answerScript instanceof File) || answerScript.size === 0) {
      return NextResponse.json(
        {
          error:
            "Answer script is missing. Please upload the teacher's answer script (PDF or image).",
        },
        { status: 400 },
      );
    }
    if (!isValidFileType(answerScript.type)) {
      return NextResponse.json(
        {
          error: `Answer script '${answerScript.name}' is not supported. ${ALLOWED_LABEL}`,
        },
        { status: 400 },
      );
    }
    if (answerScript.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File '${answerScript.name}' is ${megabytes(
            answerScript.size,
          )}, which exceeds the 10MB limit.`,
        },
        { status: 400 },
      );
    }

    // --- Validate the student pages ----------------------------------------
    const studentFiles = studentPageEntries.filter(
      (entry): entry is File => entry instanceof File && entry.size > 0,
    );

    if (studentFiles.length === 0) {
      return NextResponse.json(
        {
          error:
            "No student answer pages uploaded. Please add at least one page (PDF or image).",
        },
        { status: 400 },
      );
    }
    if (studentFiles.length > MAX_STUDENT_PAGES) {
      return NextResponse.json(
        {
          error: `Too many student pages: ${studentFiles.length}. The maximum is ${MAX_STUDENT_PAGES}.`,
        },
        { status: 400 },
      );
    }
    for (const file of studentFiles) {
      if (!isValidFileType(file.type)) {
        return NextResponse.json(
          { error: `File '${file.name}' is not supported. ${ALLOWED_LABEL}` },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File '${file.name}' is ${megabytes(
              file.size,
            )}, which exceeds the 10MB limit.`,
          },
          { status: 400 },
        );
      }
    }

    // --- Convert every file to a Gemini inline-data part -------------------
    const answerScriptPart = fileToGenerativePart(
      Buffer.from(await answerScript.arrayBuffer()),
      answerScript.type,
    );
    const studentParts = await Promise.all(
      studentFiles.map(async (file) =>
        fileToGenerativePart(
          Buffer.from(await file.arrayBuffer()),
          file.type,
        ),
      ),
    );

    // --- Build the prompt --------------------------------------------------
    const prompt = `${GRADING_PROMPT}

The requested feedback_language for this grading is: "${feedbackLanguage}". Use this exact value for every "feedback_language" field in the JSON output.

ATTACHED DOCUMENTS (in order):
- Document 1 is the ANSWER SCRIPT (the teacher's model answers and rubric).
- Documents 2 through ${studentFiles.length + 1} are the STUDENT ANSWER PAGES, in reading order.`;

    // --- Call Gemini 2.5 Pro (with a timeout race) -------------------------
    const model = getModel();
    const generatePromise = model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }, answerScriptPart, ...studentParts],
        },
      ],
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new GradingTimeoutError()),
        GEMINI_TIMEOUT_MS,
      );
    });

    let rawText: string;
    try {
      const result = await Promise.race([generatePromise, timeoutPromise]);
      rawText = result.response.text();
    } catch (err) {
      if (err instanceof GradingTimeoutError) {
        return NextResponse.json(
          {
            error:
              "Grading took too long. This is unusual — please refresh and try again.",
          },
          { status: 504 },
        );
      }
      console.error("[api/grade] Gemini API error:", err);
      return NextResponse.json(
        {
          error:
            "The AI grading service is temporarily unavailable. Please try again in a moment.",
        },
        { status: 502 },
      );
    } finally {
      if (timer) clearTimeout(timer);
    }

    // --- Parse the model's JSON response -----------------------------------
    let graded: unknown;
    try {
      const cleaned = rawText
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "");
      graded = JSON.parse(cleaned);
    } catch {
      console.error(
        "[api/grade] Failed to parse Gemini response as JSON. Raw response:\n",
        rawText,
      );
      return NextResponse.json(
        { error: "AI response was malformed — please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json(graded, { status: 200 });
  } catch (err) {
    console.error("[api/grade] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong while grading. Please try again." },
      { status: 500 },
    );
  }
}
