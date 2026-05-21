"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenCheck,
  Clock,
  Loader2,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LessonPlan, type LanguageMeta, languageMeta } from "@/lib/result";
import { PlayButton } from "./PlayButton";

interface LessonPlanCardProps {
  subject: string;
  commonMistakes: string[];
  feedbackLanguage: string;
}

type Status = "idle" | "loading" | "loaded" | "error";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Staggered entrance for the lesson-plan sections once it arrives.
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

/* --------------------------- Small building blocks --------------------- */

/** An emoji-prefixed section heading. */
function LessonSection({
  emoji,
  title,
  titleClassName,
  children,
}: {
  emoji: string;
  title: string;
  titleClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section variants={itemVariants} className="space-y-2">
      <h4
        className={cn(
          "flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground",
          titleClassName,
        )}
      >
        <span aria-hidden className="text-sm">
          {emoji}
        </span>
        {title}
      </h4>
      {children}
    </motion.section>
  );
}

/** One oral-quiz question with a tap-to-reveal answer. */
function QuizItem({
  index,
  question,
  answer,
  scriptClass,
}: {
  index: number;
  question: string;
  answer: string;
  scriptClass: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <li className="rounded-lg border border-border/70 bg-card p-3">
      <div className="flex items-start gap-2.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
          {index}
        </span>
        <p
          className={cn(
            "flex-1 text-sm font-medium text-foreground",
            scriptClass,
          )}
        >
          {question}
        </p>
      </div>
      <div className="mt-2 pl-[1.875rem]">
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="text-xs font-semibold text-primary transition-colors hover:text-primary/70"
        >
          {show ? "▲ Hide answer" : "▼ Show answer"}
        </button>
        <AnimatePresence initial={false}>
          {show && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="overflow-hidden"
            >
              <p
                className={cn(
                  "pt-1.5 text-sm text-muted-foreground",
                  scriptClass,
                )}
              >
                {answer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </li>
  );
}

/* ------------------------------ States --------------------------------- */

function IdleCta({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BookOpenCheck className="h-6 w-6" />
        </span>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent-foreground">
          <Sparkles className="h-6 w-6" />
        </span>
      </div>
      <h3 className="mt-4 text-lg font-bold text-foreground">
        Generate a 5-minute lesson plan
      </h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        AI will create a teaching plan based on your class&apos;s most common
        mistakes
      </p>
      <Button onClick={onGenerate} size="lg" className="mt-5">
        <Wand2 />
        Generate Lesson Plan
      </Button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-3 text-sm font-semibold text-foreground">
        Designing your lesson… (8-15 seconds)
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Finding the perfect analogy for your class
      </p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="h-6 w-6" />
      </span>
      <h3 className="mt-3 text-base font-bold text-foreground">
        Couldn&apos;t generate the lesson plan
      </h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      <Button onClick={onRetry} variant="outline" className="mt-4">
        <RotateCcw />
        Try again
      </Button>
    </div>
  );
}

function PlanView({
  plan,
  lang,
  onRegenerate,
}: {
  plan: LessonPlan;
  lang: LanguageMeta;
  onRegenerate: () => void;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex items-start justify-between gap-3"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {plan.subject || "Mini-lesson"}
          </p>
          <h3 className="mt-0.5 text-lg font-bold leading-snug text-foreground sm:text-xl">
            {plan.topic}
          </h3>
        </div>
        <Badge className="shrink-0 gap-1">
          <Clock className="h-3.5 w-3.5" />
          {plan.duration_minutes} min lesson
        </Badge>
      </motion.div>

      {/* 1 — Learning Objective */}
      <LessonSection emoji="🎯" title="Learning Objective">
        <div className="rounded-xl bg-primary/[0.06] p-4 ring-1 ring-inset ring-primary/15">
          <p className="text-sm font-semibold leading-relaxed text-foreground">
            {plan.learning_objective}
          </p>
        </div>
      </LessonSection>

      {/* 2 — Analogy */}
      <LessonSection emoji="🇮🇳" title={plan.bengali_analogy_label || "Analogy"}>
        <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <p
              className={cn(
                "flex-1 text-sm italic leading-relaxed text-foreground",
                lang.scriptClass,
              )}
            >
              “{plan.bengali_analogy}”
            </p>
            <PlayButton
              text={plan.bengali_analogy}
              lang={lang.ttsLang}
              voiceName={lang.voiceName}
            />
          </div>
        </div>
      </LessonSection>

      {/* 3 — Blackboard Diagram */}
      <LessonSection emoji="✏️" title="Blackboard Diagram">
        <pre className="overflow-x-auto rounded-xl bg-zinc-800 p-4 font-mono text-xs leading-relaxed text-zinc-50">{plan.blackboard_diagram}</pre>
      </LessonSection>

      {/* 4 — Key Explanation */}
      <LessonSection emoji="📖" title="Key Explanation">
        <div className="rounded-xl border border-border/70 bg-background/60 p-4">
          <div className="mb-2 flex justify-end">
            <PlayButton
              text={plan.key_explanation}
              lang={lang.ttsLang}
              voiceName={lang.voiceName}
            />
          </div>
          <p
            className={cn(
              "text-sm leading-relaxed text-foreground",
              lang.scriptClass,
            )}
          >
            {plan.key_explanation}
          </p>
        </div>
      </LessonSection>

      {/* 5 — Oral Quiz */}
      {plan.oral_quiz?.length > 0 && (
        <LessonSection emoji="❓" title="Quick Oral Quiz">
          <ul className="space-y-2">
            {plan.oral_quiz.map((q, i) => (
              <QuizItem
                key={i}
                index={i + 1}
                question={q.question}
                answer={q.answer}
                scriptClass={lang.scriptClass}
              />
            ))}
          </ul>
        </LessonSection>
      )}

      {/* 6 — Homework Practice */}
      {plan.homework_questions?.length > 0 && (
        <LessonSection emoji="📝" title="Homework Practice">
          <ol className="space-y-2">
            {plan.homework_questions.map((h, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm text-foreground"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-bold text-secondary-foreground">
                  {i + 1}
                </span>
                <span className={cn("leading-relaxed", lang.scriptClass)}>
                  {h}
                </span>
              </li>
            ))}
          </ol>
        </LessonSection>
      )}

      {/* 7 — Teaching Notes */}
      {plan.teaching_notes && (
        <LessonSection emoji="👩‍🏫" title="Teaching Notes">
          <p
            className={cn(
              "text-sm italic leading-relaxed text-muted-foreground",
              lang.scriptClass,
            )}
          >
            {plan.teaching_notes}
          </p>
        </LessonSection>
      )}

      {/* Footer */}
      <motion.div variants={itemVariants} className="flex justify-center pt-1">
        <Button
          onClick={onRegenerate}
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary"
        >
          <RotateCcw />
          Generate Another Plan
        </Button>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------ Main card ------------------------------ */

/**
 * Turns a class's common mistakes into a ready-to-teach 5-minute lesson
 * plan via the /api/lesson-plan AI agent.
 */
export function LessonPlanCard({
  subject,
  commonMistakes,
  feedbackLanguage,
}: LessonPlanCardProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [error, setError] = useState("");

  const lang = languageMeta(feedbackLanguage);

  async function generate() {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          common_mistakes: commonMistakes,
          feedback_language: feedbackLanguage,
        }),
      });

      let payload: unknown = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof (payload as { error: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "Couldn't generate the lesson plan. Please try again.";
        setError(message);
        setStatus("error");
        return;
      }

      setPlan(payload as LessonPlan);
      setStatus("loaded");
    } catch {
      setError(
        "Network error — please check your connection and try again.",
      );
      setStatus("error");
    }
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
      {/* Deep-teal-to-accent gradient header strip */}
      <div className="h-2 w-full bg-gradient-to-r from-primary via-primary to-accent" />

      <div className="p-6 sm:p-7">
        {status === "idle" && <IdleCta onGenerate={generate} />}
        {status === "loading" && <LoadingState />}
        {status === "error" && (
          <ErrorState message={error} onRetry={generate} />
        )}
        {status === "loaded" && plan && (
          <PlanView plan={plan} lang={lang} onRegenerate={generate} />
        )}
      </div>
    </Card>
  );
}
