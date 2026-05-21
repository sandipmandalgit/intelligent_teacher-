"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card } from "@/components/ui/card";

interface LanguageDistributionChartProps {
  distribution: { bengali: number; hindi: number; english: number };
}

// Theme colours (globals.css stores HSL triplets — wrap them in hsl()).
const TEAL = "hsl(193 72% 21%)"; // --primary
const ORANGE = "hsl(27 87% 58%)"; // --accent, darkened for contrast
const GRAY = "hsl(28 12% 55%)"; // muted neutral
const WHITE = "hsl(0 0% 100%)";

interface SliceDatum {
  name: string;
  value: number;
  color: string;
}

interface PieTooltipEntry {
  name?: string;
  value?: number;
}

/** Custom tooltip — recharts injects active/payload at runtime. */
function LanguageTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: PieTooltipEntry[];
  total: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  const value = Number(entry?.value ?? 0);
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="text-xs font-bold text-foreground">{entry?.name}</p>
      <p className="text-xs text-muted-foreground">
        {value} {value === 1 ? "session" : "sessions"} · {pct}%
      </p>
    </div>
  );
}

/** Donut chart of which feedback language teachers choose. */
export function LanguageDistributionChart({
  distribution,
}: LanguageDistributionChartProps) {
  const data: SliceDatum[] = [
    { name: "Bengali", value: distribution?.bengali ?? 0, color: TEAL },
    { name: "Hindi", value: distribution?.hindi ?? 0, color: ORANGE },
    { name: "English", value: distribution?.english ?? 0, color: GRAY },
  ];
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="rounded-2xl border-border/70 p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-bold text-foreground">
        🌐 Feedback Language Usage
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Which languages teachers prefer for student feedback
      </p>

      <div className="mt-4">
        {total === 0 ? (
          <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-border bg-secondary/40">
            <p className="text-sm text-muted-foreground">
              No language data yet
            </p>
          </div>
        ) : (
          <>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={84}
                    paddingAngle={2}
                  >
                    {data.map((d) => (
                      <Cell
                        key={d.name}
                        fill={d.color}
                        stroke={WHITE}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<LanguageTooltip total={total} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend with count + percentage per language */}
            <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
              {data.map((d) => {
                const pct =
                  total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <li key={d.name} className="flex items-center gap-2 text-xs">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="font-semibold text-foreground">
                      {d.name}
                    </span>
                    <span className="text-muted-foreground">
                      {d.value} · {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
