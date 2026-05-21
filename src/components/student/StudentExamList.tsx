"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  type GradingResult,
  type LessonPlan,
  scoreTone,
  toneText,
} from "@/lib/result";
import { SummaryHero } from "@/components/result/SummaryHero";
import { QuestionCard } from "@/components/result/QuestionCard";
import { LessonPlanCard } from "@/components/result/LessonPlanCard";

export interface StudentSession {
  _id: string;
  created_at: string;
  submitted_at: string | null;
  subject: string;
  total_score: number;
  total_max_marks: number;
  percentage: number;
  feedback_language: string;
  common_mistakes: string[];
  grading_result: GradingResult | null;
  lesson_plan: LessonPlan | null;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** One finalized exam — collapsed summary row, expandable rich breakdown. */
function ExamRow({
  session,
  defaultOpen,
}: {
  session: StudentSession;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tone = scoreTone(session.percentage);
  const gr = session.grading_result;

  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/40 sm:gap-4 sm:p-5"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            {formatDate(session.submitted_at ?? session.created_at)}
          </p>
          <p className="truncate text-sm font-bold text-foreground sm:text-base">
            {session.subject}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums text-foreground">
            {session.total_score}/{session.total_max_marks}
          </p>
          <p className={cn("text-xs font-bold tabular-nums", toneText[tone])}>
            {Math.round(session.percentage)}%
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-5 border-t border-border/60 p-4 sm:p-5">
              {gr && gr.student_summary ? (
                <>
                  <SummaryHero
                    subject={gr.answer_script?.subject ?? session.subject}
                    summary={gr.student_summary}
                  />
                  <div>
                    <h4 className="mb-3 text-sm font-bold text-foreground">
                      Question breakdown
                    </h4>
                    <div className="space-y-3">
                      {(gr.graded_questions ?? []).map((q, i) => (
                        <QuestionCard
                          key={q.question_number ?? i}
                          question={q}
                          readOnly
                          defaultExpanded={i === 0}
                        />
                      ))}
                    </div>
                  </div>
                  {session.lesson_plan && (
                    <LessonPlanCard
                      readOnly
                      initialPlan={session.lesson_plan}
                      subject={gr.answer_script?.subject ?? session.subject}
                      commonMistakes={[]}
                      feedbackLanguage={
                        session.lesson_plan.feedback_language ||
                        session.feedback_language
                      }
                    />
                  )}
                </>
              ) : (
                <p className="rounded-xl bg-secondary/50 p-4 text-sm text-muted-foreground">
                  A detailed breakdown isn&apos;t available for this exam.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/** A list of a student's finalized exams, each expandable to a full report. */
export function StudentExamList({ sessions }: { sessions: StudentSession[] }) {
  if (sessions.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed border-border p-10 text-center shadow-none">
        <p className="text-sm font-medium text-foreground">
          No graded exams yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          When a teacher submits a grade, it will appear here.
        </p>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {sessions.map((s, i) => (
        <ExamRow key={s._id} session={s} defaultOpen={i === 0} />
      ))}
    </div>
  );
}
