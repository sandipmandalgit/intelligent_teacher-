"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { scoreTone, toneText } from "@/lib/result";

interface SessionRow {
  _id: string;
  created_at: string;
  subject: string;
  total_score: number;
  total_max_marks: number;
  percentage: number;
  feedback_language: string;
}

interface RecentSessionsTableProps {
  sessions: SessionRow[];
}

const LANG_LABEL: Record<string, string> = {
  bengali: "Bengali",
  hindi: "Hindi",
  english: "English",
};
const LANG_BADGE: Record<string, string> = {
  bengali: "bg-primary/10 text-primary",
  hindi: "bg-accent/25 text-amber-700",
  english: "bg-muted text-muted-foreground",
};

function langKey(lang: string): string {
  const key = (lang ?? "").trim().toLowerCase();
  return key in LANG_LABEL ? key : "english";
}

/** Formats an ISO date as "21 May, 2:34 PM". */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const month = d.toLocaleString("en-US", { month: "short" });
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  const hours = d.getHours() % 12 || 12;
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${d.getDate()} ${month}, ${hours}:${minutes} ${ampm}`;
}

/**
 * The most recent grading sessions across the school — a table on
 * desktop, stacked cards on mobile, with a friendly empty state.
 */
export function RecentSessionsTable({ sessions }: RecentSessionsTableProps) {
  return (
    <Card className="rounded-2xl border-border/70 p-5 shadow-sm sm:p-6">
      <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
        <ClipboardList className="h-4 w-4 text-primary" aria-hidden />
        Recent Grading Sessions
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Last 10 sessions from your school
      </p>

      {sessions.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">
            No sessions yet — grade your first paper to see it here
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link href="/grade">Grade a paper</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">#</th>
                  <th className="py-2 pr-3 font-semibold">Subject</th>
                  <th className="py-2 pr-3 font-semibold">Score</th>
                  <th className="py-2 pr-3 font-semibold">%</th>
                  <th className="py-2 pr-3 font-semibold">Language</th>
                  <th className="py-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => {
                  const key = langKey(s.feedback_language);
                  const tone = scoreTone(s.percentage);
                  return (
                    <tr
                      key={s._id}
                      className="border-b border-border/60 last:border-b-0"
                    >
                      <td className="py-3 pr-3 text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="py-3 pr-3 font-medium text-foreground">
                        {s.subject}
                      </td>
                      <td className="py-3 pr-3 tabular-nums text-foreground">
                        {s.total_score}/{s.total_max_marks}
                      </td>
                      <td
                        className={cn(
                          "py-3 pr-3 font-bold tabular-nums",
                          toneText[tone],
                        )}
                      >
                        {Math.round(s.percentage)}%
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            LANG_BADGE[key],
                          )}
                        >
                          {LANG_LABEL[key]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-3 text-muted-foreground">
                        {formatDate(s.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="mt-4 space-y-3 md:hidden">
            {sessions.map((s, i) => {
              const key = langKey(s.feedback_language);
              const tone = scoreTone(s.percentage);
              return (
                <div
                  key={s._id}
                  className="rounded-xl border border-border/70 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      #{i + 1} · {s.subject}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        toneText[tone],
                      )}
                    >
                      {Math.round(s.percentage)}%
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      Score {s.total_score}/{s.total_max_marks}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-semibold",
                        LANG_BADGE[key],
                      )}
                    >
                      {LANG_LABEL[key]}
                    </span>
                    <span>{formatDate(s.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
