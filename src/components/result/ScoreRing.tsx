"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { scoreTone, toneStroke, toneText } from "@/lib/result";

interface ScoreRingProps {
  score: number;
  maxMarks: number;
  size?: "lg" | "md";
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
 * foreground arc animates from empty to full on mount.
 */
export function ScoreRing({ score, maxMarks, size = "lg" }: ScoreRingProps) {
  const { diameter, stroke, scoreClass, pctClass, separator } = SIZES[size];

  const radius = (diameter - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio =
    maxMarks > 0 ? Math.max(0, Math.min(1, score / maxMarks)) : 0;
  const pct = Math.round(ratio * 100);
  const tone = scoreTone(pct);

  return (
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
}
