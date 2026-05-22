import {
  type GradingResult,
  type LessonPlan,
  languageMeta,
} from "@/lib/result";

interface GradeReportProps {
  result: GradingResult;
  overrides: Record<number, number>;
  lessonPlan: LessonPlan | null;
}

/**
 * A print-only grade report. Hidden on screen; revealed by the browser's
 * print / Save-as-PDF flow (the "Download PDF" button on the result page).
 *
 * It is built from data — not the on-screen UI — so it always contains
 * every question, all feedback, and the lesson plan in a clean light
 * document. Bengali/Hindi render via the page's loaded fonts.
 */
export function GradeReport({
  result,
  overrides,
  lessonPlan,
}: GradeReportProps) {
  const { answer_script, student_summary, graded_questions, common_mistakes } =
    result;

  // Apply teacher score overrides so the report shows the final grade.
  const questions = graded_questions.map((q) => ({
    ...q,
    score: overrides[q.question_number] ?? q.score,
  }));
  const totalScore = questions.reduce(
    (sum, q) => sum + (typeof q.score === "number" ? q.score : 0),
    0,
  );
  const maxMarks = student_summary.total_max_marks;
  const pct = maxMarks > 0 ? Math.round((totalScore / maxMarks) * 100) : 0;

  const lang = languageMeta(
    graded_questions[0]?.feedback_language ?? "english",
  );
  const showTranslated = lang.voiceName !== "English";
  const today = new Date().toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-[13px] leading-relaxed text-black">
      {/* Header */}
      <div className="border-b-2 border-black/70 pb-3">
        <h1 className="text-2xl font-extrabold">
          ShikshakSathi — Grade Report
        </h1>
        <p className="mt-1 text-sm text-black/70">
          {answer_script.subject} · {today}
        </p>
      </div>

      {/* Summary */}
      <div className="mt-4">
        <p className="text-lg font-bold">
          Total Score: {totalScore} / {maxMarks} ({pct}%)
        </p>
        <p className="mt-0.5 text-sm text-black/80">
          Attempted: {student_summary.questions_attempted} · Skipped:{" "}
          {student_summary.questions_unattempted} · Handwriting readability:{" "}
          {student_summary.overall_readability}
        </p>
      </div>

      {/* Questions */}
      <h2 className="mt-6 border-b border-black/40 pb-1 text-base font-bold uppercase tracking-wide">
        Question-by-Question Breakdown
      </h2>
      {questions.map((q) => (
        <div
          key={q.question_number}
          className="mt-4 break-inside-avoid border-l-2 border-black/20 pl-3"
        >
          <div className="flex items-start justify-between gap-4">
            <p className="font-bold">
              Q{q.question_number}. {q.question_text}
            </p>
            <p className="shrink-0 font-bold">
              {q.score} / {q.max_marks}
            </p>
          </div>
          {q.attempted ? (
            <div className="mt-1 space-y-1">
              <p>
                <span className="font-semibold">Student answer: </span>
                <span className="italic">{q.extracted_answer}</span>
              </p>
              {q.rubric_evaluation.length > 0 && (
                <div>
                  <span className="font-semibold">Rubric:</span>
                  <ul className="ml-5 list-disc">
                    {q.rubric_evaluation.map((r, i) => (
                      <li key={i}>
                        {r.criterion} — {r.marks_awarded}/{r.marks_possible} (
                        {r.status})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {q.strengths.length > 0 && (
                <p>
                  <span className="font-semibold">Strengths: </span>
                  {q.strengths.join("; ")}
                </p>
              )}
              {q.mistakes.length > 0 && (
                <p>
                  <span className="font-semibold">To improve: </span>
                  {q.mistakes.join("; ")}
                </p>
              )}
              <p>
                <span className="font-semibold">Feedback (English): </span>
                {q.feedback_english}
              </p>
              {showTranslated && (
                <p>
                  <span className="font-semibold">
                    Feedback ({lang.label}):{" "}
                  </span>
                  <span className={lang.scriptClass}>
                    {q.feedback_translated}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1 italic text-black/70">Not attempted.</p>
          )}
        </div>
      ))}

      {/* Common mistakes */}
      {common_mistakes.length > 0 && (
        <>
          <h2 className="mt-6 border-b border-black/40 pb-1 text-base font-bold uppercase tracking-wide">
            Class-Level Common Mistakes
          </h2>
          <ul className="ml-5 mt-2 list-disc">
            {common_mistakes.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </>
      )}

      {/* Lesson plan */}
      {lessonPlan && (
        <div className="break-inside-avoid">
          <h2 className="mt-6 border-b border-black/40 pb-1 text-base font-bold uppercase tracking-wide">
            5-Minute Lesson Plan
          </h2>
          <p className="mt-2 text-base font-bold">{lessonPlan.topic}</p>
          <div className="mt-1 space-y-1">
            <p>
              <span className="font-semibold">Learning objective: </span>
              {lessonPlan.learning_objective}
            </p>
            <p>
              <span className="font-semibold">
                {lessonPlan.bengali_analogy_label || "Analogy"}:{" "}
              </span>
              <span className={lang.scriptClass}>
                {lessonPlan.bengali_analogy}
              </span>
            </p>
            <div>
              <span className="font-semibold">Blackboard diagram:</span>
              <pre className="mt-0.5 whitespace-pre-wrap border border-black/30 p-2 font-mono text-[11px]">{lessonPlan.blackboard_diagram}</pre>
            </div>
            <p>
              <span className="font-semibold">Key explanation: </span>
              <span className={lang.scriptClass}>
                {lessonPlan.key_explanation}
              </span>
            </p>
            {lessonPlan.oral_quiz.length > 0 && (
              <div>
                <span className="font-semibold">Oral quiz:</span>
                <ol className="ml-5 list-decimal">
                  {lessonPlan.oral_quiz.map((qz, i) => (
                    <li key={i}>
                      {qz.question} —{" "}
                      <span className="italic">{qz.answer}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {lessonPlan.homework_questions.length > 0 && (
              <div>
                <span className="font-semibold">Homework:</span>
                <ol className="ml-5 list-decimal">
                  {lessonPlan.homework_questions.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ol>
              </div>
            )}
            {lessonPlan.teaching_notes && (
              <p>
                <span className="font-semibold">Teaching notes: </span>
                {lessonPlan.teaching_notes}
              </p>
            )}
          </div>
        </div>
      )}

      <p className="mt-8 border-t border-black/30 pt-2 text-[11px] text-black/60">
        Generated by ShikshakSathi · AI grading is a suggestion — please
        review before sharing with students.
      </p>
    </div>
  );
}
