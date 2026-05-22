"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Lock } from "lucide-react";

interface ArchiveStats {
  total_samples: number;
  total_pages_archived: number;
  total_subjects: number;
  last_updated: string;
}

// Shown if /api/stats can't be reached — honest zeros, never fake data.
const FALLBACK_STATS: ArchiveStats = {
  total_samples: 0,
  total_pages_archived: 0,
  total_subjects: 0,
  last_updated: new Date().toISOString(),
};

/** Counts up from 0 to `target` over `durationMs` once `start` is true. */
function useCountUp(target: number, start: boolean, durationMs = 1500): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) {
      setValue(0);
      return;
    }
    let raf = 0;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, durationMs]);

  return value;
}

function StatTile({
  value,
  label,
  loading,
  start,
}: {
  value: number;
  label: string;
  loading: boolean;
  start: boolean;
}) {
  const count = useCountUp(value, start);
  return (
    <div className="text-center sm:text-left">
      {loading ? (
        <div className="mx-auto h-8 w-16 animate-pulse rounded-md bg-foreground/10 sm:mx-0" />
      ) : (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="block text-2xl font-extrabold leading-none text-primary tabular-nums sm:text-3xl"
        >
          {count.toLocaleString("en-US")}
        </motion.span>
      )}
      <span className="mt-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/**
 * Homepage "Training Dataset" counter — a compact card that shows how
 * much anonymous handwriting data the archive has gathered, with the
 * numbers animating up on load.
 */
export function TrainingArchiveStats() {
  const [stats, setStats] = useState<ArchiveStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((res) => {
        if (!res.ok) throw new Error(`stats request failed: ${res.status}`);
        return res.json();
      })
      .then((data: ArchiveStats) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        // Graceful degradation — fall back to honest zeros.
        if (!cancelled) setStats(FALLBACK_STATS);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = stats === null;
  const data = stats ?? FALLBACK_STATS;

  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-secondary to-accent/10 p-5 shadow-sm sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <h3 className="text-sm font-bold text-foreground sm:text-base">
          Building India&apos;s largest classroom AI dataset
        </h3>
      </div>

      {/* Stat tiles — or an inviting empty state when there's no data yet */}
      {!loading && data.total_samples === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            Be the first to contribute to ShikshakSathi&apos;s training
            dataset.
          </span>{" "}
          Every graded paper adds anonymized handwriting samples to improve
          AI for Indian classrooms.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:gap-6">
          <StatTile
            value={data.total_samples}
            label="Handwriting samples"
            loading={loading}
            start={!loading}
          />
          <StatTile
            value={data.total_pages_archived}
            label="Pages archived"
            loading={loading}
            start={!loading}
          />
          <StatTile
            value={data.total_subjects}
            label="Subjects covered"
            loading={loading}
            start={!loading}
          />
        </div>
      )}

      {/* Tagline + privacy badge */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
        <p className="text-xs text-muted-foreground">
          Every grading session contributes anonymously
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-card/70 px-2.5 py-1 text-[0.65rem] font-medium text-muted-foreground ring-1 ring-inset ring-border/60">
          <Lock className="h-3 w-3" />
          Anonymous · No PII · Used for OCR research
        </span>
      </div>
    </div>
  );
}
