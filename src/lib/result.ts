/**
 * Shared types and helpers for the grading Result page.
 *
 * The shape mirrors the JSON the /api/grade route returns and that the
 * upload flow persists to localStorage under "shikshaksathi:lastResult".
 */

export type Readability = "HIGH" | "MEDIUM" | "LOW";
export type RubricStatus = "YES" | "PARTIAL" | "NO";

export interface RubricCriterion {
  criterion: string;
  marks_possible: number;
  marks_awarded: number;
  status: RubricStatus;
  justification: string;
}

export interface GradedQuestion {
  question_number: number;
  question_text: string;
  max_marks: number;
  attempted: boolean;
  extracted_answer: string;
  score: number;
  rubric_evaluation: RubricCriterion[];
  strengths: string[];
  mistakes: string[];
  feedback_english: string;
  feedback_translated: string;
  feedback_language: string;
  source_pages: number[];
  readability_confidence: Readability;
}

export interface StudentSummary {
  total_score: number;
  total_max_marks: number;
  percentage: number;
  questions_attempted: number;
  questions_unattempted: number;
  overall_readability: Readability;
}

export interface AnswerScript {
  subject: string;
  total_questions: number;
  total_max_marks: number;
}

export interface GradingResult {
  answer_script: AnswerScript;
  student_summary: StudentSummary;
  graded_questions: GradedQuestion[];
  common_mistakes: string[];
}

/* ----------------------------- Score tone ------------------------------ */

export type Tone = "success" | "amber" | "destructive";

/** Maps a percentage (0-100) to a colour tone: ≥70 green, 40-69 amber, <40 red. */
export function scoreTone(percentage: number): Tone {
  if (percentage >= 70) return "success";
  if (percentage >= 40) return "amber";
  return "destructive";
}

/** Tailwind text-colour class per tone. */
export const toneText: Record<Tone, string> = {
  success: "text-success",
  amber: "text-amber-600",
  destructive: "text-destructive",
};

/** Tailwind SVG stroke-colour class per tone. */
export const toneStroke: Record<Tone, string> = {
  success: "stroke-success",
  amber: "stroke-amber-500",
  destructive: "stroke-destructive",
};

/* --------------------------- Feedback language ------------------------- */

export interface LanguageMeta {
  /** Display header for the translated-feedback card, in its own script. */
  label: string;
  /** BCP-47 tag passed to the Web Speech API. */
  ttsLang: string;
  /** Font utility class for rendering the translated text (empty if none). */
  scriptClass: string;
  /** Human-readable language name, used in the "voice not installed" toast. */
  voiceName: string;
}

/** Resolves a feedback_language value (e.g. "bengali") to display metadata. */
export function languageMeta(language: string): LanguageMeta {
  const lang = (language ?? "").trim().toLowerCase();
  if (lang.startsWith("beng") || lang === "bn") {
    return {
      label: "বাংলায়",
      ttsLang: "bn-IN",
      scriptClass: "font-bengali",
      voiceName: "Bengali",
    };
  }
  if (lang.startsWith("hind") || lang === "hi") {
    return {
      label: "हिन्दी में",
      ttsLang: "hi-IN",
      scriptClass: "",
      voiceName: "Hindi",
    };
  }
  return {
    label: "In English",
    ttsLang: "en-IN",
    scriptClass: "",
    voiceName: "English",
  };
}

/* ------------------------------ Lesson plan ---------------------------- */

export interface LessonPlan {
  topic: string;
  subject: string;
  duration_minutes: number;
  learning_objective: string;
  bengali_analogy: string; // a simple culturally-grounded analogy
  bengali_analogy_label: string; // e.g. "অভিনব রূপক" / "Analogy"
  blackboard_diagram: string; // monospace ASCII diagram
  key_explanation: string; // 2-3 sentence concept explanation in feedback_language
  oral_quiz: { question: string; answer: string }[];
  homework_questions: string[];
  teaching_notes: string; // any extra notes for the teacher in feedback_language
  feedback_language: string;
}

/* ---------------------------- Score overrides -------------------------- */

const STORAGE_KEY = "shikshaksathi:lastResult";

/**
 * Persists a teacher's score override for one question back to localStorage
 * and recomputes the summary total (and percentage) so a page refresh
 * reflects the change. Browser-only; failures — private mode, malformed
 * data — are swallowed silently.
 */
export function persistScoreOverride(
  questionNumber: number,
  newScore: number,
): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const data = JSON.parse(raw) as GradingResult;
    const questions = data.graded_questions;
    if (!Array.isArray(questions)) return;

    const target = questions.find(
      (q) => q.question_number === questionNumber,
    );
    if (!target) return;
    target.score = newScore;

    // Recompute the class total from every current score.
    const total = questions.reduce(
      (sum, q) => sum + (typeof q.score === "number" ? q.score : 0),
      0,
    );
    if (data.student_summary) {
      data.student_summary.total_score = total;
      const max = data.student_summary.total_max_marks;
      if (typeof max === "number" && max > 0) {
        data.student_summary.percentage =
          Math.round((total / max) * 1000) / 10;
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable or data malformed — non-fatal.
  }
}
