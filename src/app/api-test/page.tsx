"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

// Accepted file formats for both inputs.
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ApiTestPage() {
  const [answerScript, setAnswerScript] = useState<File | null>(null);
  const [studentPages, setStudentPages] = useState<File[]>([]);
  const [language, setLanguage] = useState("bengali");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!answerScript && studentPages.length > 0 && !loading;

  async function handleSubmit() {
    if (!answerScript || studentPages.length === 0) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("answer_script", answerScript);
      studentPages.forEach((page) => formData.append("student_pages", page));
      formData.append("feedback_language", language);

      const res = await fetch("/api/grade", { method: "POST", body: formData });

      const raw = await res.text();
      let data: unknown = raw;
      try {
        data = JSON.parse(raw);
      } catch {
        /* leave `data` as the raw text */
      }

      if (!res.ok) {
        const message =
          data && typeof data === "object" && "error" in data
            ? String((data as Record<string, unknown>).error)
            : typeof data === "string" && data
              ? data
              : "Request failed.";
        setError(`[HTTP ${res.status}] ${message}`);
      } else {
        setResult(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      setError(
        `[Network error] ${
          err instanceof Error ? err.message : "Could not reach the server."
        }`,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 font-sans">
      <p className="mb-6 rounded-md bg-yellow-100 px-3 py-2 text-sm text-yellow-900">
        🧪 Internal test page — 
      </p>

      <h1 className="mb-1 text-2xl font-bold">/api/grade — test harness</h1>
      <p className="mb-8 text-sm text-gray-500">
        POSTs to the grading endpoint and dumps the raw JSON response.
      </p>

      {/* Answer script */}
      <section className="mb-6">
        <label className="mb-1 block text-sm font-semibold">
          Answer Script <span className="text-gray-500">(single PDF or image)</span>
        </label>
        <input
          type="file"
          accept={ACCEPT}
          onChange={(e) => setAnswerScript(e.target.files?.[0] ?? null)}
          className="block text-sm"
        />
        {answerScript && (
          <p className="mt-1 text-xs text-gray-600">
            {answerScript.name} — {formatSize(answerScript.size)}
          </p>
        )}
      </section>

      {/* Student pages */}
      <section className="mb-6">
        <label className="mb-1 block text-sm font-semibold">
          Student Pages{" "}
          <span className="text-gray-500">(one or more PDFs or images)</span>
        </label>
        <input
          type="file"
          accept={ACCEPT}
          multiple
          onChange={(e) => setStudentPages(Array.from(e.target.files ?? []))}
          className="block text-sm"
        />
        {studentPages.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
            {studentPages.map((page, i) => (
              <li key={`${page.name}-${i}`}>
                {i + 1}. {page.name} — {formatSize(page.size)}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Feedback language */}
      <section className="mb-6">
        <label className="mb-1 block text-sm font-semibold">
          Feedback language
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
        >
          <option value="bengali">Bengali</option>
          <option value="hindi">Hindi</option>
          <option value="english">English</option>
        </select>
      </section>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        Test Grade
      </button>

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-gray-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Grading… this may take 15–30 seconds
        </div>
      )}

      {error && (
        <pre className="mt-6 whitespace-pre-wrap rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </pre>
      )}

      {result && (
        <div className="mt-6">
          <p className="mb-1 text-sm font-semibold">Response</p>
          <pre className="max-h-[520px] overflow-auto rounded-md border border-gray-300 bg-gray-50 p-3 font-mono text-xs leading-relaxed">
            {result}
          </pre>
        </div>
      )}
    </main>
  );
}
