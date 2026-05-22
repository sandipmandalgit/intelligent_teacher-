"use client";

import { Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";

interface CommonMistakesPanelProps {
  mistakes: { mistake: string; count: number }[];
}

/**
 * School-wide pattern panel — the recurring misconceptions seen across
 * every archived class. Renders nothing when there's no data.
 */
export function CommonMistakesPanel({ mistakes }: CommonMistakesPanelProps) {
  if (!mistakes || mistakes.length === 0) return null;

  return (
    <Card className="rounded-2xl border-border/70 p-5 shadow-sm sm:p-6">
      <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
        <Lightbulb className="h-4 w-4 text-primary" aria-hidden />
        Top Patterns Across All Classes
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Recurring misconceptions that teachers should address school-wide
      </p>

      <ol className="mt-4 space-y-2.5">
        {mistakes.map((item, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-sm font-bold text-amber-700">
              {i + 1}
            </span>
            <p className="flex-1 text-sm font-semibold text-foreground">
              {item.mistake}
            </p>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-secondary px-2.5 py-1 text-[0.7rem] font-medium text-muted-foreground">
              appeared in {item.count}{" "}
              {item.count === 1 ? "session" : "sessions"}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
