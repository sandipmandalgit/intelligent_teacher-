export const runtime = "nodejs";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import { getLessonPlanModel, getLessonPlanModelById } from "@/lib/gemini";

const SUPPORTED_LANGUAGES = ["bengali", "hindi", "english"];
const MAX_MISTAKES = 5;

// Kept just under `maxDuration` so we return a clean 504 before the
// platform hard-kills the function at 30s.
const LESSON_TIMEOUT_MS = 25_000;

/** Older Flash models to fall back to when the primary is overloaded. */
const FALLBACK_MODEL_IDS = ["gemini-2.0-flash", "gemini-1.5-flash-002"];

/** Distinguishes our own 25s timeout from a genuine Gemini API error. */
class LessonPlanTimeoutError extends Error {}

/** True for transient "service busy" errors (503/429) worth a model fallback. */
function isOverloadedError(err: unknown): boolean {
  const status =
    err && typeof err === "object" && "status" in err
      ? (err as { status?: unknown }).status
      : undefined;
  if (status === 503 || status === 429) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /\b(503|429)\b|overloaded|unavailable|rate.?limit|too many requests|quota/i.test(
    message,
  );
}

const LESSON_PLAN_SCHEMA = `{
  "topic": string,
  "subject": string,
  "duration_minutes": number,
  "learning_objective": string,
  "bengali_analogy": string,
  "bengali_analogy_label": string,
  "blackboard_diagram": string,
  "key_explanation": string,
  "oral_quiz": [{ "question": string, "answer": string }],
  "homework_questions": string[],
  "teaching_notes": string,
  "feedback_language": string
}`;

/** Builds the lesson-plan instruction sent to Gemini. */
function buildPrompt(
  subject: string,
  mistakes: string[],
  feedbackLanguage: string,
  classLevel: string,
): string {
  const mistakeList = mistakes.map((m, i) => `${i + 1}. ${m}`).join("\n");
  return `You are an expert pedagogical AI helping an Indian college teacher design a 5-minute recovery lesson for their class.

The teacher just graded an exam. Across the class, these are the most common mistakes:
${mistakeList}

Subject: ${subject}
Class level: ${classLevel}

TASK:
1. Identify the SINGLE most important misconception to address (pick the one most impactful for learning).
2. Design a 5-minute mini-lesson the teacher can deliver in their NEXT class.
3. The lesson must include:
   - A clear learning_objective (one sentence)
   - A culturally-grounded BENGALI ANALOGY using everyday Indian life (households, food, festivals, family) that makes the concept click. Even if the requested feedback_language is English/Hindi, the analogy should still be culturally Indian.
   - A simple ASCII blackboard_diagram (monospace, max 15 lines wide) the teacher can sketch
   - A 2-3 sentence key_explanation in the requested feedback_language
   - 3 oral_quiz questions with concise answers for in-class call-and-response
   - 3 homework_questions for student practice
   - teaching_notes — 1-2 sentences of additional pedagogical guidance

Translate ALL text fields (except the ASCII diagram) into the requested feedback_language.
The bengali_analogy_label should be in the feedback_language too (e.g. "Analogy" in English, "অভিনব রূপক" in Bengali, "उपमा" in Hindi).

The requested feedback_language is "${feedbackLanguage}". Use this exact value for the "feedback_language" field, and set "duration_minutes" to 5.

Return ONLY valid JSON matching this exact schema. No markdown, no extra text:
${LESSON_PLAN_SCHEMA}`;
}

/**
 * Runs the prompt through the primary model, falling back to older Flash
 * models on 503/429. Throws the last error if every model is exhausted.
 */
async function generateLessonPlan(prompt: string): Promise<string> {
  const models = [
    getLessonPlanModel(),
    ...FALLBACK_MODEL_IDS.map((id) => getLessonPlanModelById(id)),
  ];

  let lastError: unknown;
  for (let i = 0; i < models.length; i++) {
    try {
      const result = await models[i].generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastError = err;
      const canRetry = isOverloadedError(err) && i < models.length - 1;
      if (!canRetry) throw err;
      console.warn(
        `[api/lesson-plan] model #${i + 1} unavailable — falling back`,
      );
    }
  }
  throw lastError;
}

export async function POST(req: Request) {
  try {
    // --- Parse JSON body ---------------------------------------------------
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON." },
        { status: 400 },
      );
    }

    const data = (body ?? {}) as Record<string, unknown>;

    // --- Validate subject --------------------------------------------------
    const subject =
      typeof data.subject === "string" ? data.subject.trim() : "";
    if (!subject) {
      return NextResponse.json(
        { error: "Subject is missing. Please provide the exam subject." },
        { status: 400 },
      );
    }

    // --- Validate common_mistakes (cap to first 5) -------------------------
    const rawMistakes = Array.isArray(data.common_mistakes)
      ? data.common_mistakes
      : [];
    const mistakes = rawMistakes
      .filter(
        (m): m is string => typeof m === "string" && m.trim().length > 0,
      )
      .map((m) => m.trim())
      .slice(0, MAX_MISTAKES);
    if (mistakes.length === 0) {
      return NextResponse.json(
        {
          error:
            "No common mistakes provided. A lesson plan needs at least one class-level mistake to address.",
        },
        { status: 400 },
      );
    }

    // --- feedback_language (default English) + optional class_level -------
    let feedbackLanguage = "english";
    if (
      typeof data.feedback_language === "string" &&
      SUPPORTED_LANGUAGES.includes(
        data.feedback_language.trim().toLowerCase(),
      )
    ) {
      feedbackLanguage = data.feedback_language.trim().toLowerCase();
    }
    const classLevel =
      typeof data.class_level === "string" && data.class_level.trim()
        ? data.class_level.trim()
        : "college";

    const prompt = buildPrompt(
      subject,
      mistakes,
      feedbackLanguage,
      classLevel,
    );

    // --- Call Gemini with a 25s timeout race ------------------------------
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new LessonPlanTimeoutError()),
        LESSON_TIMEOUT_MS,
      );
    });

    let rawText: string;
    try {
      rawText = await Promise.race([
        generateLessonPlan(prompt),
        timeoutPromise,
      ]);
    } catch (err) {
      if (err instanceof LessonPlanTimeoutError) {
        return NextResponse.json(
          {
            error:
              "Lesson plan generation took too long. Please try again in a moment.",
          },
          { status: 504 },
        );
      }
      if (isOverloadedError(err)) {
        return NextResponse.json(
          {
            error:
              "The AI service is busy right now. Please try again in a minute.",
          },
          { status: 503 },
        );
      }
      console.error("[api/lesson-plan] Gemini error:", err);
      return NextResponse.json(
        {
          error:
            "The lesson plan service is temporarily unavailable. Please try again.",
        },
        { status: 502 },
      );
    } finally {
      if (timer) clearTimeout(timer);
    }

    // --- Parse the model's JSON response ----------------------------------
    let lessonPlan: unknown;
    try {
      const cleaned = rawText
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "");
      lessonPlan = JSON.parse(cleaned);
    } catch {
      console.error(
        "[api/lesson-plan] Failed to parse Gemini response as JSON. Raw response:\n",
        rawText,
      );
      return NextResponse.json(
        { error: "AI response was malformed — please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json(lessonPlan, { status: 200 });
  } catch (err) {
    console.error("[api/lesson-plan] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong while building the lesson plan." },
      { status: 500 },
    );
  }
}
