"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Brain,
  FileText,
  Globe,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StatTile } from "@/components/dashboard/StatTile";
import { ScoreBucketsChart } from "@/components/dashboard/ScoreBucketsChart";
import { LanguageDistributionChart } from "@/components/dashboard/LanguageDistributionChart";
import { RecentSessionsTable } from "@/components/dashboard/RecentSessionsTable";
import { CommonMistakesPanel } from "@/components/dashboard/CommonMistakesPanel";

interface RecentSession {
  _id: string;
  created_at: string;
  subject: string;
  total_score: number;
  total_max_marks: number;
  percentage: number;
  feedback_language: string;
}

interface DashboardStats {
  total_samples: number;
  total_pages_archived: number;
  total_subjects: number;
  last_updated: string;
  avg_percentage: number;
  language_distribution: { bengali: number; hindi: number; english: number };
  score_buckets: Record<string, number>;
  top_common_mistakes: { mistake: string; count: number }[];
  recent_sessions: RecentSession[];
}

// Mirrors the API's fallback — honest zeros, never fake data.
const FALLBACK_STATS: DashboardStats = {
  total_samples: 0,
  total_pages_archived: 0,
  total_subjects: 0,
  last_updated: new Date().toISOString(),
  avg_percentage: 0,
  language_distribution: { bengali: 0, hindi: 0, english: 0 },
  score_buckets: {
    "0-20": 0,
    "21-40": 0,
    "41-60": 0,
    "61-80": 0,
    "81-100": 0,
  },
  top_common_mistakes: [],
  recent_sessions: [],
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Staggered fade-and-slide entrance wrapper. */
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

/** "2 minutes ago"-style relative time — no date-fns dependency needed. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "just now";
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 45) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-2xl bg-foreground/10", className)} />
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (!res.ok) throw new Error(`stats request failed: ${res.status}`);
      const data = (await res.json()) as DashboardStats;
      setStats(data);
    } catch {
      // Graceful degradation — keep prior data, or fall back to baseline.
      setStats((prev) => prev ?? FALLBACK_STATS);
    }
  }, []);

  // Initial fetch + auto-refresh every 30 seconds.
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }

  const loading = stats === null;
  const data = stats ?? FALLBACK_STATS;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:py-12">
      {/* Hero strip */}
      <Reveal
        delay={0.1}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            <BarChart3 className="h-6 w-6 text-primary" aria-hidden />
            Class Performance Dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Real-time analytics from ShikshakSathi&apos;s archive — every
            grading session contributes
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="shrink-0"
        >
          <RefreshCw className={cn(refreshing && "animate-spin")} />
          Refresh data
        </Button>
      </Reveal>

      {/* 4-tile stat row */}
      <Reveal delay={0.2}>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonBlock key={i} className="h-[148px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              icon={BookOpen}
              label="Total Sessions"
              value={data.total_samples}
              sublabel="All-time grading sessions"
              tone="primary"
            />
            <StatTile
              icon={FileText}
              label="Pages Archived"
              value={data.total_pages_archived}
              sublabel="Anonymous handwriting samples"
              tone="accent"
            />
            <StatTile
              icon={TrendingUp}
              label="Avg. Score"
              value={`${data.avg_percentage}%`}
              sublabel="Across all sessions"
              tone="success"
            />
            <StatTile
              icon={Globe}
              label="Subjects"
              value={data.total_subjects}
              sublabel="Different courses graded"
              tone="neutral"
            />
          </div>
        )}
      </Reveal>

      {/* 2-column charts */}
      <Reveal delay={0.35}>
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <SkeletonBlock className="h-[372px]" />
            <SkeletonBlock className="h-[372px]" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <ScoreBucketsChart buckets={data.score_buckets} />
            <LanguageDistributionChart
              distribution={data.language_distribution}
            />
          </div>
        )}
      </Reveal>

      {/* Recent sessions */}
      <Reveal delay={0.5}>
        {loading ? (
          <SkeletonBlock className="h-[280px]" />
        ) : (
          <RecentSessionsTable sessions={data.recent_sessions} />
        )}
      </Reveal>

      {/* Common mistakes */}
      <Reveal delay={0.65}>
        {loading ? (
          <SkeletonBlock className="h-[260px]" />
        ) : (
          <CommonMistakesPanel mistakes={data.top_common_mistakes} />
        )}
      </Reveal>

      {/* Footer info strip */}
      <Reveal delay={0.75}>
        <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Brain className="h-3.5 w-3.5" aria-hidden />
          Data live from MongoDB Atlas · Updated{" "}
          {relativeTime(data.last_updated)} · No PII stored
        </p>
      </Reveal>
    </main>
  );
}
