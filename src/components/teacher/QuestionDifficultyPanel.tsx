"use client";

import { cn } from "@/lib/utils";

export interface QuestionDifficulty {
  subject: string;
  question_number: number;
  question_text: string;
  max_marks: number;
  total_attempts: number;
  total_unattempted: number;
  avg_score: number;
  percent_correct: number;
  percent_partial: number;
  percent_wrong_or_skipped: number;
  difficulty_rank: number;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

/**
 * The question-difficulty breakdown for ONE subject — questions sorted
 * hardest first, each as a stacked correct/partial/wrong bar. Rendered
 * inside a subject's "View Details" dialog. Pure Tailwind, no charts.
 */
export function QuestionDifficultyPanel({
  questions,
}: {
  questions: QuestionDifficulty[];
}) {
  const sorted = [...questions].sort(
    (a, b) => b.percent_wrong_or_skipped - a.percent_wrong_or_skipped,
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-8 text-center">
        <p className="text-sm font-medium text-foreground">
          No question data yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Grade and submit answer sheets for this subject to see difficulty
          analysis.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {sorted.map((q, i) => {
        const total = q.total_attempts + q.total_unattempted;
        const wrongCount = Math.round(
          (q.percent_wrong_or_skipped / 100) * total,
        );
        const isHardest = i < 3;
        return (
          <li
            key={`${q.subject}-${q.question_number}-${i}`}
            className={cn(
              "rounded-xl border border-border/60 p-3.5",
              isHardest &&
                "border-l-4 border-l-destructive bg-destructive/[0.04]",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                Q{q.question_number}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {wrongCount} / {total} students got it wrong
              </span>
            </div>
            <p className="mt-1.5 text-sm font-medium text-foreground">
              {truncate(q.question_text, 80)}
            </p>

            {/* Stacked difficulty bar */}
            <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-success"
                style={{ width: `${q.percent_correct}%` }}
              />
              <div
                className="bg-amber-500"
                style={{ width: `${q.percent_partial}%` }}
              />
              <div
                className="bg-destructive"
                style={{ width: `${q.percent_wrong_or_skipped}%` }}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.7rem] text-muted-foreground">
              <span>
                <span className="font-semibold text-success">
                  {q.percent_correct}%
                </span>{" "}
                full marks
              </span>
              <span>
                <span className="font-semibold text-amber-600">
                  {q.percent_partial}%
                </span>{" "}
                partial
              </span>
              <span>
                <span className="font-semibold text-destructive">
                  {q.percent_wrong_or_skipped}%
                </span>{" "}
                wrong / skipped
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
