"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "accent" | "neutral";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: Tone;
}

const TONE_STYLES: Record<Tone, { tile: string; icon: string }> = {
  primary: { tile: "bg-primary/10", icon: "text-primary" },
  success: { tile: "bg-success/10", icon: "text-success" },
  accent: { tile: "bg-accent/15", icon: "text-sky-700" },
  neutral: { tile: "bg-muted", icon: "text-muted-foreground" },
};

/** Counts from the previous value to `target` over `durationMs` (ease-out). */
function useCountUp(target: number, durationMs = 1200): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const startTime = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setValue(target);
        fromRef.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

/**
 * A dashboard metric tile — tone-coloured icon, a big count-up number,
 * a label and an optional sublabel. Accepts numeric values or strings
 * with a suffix (e.g. "68%"), animating just the numeric part.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  sublabel,
  tone = "neutral",
}: StatTileProps) {
  const styles = TONE_STYLES[tone];

  const isNumber = typeof value === "number";
  const raw = String(value);
  const numericPart = isNumber
    ? value
    : parseFloat(raw.replace(/[^0-9.]/g, ""));
  const hasNumber = !Number.isNaN(numericPart);
  const suffix = isNumber ? "" : raw.replace(/[0-9.,\s]/g, "");

  const animated = useCountUp(hasNumber ? numericPart : 0);
  const display = hasNumber
    ? `${animated.toLocaleString("en-US")}${suffix}`
    : raw;

  return (
    <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          styles.tile,
        )}
      >
        <Icon className={cn("h-5 w-5", styles.icon)} aria-hidden />
      </span>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mt-3 text-3xl font-extrabold leading-none tabular-nums text-foreground"
      >
        {display}
      </motion.p>
      <p className="mt-1.5 text-sm font-medium text-muted-foreground">
        {label}
      </p>
      {sublabel && (
        <p className="mt-0.5 text-xs text-muted-foreground/70">{sublabel}</p>
      )}
    </Card>
  );
}
