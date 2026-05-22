"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookMarked,
  CheckCircle2,
  ChevronDown,
  CircleSlash,
  ClipboardCheck,
  Eye,
  EyeOff,
  type LucideIcon,
  MessageSquare,
  MinusCircle,
  PenLine,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  type GradedQuestion,
  languageMeta,
  persistScoreOverride,
  scoreTone,
} from "@/lib/result";
import { ScoreRing } from "./ScoreRing";
import { RubricRow } from "./RubricRow";

interface QuestionCardProps {
  question: GradedQuestion;
  /** Whether the card starts expanded (used for the first question). */
  defaultExpanded?: boolean;
  /** Called when a teacher overrides this question's score. */
  onEdit?: (questionNumber: number, newScore: number) => void;
  /** When true, the score ring is not editable (e.g. the student portal). */
  readOnly?: boolean;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const QBADGE_TONE = {
  success: "bg-success/15 text-success",
  amber: "bg-amber-500/15 text-amber-700",
  destructive: "bg-destructive/15 text-destructive",
} as const;

/** Small uppercase section heading with a leading icon. */
function SectionTitle({
  icon: Icon,
  className,
  children,
}: {
  icon: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <h4
      className={cn(
        "flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {children}
    </h4>
  );
}

/**
 * An expandable card for a single graded question. The header (number,
 * question text, score ring) is always visible; clicking it reveals the
 * full breakdown. The score ring is tappable — teachers can override the
 * AI's score, which is persisted to localStorage. Unattempted questions
 * render as a flat, muted row.
 */
export function QuestionCard({
  question,
  defaultExpanded = false,
  onEdit,
  readOnly = false,
}: QuestionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [overrideScore, setOverrideScore] = useState<number | null>(null);

  const {
    question_number,
    question_text,
    max_marks,
    attempted,
    extracted_answer,
    score,
    rubric_evaluation,
    strengths,
    mistakes,
    feedback_english,
    feedback_translated,
    feedback_language,
    source_pages,
    readability_confidence,
  } = question;

  // --- Unattempted: a flat, non-expandable row ---------------------------
  if (!attempted) {
    return (
      <Card className="flex items-center gap-3 rounded-2xl border-border/70 bg-muted/40 p-4 shadow-none sm:gap-4 sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-bold text-muted-foreground">
          Q{question_number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            Question {question_number} · {max_marks} marks
          </p>
          <p className="line-clamp-1 text-sm font-semibold text-muted-foreground md:line-clamp-2">
            {question_text}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="shrink-0 gap-1.5 text-muted-foreground"
        >
          <CircleSlash className="h-3.5 w-3.5" />
          Not attempted
        </Badge>
      </Card>
    );
  }

  const isOverridden = overrideScore !== null;
  const displayedScore = overrideScore ?? score;
  const tone = scoreTone(
    max_marks > 0 ? (displayedScore / max_marks) * 100 : 0,
  );
  const lang = languageMeta(feedback_language);
  const pagesLabel =
    source_pages.length === 0
      ? null
      : source_pages.length === 1
        ? `Page ${source_pages[0]}`
        : `Spans pages ${source_pages.join(", ")}`;

  function handleScoreChange(newScore: number) {
    setOverrideScore(newScore);
    persistScoreOverride(question_number, newScore);
    onEdit?.(question_number, newScore);
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm transition-shadow hover:shadow-md">
      {/* Header — always visible, toggles the body */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className="flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/40 sm:gap-4 sm:p-5"
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold",
            QBADGE_TONE[tone],
          )}
        >
          Q{question_number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Question {question_number} · {max_marks} marks
            </span>
            {isOverridden && (
              <Badge
                variant="outline"
                className="h-5 border-accent px-1.5 text-[0.625rem] text-accent"
              >
                Teacher edited
              </Badge>
            )}
          </div>
          <p className="line-clamp-1 text-sm font-semibold text-foreground sm:text-base md:line-clamp-2">
            {question_text}
          </p>
        </div>
        <ScoreRing
          score={displayedScore}
          maxMarks={max_marks}
          size="md"
          editable={!readOnly}
          onScoreChange={handleScoreChange}
        />
        {readability_confidence === "MEDIUM" && (
          <span
            className="mr-1 inline-flex shrink-0"
            title="This page was somewhat hard to read"
          >
            <Eye className="h-4 w-4 text-amber-500" aria-hidden />
          </span>
        )}
        {readability_confidence === "LOW" && (
          <span
            className="mr-1 inline-flex shrink-0"
            title="This page was very hard to read — verify the score carefully"
          >
            <EyeOff className="h-4 w-4 text-destructive" aria-hidden />
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </div>

      {/* Body — animated height reveal */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-5 px-4 pb-5 sm:px-5 sm:pb-6">
              <Separator />

              {/* What the student wrote */}
              <section className="space-y-2">
                <SectionTitle icon={PenLine}>
                  What the student wrote
                </SectionTitle>
                <div className="rounded-xl bg-secondary/60 p-4">
                  {extracted_answer.trim() ? (
                    <p className="whitespace-pre-wrap font-serif text-sm italic leading-relaxed text-foreground/90">
                      {extracted_answer}
                    </p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      No answer text could be extracted.
                    </p>
                  )}
                  {pagesLabel && (
                    <Badge
                      variant="secondary"
                      className="mt-3 gap-1.5 border border-border/60 font-medium"
                    >
                      <BookMarked className="h-3.5 w-3.5" />
                      {pagesLabel}
                    </Badge>
                  )}
                </div>
              </section>

              {/* Rubric evaluation */}
              {rubric_evaluation.length > 0 && (
                <section className="space-y-2">
                  <SectionTitle icon={ClipboardCheck}>
                    Rubric Evaluation
                  </SectionTitle>
                  <div className="rounded-xl border border-border/70 px-4">
                    {rubric_evaluation.map((row, i) => (
                      <RubricRow
                        key={i}
                        criterion={row.criterion}
                        marksAwarded={row.marks_awarded}
                        marksPossible={row.marks_possible}
                        status={row.status}
                        justification={row.justification}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Strengths */}
              {strengths.length > 0 && (
                <section className="space-y-2">
                  <SectionTitle icon={ThumbsUp} className="text-success">
                    What you got right
                  </SectionTitle>
                  <ul className="space-y-1.5">
                    {strengths.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-success"
                          aria-hidden
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Mistakes */}
              {mistakes.length > 0 && (
                <section className="space-y-2">
                  <SectionTitle icon={TriangleAlert} className="text-amber-600">
                    What needs improvement
                  </SectionTitle>
                  <ul className="space-y-1.5">
                    {mistakes.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <MinusCircle
                          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                          aria-hidden
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Feedback — English + translated, side by side */}
              <section className="space-y-2">
                <SectionTitle icon={MessageSquare}>Feedback</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-background/60 p-4">
                    <h5 className="mb-2 text-sm font-bold text-foreground">
                      In English
                    </h5>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {feedback_english}
                    </p>
                  </div>
                  <div className="rounded-xl border border-primary/15 bg-primary/[0.06] p-4">
                    <h5
                      className={cn(
                        "mb-2 text-sm font-bold text-foreground",
                        lang.scriptClass,
                      )}
                    >
                      {lang.label}
                    </h5>
                    <p
                      className={cn(
                        "text-sm leading-relaxed text-muted-foreground",
                        lang.scriptClass,
                      )}
                    >
                      {feedback_translated}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
