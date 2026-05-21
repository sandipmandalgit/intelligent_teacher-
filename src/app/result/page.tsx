"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileQuestion,
  Loader2,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type GradingResult } from "@/lib/result";
import { SummaryHero } from "@/components/result/SummaryHero";
import { QuestionCard } from "@/components/result/QuestionCard";
import { CommonMistakes } from "@/components/result/CommonMistakes";
import { LessonPlanCard } from "@/components/result/LessonPlanCard";

const STORAGE_KEY = "shikshaksathi:lastResult";
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type LoadState = "loading" | "empty" | "ready";

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
  }, []);

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
              <Link href="/">Go to Grade Page</Link>
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
            <Link href="/">
              <ArrowLeft />
              Back to Grade
            </Link>
          </Button>
          <Badge variant="secondary" className="gap-1">
            ✋ Tap any score to override
          </Badge>
        </div>
        <Button asChild>
          <Link href="/">
            <Plus />
            Grade Another Sheet
          </Link>
        </Button>
      </Reveal>

      {/* Summary hero */}
      <Reveal delay={0.1}>
        <SummaryHero
          subject={answer_script.subject}
          summary={student_summary}
        />
      </Reveal>

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
