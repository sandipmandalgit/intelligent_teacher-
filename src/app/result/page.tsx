"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  FileQuestion,
  Loader2,
  Plus,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type GradingResult, type LessonPlan } from "@/lib/result";
import { SummaryHero } from "@/components/result/SummaryHero";
import { QuestionCard } from "@/components/result/QuestionCard";
import { CommonMistakes } from "@/components/result/CommonMistakes";
import { LessonPlanCard } from "@/components/result/LessonPlanCard";

const STORAGE_KEY = "shikshaksathi:lastResult";
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type LoadState = "loading" | "empty" | "ready";
type SubmitState = "idle" | "submitting" | "done";

const META_KEY = "shikshaksathi:lastSessionMeta";

interface SessionMeta {
  session_id: string | null;
  roll_number: string | null;
  subject_override: string | null;
}

/** Minimal structural check so a malformed payload falls back to the empty state. */
function isGradingResult(value: unknown): value is GradingResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.answer_script === "object" &&
    v.answer_script !== null &&
    typeof v.student_summary === "object" &&
    v.student_summary !== null &&
    Array.isArray(v.graded_questions)
  );
}

/** Wraps a section in a staggered fade-and-slide entrance. */
function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function ResultPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [result, setResult] = useState<GradingResult | null>(null);
  const [hasEdits, setHasEdits] = useState(false);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submittedName, setSubmittedName] = useState("");
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setState("empty");
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      if (isGradingResult(parsed)) {
        setResult(parsed);
        setState("ready");
      } else {
        setState("empty");
      }
    } catch {
      setState("empty");
    }
    // Session linkage meta — powers the "Submit Final Grade" action.
    try {
      const metaRaw = localStorage.getItem(META_KEY);
      if (metaRaw) {
        const meta = JSON.parse(metaRaw) as SessionMeta;
        if (meta && typeof meta === "object") setSessionMeta(meta);
      }
    } catch {
      // non-fatal
    }
  }, []);

  async function handleSubmitFinal() {
    if (!sessionMeta?.roll_number) return;
    if (!sessionMeta.session_id) {
      toast.error(
        "This grade couldn't be linked — re-grade from the upload page with a roll number set.",
      );
      return;
    }
    setSubmitState("submitting");
    try {
      const res = await fetch("/api/archive/finalize", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionMeta.session_id,
          roll_number: sessionMeta.roll_number,
          subject_override: sessionMeta.subject_override ?? undefined,
          lesson_plan: lessonPlan ?? undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.error ?? "Could not submit the grade.");
        setSubmitState("idle");
        return;
      }
      const name =
        typeof data.student_name === "string" ? data.student_name : "";
      setSubmittedName(name);
      setSubmitState("done");
      toast.success(`Saved to ${name || "the student"}'s permanent record`);
    } catch {
      toast.error("Network error — please try again.");
      setSubmitState("idle");
    }
  }

  // --- Loading: brief spinner to avoid an empty-state flash ---------------
  if (state === "loading") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  // --- Empty / invalid: a friendly call to action ------------------------
  if (state === "empty" || !result) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <Card className="max-w-md rounded-2xl border-border/70 p-8 text-center shadow-sm">
            <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <FileQuestion className="h-8 w-8 text-primary" />
            </span>
            <h1 className="text-xl font-bold text-foreground">
              No grading result yet
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload an answer sheet to see results here.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link href="/grade">Go to Grade Page</Link>
            </Button>
          </Card>
        </motion.div>
      </main>
    );
  }

  // --- Ready: the full result -------------------------------------------
  const { answer_script, student_summary, graded_questions, common_mistakes } =
    result;
  const hasCommonMistakes =
    Array.isArray(common_mistakes) && common_mistakes.length > 0;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:py-12">
      {/* Edited-scores banner — appears after the first override */}
      {hasEdits && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3"
        >
          <p className="text-sm font-medium text-foreground">
            Some scores have been edited. Refresh to update the summary.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RotateCcw />
            Refresh
          </Button>
        </motion.div>
      )}

      {/* Action row */}
      <Reveal
        delay={0}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href="/grade">
              <ArrowLeft />
              Back to Grade
            </Link>
          </Button>
          <Badge variant="secondary" className="gap-1">
            ✋ Tap any score to override
          </Badge>
        </div>
        <Button asChild>
          <Link href="/grade">
            <Plus />
            Grade Another Sheet
          </Link>
        </Button>
      </Reveal>

      {/* Submit final grade to the student record */}
      {sessionMeta?.roll_number && (
        <Reveal delay={0.05}>
          <div className="rounded-xl border border-success/40 bg-success/10 p-4">
            {submitState === "done" ? (
              <p className="flex items-center justify-center gap-2 text-center text-sm font-bold text-success">
                <CheckCircle2 className="h-5 w-5" />
                Submitted to{" "}
                {submittedName || `roll ${sessionMeta.roll_number}`}&apos;s
                permanent record
              </p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-foreground">
                  <p>
                    <span className="font-semibold">
                      Graded for roll {sessionMeta.roll_number}.
                    </span>{" "}
                    Submit to save it to the student&apos;s permanent record.
                  </p>
                  {lessonPlan && (
                    <p className="mt-0.5 text-xs font-medium text-success">
                      ✓ Your lesson plan will be saved with this grade
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleSubmitFinal}
                  disabled={submitState === "submitting"}
                  className="bg-success text-success-foreground hover:bg-success/90"
                >
                  {submitState === "submitting" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <CheckCircle2 />
                  )}
                  {submitState === "submitting"
                    ? "Submitting…"
                    : "Submit Final Grade to Student Record"}
                </Button>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {/* Summary hero */}
      <Reveal delay={0.1}>
        <SummaryHero
          subject={answer_script.subject}
          summary={student_summary}
        />
      </Reveal>

      {/* Low-readability reupload prompt */}
      {student_summary.overall_readability === "LOW" && (
        <Reveal delay={0.15}>
          <Card className="rounded-2xl border-amber-500/30 bg-amber-50/60 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                <TriangleAlert className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-foreground">
                  Image Quality Was Poor
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Some pages were difficult to read, which may have affected
                  grading accuracy. For more reliable scores, consider grading
                  again with sharper photos:
                </p>
                <ul className="ml-4 mt-2 list-disc space-y-0.5 text-xs text-muted-foreground">
                  <li>Place the paper flat on a table</li>
                  <li>Use natural daylight or a desk lamp</li>
                  <li>Hold phone directly above (no tilt)</li>
                  <li>Tap the photo to focus before shooting</li>
                </ul>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="mt-3 border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                >
                  <Link href="/grade">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Grade Again with Better Photos
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </Reveal>
      )}

      {/* Breakdown heading */}
      <Reveal delay={0.2}>
        <div>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">
            Question-by-Question Breakdown
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Click any question to see details
          </p>
        </div>
      </Reveal>

      {/* Question cards */}
      <div className="space-y-4">
        {graded_questions.map((question, i) => (
          <Reveal key={question.question_number ?? i} delay={0.3 + i * 0.06}>
            <QuestionCard
              question={question}
              defaultExpanded={i === 0}
              onEdit={() => setHasEdits(true)}
            />
          </Reveal>
        ))}
      </div>

      {/* Class-level insights */}
      {hasCommonMistakes && (
        <Reveal delay={0.4}>
          <CommonMistakes mistakes={common_mistakes} />
        </Reveal>
      )}

      {/* AI lesson plan generator */}
      {hasCommonMistakes && (
        <Reveal delay={0.45}>
          <LessonPlanCard
            subject={answer_script.subject}
            commonMistakes={common_mistakes}
            feedbackLanguage={
              graded_questions[0]?.feedback_language ?? "english"
            }
            editable
            onPlanChange={setLessonPlan}
          />
        </Reveal>
      )}

      {/* Footer note */}
      <Reveal delay={0.5}>
        <Separator className="mb-4" />
        <p className="text-center text-xs text-muted-foreground">
          AI grading is a suggestion, not a verdict. Review every score before
          sharing with students. Tap any question to expand.
        </p>
      </Reveal>
    </main>
  );
}
