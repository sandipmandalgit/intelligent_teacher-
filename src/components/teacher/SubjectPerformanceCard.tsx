"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { scoreTone } from "@/lib/result";
import {
  QuestionDifficultyPanel,
  type QuestionDifficulty,
} from "./QuestionDifficultyPanel";

export interface SubjectPerformance {
  subject: string;
  student_count: number;
  session_count: number;
  avg_percentage: number;
  avg_score: number;
  avg_max_marks: number;
  last_graded: string;
}

interface SubjectPerformanceCardProps extends SubjectPerformance {
  /** This subject's per-question difficulty rows (shown in View Details). */
  questions: QuestionDifficulty[];
}

// `[&>div]` targets the Progress indicator (its direct child).
const BAR_TONE = {
  success: "[&>div]:bg-success",
  amber: "[&>div]:bg-amber-500",
  destructive: "[&>div]:bg-destructive",
} as const;
const TEXT_TONE = {
  success: "text-success",
  amber: "text-amber-600",
  destructive: "text-destructive",
} as const;

/** "2 days ago"-style relative time. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

/**
 * A per-subject performance summary card. "View Details" opens a dialog
 * with that subject's question-difficulty breakdown.
 */
export function SubjectPerformanceCard({
  subject,
  student_count,
  session_count,
  avg_percentage,
  avg_score,
  avg_max_marks,
  last_graded,
  questions,
}: SubjectPerformanceCardProps) {
  const [open, setOpen] = useState(false);
  const tone = scoreTone(avg_percentage);

  return (
    <>
      <Card className="rounded-2xl border-border/70 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold leading-snug text-foreground">
            {subject}
          </h3>
          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
            {relativeTime(last_graded)}
          </span>
        </div>

        {/* Mini stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-secondary/50 p-3">
            <p className="text-2xl font-extrabold tabular-nums text-foreground">
              {student_count}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Students
            </p>
          </div>
          <div className="rounded-xl bg-secondary/50 p-3">
            <p className="text-2xl font-extrabold tabular-nums text-foreground">
              {session_count}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Sessions
            </p>
          </div>
        </div>

        {/* Average-score progress bar */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Average score
            </span>
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                TEXT_TONE[tone],
              )}
            >
              {avg_percentage}%
            </span>
          </div>
          <Progress
            value={avg_percentage}
            className={cn("h-3", BAR_TONE[tone])}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Avg score: {avg_score} / {avg_max_marks} · {avg_percentage}%
          </p>
        </div>

        {/* Footer */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 text-sm font-semibold text-primary transition-colors hover:text-primary/70"
        >
          View Details →
        </button>
      </Card>

      {/* Per-subject question difficulty */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{subject} — Question Difficulty</DialogTitle>
            <DialogDescription>
              How students performed on each question in {subject}, hardest
              first.
            </DialogDescription>
          </DialogHeader>
          <QuestionDifficultyPanel questions={questions} />
        </DialogContent>
      </Dialog>
    </>
  );
}
