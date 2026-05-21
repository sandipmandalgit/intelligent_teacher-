import { Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";

interface CommonMistakesProps {
  mistakes: string[];
}

/**
 * Class-level insights — the recurring mistakes seen across the answer
 * sheet, shown as numbered cards. Renders nothing when there are none.
 */
export function CommonMistakes({ mistakes }: CommonMistakesProps) {
  const items = mistakes.filter((m) => m && m.trim()).slice(0, 3);
  if (items.length === 0) return null;

  return (
    <Card className="rounded-2xl border-border/70 p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground">
          <Lightbulb className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-bold text-foreground">
            Class-Level Insights
          </h3>
          <p className="text-xs text-muted-foreground">
            Patterns worth addressing with the whole class
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((mistake, i) => (
          <div
            key={i}
            className="rounded-xl border border-accent/30 bg-accent/10 p-4"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
              {i + 1}
            </span>
            <p className="mt-2.5 text-sm leading-relaxed text-foreground">
              {mistake}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
