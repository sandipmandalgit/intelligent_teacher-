import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type Part,
} from "@google/generative-ai";

/**
 * Gemini client setup for ShikshakSathi's grading engine.
 * This module is server-only — it reads the API key from the environment.
 */

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is missing. Add it to .env.local (GEMINI_API_KEY=your_key) " +
      "before using the grading engine.",
  );
}

console.log("[gemini] Using model:", "gemini-2.5-flash");

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Returns the default grading model — Gemini 2.5 Flash — configured to emit
 * structured JSON. Flash is ~4× faster than Pro with comparable vision
 * quality, and powers the live /api/grade flow.
 */
export function getModel(): GenerativeModel {
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 32768,
    },
  });
}

/**
 * Returns the Gemini 2.5 Pro model, with the same generation config as
 * getModel(). Reserved for a future "high-accuracy mode" toggle.
 */
export function getProModel(): GenerativeModel {
  return genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 32768,
    },
  });
}

/**
 * Returns a Gemini Flash model optimised for lesson-plan generation.
 * Uses a smaller maxOutputTokens since lesson plans are short and
 * we want the response back fast.
 */
export function getLessonPlanModel(): GenerativeModel {
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.5, // slightly higher — we want some creative analogy variation
      maxOutputTokens: 8192,
    },
  });
}

/**
 * Returns a lesson-plan model for a specific model id. Used by the
 * /api/lesson-plan route to fall back to older Flash models when the
 * primary model is overloaded (503) or rate-limited (429).
 */
export function getLessonPlanModelById(modelId: string): GenerativeModel {
  return genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.5,
      maxOutputTokens: 8192,
    },
  });
}

/**
 * Converts an uploaded file buffer into a Gemini inline-data part
 * (base64-encoded), preserving the original mime type.
 */
export function fileToGenerativePart(buffer: Buffer, mimeType: string): Part {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}

/** Mime types accepted by the grading endpoint. */
export const ALLOWED_MIME_TYPES: string[] = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

/** Returns true if the given mime type is accepted (case-insensitive). */
export function isValidFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType.trim().toLowerCase());
}
