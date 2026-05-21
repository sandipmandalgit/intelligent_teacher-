"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { scoreTone, toneStroke, toneText } from "@/lib/result";

interface ScoreRingProps {
  score: number;
  maxMarks: number;
  size?: "lg" | "md";
  /** When true, the ring is tappable and opens a score-override dialog. */
  editable?: boolean;
  /** Called with the new score when a teacher saves an override. */
  onScoreChange?: (newScore: number) => void;
}

const SIZES = {
  lg: {
    diameter: 200,
    stroke: 14,
    scoreClass: "text-3xl",
    pctClass: "text-base",
    separator: " / ",
  },
  md: {
    diameter: 80,
    stroke: 8,
    scoreClass: "text-sm",
    pctClass: "text-[0.625rem]",
    separator: "/",
  },
} as const;

/**
 * A circular SVG progress ring with the score in the centre. The coloured
 * foreground arc animates from empty to full on mount, and re-animates
 * smoothly whenever the score changes (e.g. a teacher override).
 *
 * When `editable` is set, tapping the ring opens a dialog to override the
 * AI's score.
 */
export function ScoreRing({
  score,
  maxMarks,
  size = "lg",
  editable = false,
  onScoreChange,
}: ScoreRingProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState(String(score));

  const { diameter, stroke, scoreClass, pctClass, separator } = SIZES[size];

  const radius = (diameter - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio =
    maxMarks > 0 ? Math.max(0, Math.min(1, score / maxMarks)) : 0;
  const pct = Math.round(ratio * 100);
  const tone = scoreTone(pct);

  const ring = (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: diameter, height: diameter }}
      role="img"
      aria-label={`Scored ${score} out of ${maxMarks}, ${pct} percent`}
    >
      <svg width={diameter} height={diameter} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        {/* Animated coloured progress arc */}
        <motion.circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={toneStroke[tone]}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - ratio) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>

      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-extrabold leading-none tabular-nums",
            scoreClass,
            toneText[tone],
          )}
        >
          {score}
          {separator}
          {maxMarks}
        </span>
        <span
          className={cn(
            "mt-1 font-semibold leading-none tabular-nums opacity-80",
            pctClass,
            toneText[tone],
          )}
        >
          {pct}%
        </span>
      </div>
    </div>
  );

  // Plain display ring — unchanged behaviour.
  if (!editable) return ring;

  function openDialog() {
    setDraft(String(score));
    setDialogOpen(true);
  }

  function handleSave() {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      toast.error("Please enter a valid number.");
      return;
    }
    const clamped = Math.max(0, Math.min(maxMarks, parsed));
    onScoreChange?.(clamped);
    setDialogOpen(false);
    toast(
      "Score overridden. ShikshakSathi will learn from your correction. ✨",
    );
  }

  return (
    <>
      {/* Tappable ring — stops propagation so it doesn't toggle the card. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openDialog();
        }}
        aria-label="Edit score"
        className="group relative inline-flex shrink-0 rounded-full transition-all duration-200 hover:scale-105 hover:ring-2 hover:ring-accent/50 hover:ring-offset-2 hover:ring-offset-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {ring}
        {/* Hover hint */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-0.5 text-[0.625rem] font-semibold text-background opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        >
          ✏️ Edit
        </span>
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Edit Score</DialogTitle>
            <DialogDescription>
              AI suggested {score} / {maxMarks}. Override if you disagree.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="score-override-input">New score</Label>
            <div className="flex items-center gap-2">
              <Input
                id="score-override-input"
                type="number"
                min={0}
                max={maxMarks}
                step={0.5}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-28"
              />
              <span className="text-sm font-medium text-muted-foreground">
                / {maxMarks}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
