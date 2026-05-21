export const runtime = "nodejs";
export const maxDuration = 20;

import { NextResponse } from "next/server";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import type { GradingResult } from "@/lib/result";

/** Files larger than this are skipped (not archived) — never fatal. */
const MAX_SAMPLE_SIZE = 5 * 1024 * 1024; // 5 MB

interface Base64Sample {
  mimeType: string;
  data: string;
  sizeBytes: number;
  pageIndex: number;
}

/** Reads a File into a base64 sample, or null if it exceeds the size cap. */
async function toBase64Sample(
  file: File,
  pageIndex: number,
  label: string,
): Promise<Base64Sample | null> {
  if (file.size > MAX_SAMPLE_SIZE) {
    console.warn(
      `[api/archive] skipping ${label} — ${(file.size / 1024 / 1024).toFixed(
        1,
      )}MB exceeds the 5MB cap`,
    );
    return null;
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    mimeType: file.type || "application/octet-stream",
    data: buffer.toString("base64"),
    sizeBytes: file.size,
    pageIndex,
  };
}

/** Reads an optional non-empty string form field. */
function optionalString(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

/**
 * Anonymously archives a completed grading session — its summary, the
 * full grading result, and the original page images. When a roll number
 * is supplied the session is linked to that student; anonymous grading
 * (no roll number) still works and is stored with roll_number: null.
 *
 * Archive failures must NEVER block the user's grading flow.
 */
export async function POST(req: Request) {
  try {
    // --- Parse multipart/form-data ----------------------------------------
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        {
          archived: false,
          error: "Invalid request body. Expected multipart/form-data.",
        },
        { status: 400 },
      );
    }

    // --- Validate grading_result ------------------------------------------
    const gradingResultRaw = formData.get("grading_result");
    if (typeof gradingResultRaw !== "string" || !gradingResultRaw.trim()) {
      return NextResponse.json(
        { archived: false, error: "Missing grading_result." },
        { status: 400 },
      );
    }
    let gradingResult: GradingResult;
    try {
      gradingResult = JSON.parse(gradingResultRaw) as GradingResult;
    } catch {
      return NextResponse.json(
        { archived: false, error: "grading_result is not valid JSON." },
        { status: 400 },
      );
    }

    // --- Validate student_pages -------------------------------------------
    const studentPages = formData
      .getAll("student_pages")
      .filter(
        (entry): entry is File => entry instanceof File && entry.size > 0,
      );
    if (studentPages.length === 0) {
      return NextResponse.json(
        { archived: false, error: "No student_pages provided." },
        { status: 400 },
      );
    }

    // --- answer_script is optional ----------------------------------------
    const answerScriptEntry = formData.get("answer_script");
    const answerScript =
      answerScriptEntry instanceof File && answerScriptEntry.size > 0
        ? answerScriptEntry
        : null;

    // --- Optional platform fields -----------------------------------------
    const rollNumber = optionalString(formData, "roll_number");
    const subjectOverride = optionalString(formData, "subject_override");
    const teacherId = optionalString(formData, "teacher_id");
    const finalizedRaw = formData.get("finalized");
    const finalized = finalizedRaw === "true" || finalizedRaw === "1";

    // --- Convert files to base64 (skipping anything over 5MB) -------------
    const studentPageSamples: Base64Sample[] = [];
    for (let i = 0; i < studentPages.length; i++) {
      const sample = await toBase64Sample(
        studentPages[i],
        i,
        `student page ${i + 1}`,
      );
      if (sample) studentPageSamples.push(sample);
    }
    const answerScriptSample = answerScript
      ? await toBase64Sample(answerScript, 0, "answer script")
      : null;

    // --- Build the archive document ---------------------------------------
    const summary = gradingResult.student_summary;
    const questions = gradingResult.graded_questions ?? [];
    const subject =
      subjectOverride || gradingResult.answer_script?.subject || "Unknown";

    const doc = {
      created_at: new Date(),
      subject,
      total_score: summary?.total_score ?? 0,
      total_max_marks: summary?.total_max_marks ?? 0,
      percentage: summary?.percentage ?? 0,
      questions_attempted: summary?.questions_attempted ?? 0,
      questions_unattempted: summary?.questions_unattempted ?? 0,
      overall_readability: summary?.overall_readability ?? "MEDIUM",
      common_mistakes: gradingResult.common_mistakes ?? [],
      feedback_language: questions[0]?.feedback_language ?? "english",
      page_count: studentPages.length,
      // Compact per-question summary — for dashboard aggregations.
      questions_summary: questions.map((q) => ({
        question_number: q.question_number,
        max_marks: q.max_marks,
        score: q.score,
        attempted: q.attempted,
        readability_confidence: q.readability_confidence,
        source_pages: q.source_pages,
      })),
      // Full grading result — lets the student portal render rich
      // breakdowns (rubric, feedback) for finalized sessions.
      grading_result: gradingResult,
      // Images as base64 — fine for hackathon scale.
      student_page_samples: studentPageSamples,
      answer_script_sample: answerScriptSample,
      // Platform linkage — null for anonymous grading.
      roll_number: rollNumber,
      subject_override: subjectOverride,
      teacher_id: teacherId,
      finalized,
      submitted_at: null as Date | null,
      lesson_plan: null as unknown,
      has_teacher_overrides: false,
      anonymized: rollNumber === null,
    };

    // --- Insert into grading_sessions -------------------------------------
    const db = await getDb();
    const sessions = db.collection(COLLECTIONS.SESSIONS);
    const result = await sessions.insertOne(doc);
    const totalSamples = await sessions.countDocuments();

    return NextResponse.json(
      {
        archived: true,
        session_id: result.insertedId.toString(),
        total_samples: totalSamples,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[api/archive] error:", err);
    return NextResponse.json(
      {
        archived: false,
        error:
          "Could not archive this session, but your grading was saved.",
      },
      { status: 500 },
    );
  }
}
