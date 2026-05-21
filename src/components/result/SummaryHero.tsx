"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  CircleSlash,
  Eye,
  EyeOff,
  TriangleAlert,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { type StudentSummary } from "@/lib/result";
import { ScoreRing } from "./ScoreRing";

interface SummaryHeroProps {
  subject: string;
  summary: StudentSummary;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Picks an encouraging headline based on the overall percentage. */
function headline(percentage: number): string {
  if (percentage >= 70) return "Excellent work!";
  if (percentage >= 40) return "Good effort — keep improving.";
  return "Needs significant review.";
}

/**
 * The hero banner at the top of the Result page: a deep-teal gradient card
 * with the total-score ring on the left and a headline plus stat tiles on
 * the right.
 */
export function SummaryHero({ subject, summary }: SummaryHeroProps) {
  const pct = Math.round(summary.percentage);

  // Readability indicator — colours brightened for the teal hero.
  const readability = {
    HIGH: {
      Icon: Eye,
      iconClass: "h-3.5 w-3.5 text-emerald-300",
      label: "✓ Handwriting was clear",
    },
    MEDIUM: {
      Icon: EyeOff,
      iconClass: "h-3.5 w-3.5 text-amber-300",
      label: "⚠ Some pages were hard to read — review carefully",
    },
    LOW: {
      Icon: TriangleAlert,
      iconClass: "h-3.5 w-3.5 text-red-300",
      label: "⚠ Poor image quality — grading accuracy reduced",
    },
  }[summary.overall_readability];

  const tiles = [
    {
      icon: CheckCircle2,
      label: "Attempted",
      value: String(summary.questions_attempted),
    },
    {
      icon: CircleSlash,
      label: "Skipped",
      value: String(summary.questions_unattempted),
    },
    {
      icon: Eye,
      label: "Readability",
      value: summary.overall_readability,
    },
    {
      icon: BookOpen,
      label: "Subject",
      value: subject,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-primary to-primary/90 p-8 text-primary-foreground shadow-2xl shadow-primary/30 md:p-10">
        {/* Soft decorative glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-success/25 blur-3xl"
        />

        <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-10">
          {/* Total-score ring */}
          <div className="flex justify-center">
            <ScoreRing
              score={summary.total_score}
              maxMarks={summary.total_max_marks}
              size="lg"
            />
          </div>

          {/* Headline + stats */}
          <div className="text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
              {subject}
            </p>
            <h2 className="mt-2 text-balance text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl">
              {headline(pct)}
            </h2>
            <p className="mt-2 text-sm text-primary-foreground/75">
              Scored {summary.total_score} of {summary.total_max_marks} marks ·{" "}
              {pct}% overall
            </p>

            {/* Readability indicator pill */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="mt-3"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-sm">
                <readability.Icon
                  className={readability.iconClass}
                  aria-hidden
                />
                {readability.label}
              </span>
            </motion.div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {tiles.map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-xl bg-primary-foreground/10 p-3 text-left ring-1 ring-inset ring-primary-foreground/10"
                >
                  <tile.icon
                    className="h-4 w-4 text-primary-foreground/60"
                    aria-hidden
                  />
                  <p className="mt-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-primary-foreground/60">
                    {tile.label}
                  </p>
                  <p
                    className="truncate text-sm font-bold text-primary-foreground"
                    title={tile.value}
                  >
                    {tile.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
