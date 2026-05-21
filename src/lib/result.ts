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
