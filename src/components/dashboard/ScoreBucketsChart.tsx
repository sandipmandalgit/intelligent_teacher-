"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ScoreBucketsChartProps {
  buckets: { [bucket: string]: number };
}

const BUCKET_ORDER = ["0-20", "21-40", "41-60", "61-80", "81-100"];

// Theme colours — kept in sync with the globals.css design tokens.
const PRIMARY = "hsl(224 64% 33%)";
const GRID = "hsl(215 22% 87%)";
const AXIS = "hsl(220 9% 46%)";

interface BarTooltipEntry {
  value?: number | string;
}

/** Custom tooltip — recharts injects active/payload/label at runtime. */
function BucketTooltip({
  active,
  payload,
  label,
  total,
}: {
  active?: boolean;
  payload?: BarTooltipEntry[];
  label?: string | number;
  total: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const count = Number(payload[0]?.value ?? 0);
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="text-xs font-bold text-foreground">{label} score range</p>
      <p className="text-xs text-muted-foreground">
        {count} {count === 1 ? "session" : "sessions"} · {pct}% of total
      </p>
    </div>
  );
}

/** Bar chart of how sessions are distributed across percentage bands. */
export function ScoreBucketsChart({ buckets }: ScoreBucketsChartProps) {
  const data = BUCKET_ORDER.map((key) => ({
    name: `${key}%`,
    count: buckets?.[key] ?? 0,
  }));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="rounded-2xl border-border/70 p-5 shadow-sm sm:p-6">
      <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
        <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
        Score Distribution
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        How students are scoring across all sessions
      </p>

      <div className="mt-4 h-[260px] w-full">
        {total === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-secondary/40">
            <p className="text-sm text-muted-foreground">No score data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: AXIS }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
              />
              <YAxis
                allowDecimals={false}
                width={32}
                tick={{ fontSize: 11, fill: AXIS }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(224 64% 33% / 0.06)" }}
                content={<BucketTooltip total={total} />}
              />
              <Bar
                dataKey="count"
                fill={PRIMARY}
                radius={[6, 6, 0, 0]}
                maxBarSize={64}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
