import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RubricStatus } from "@/lib/result";

interface RubricRowProps {
  criterion: string;
  marksAwarded: number;
  marksPossible: number;
  status: RubricStatus;
  justification: string;
}

const STATUS_CONFIG = {
  YES: {
    Icon: CheckCircle2,
    iconClass: "text-success",
    badgeClass: "bg-success/10 text-success",
  },
  PARTIAL: {
    Icon: MinusCircle,
    iconClass: "text-amber-500",
    badgeClass: "bg-amber-500/15 text-amber-700",
  },
  NO: {
    Icon: XCircle,
    iconClass: "text-destructive",
    badgeClass: "bg-destructive/10 text-destructive",
  },
} as const;

/** A single rubric-criterion row: status icon, criterion + justification, marks. */
export function RubricRow({
  criterion,
  marksAwarded,
  marksPossible,
  status,
  justification,
}: RubricRowProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.NO;
  const { Icon } = config;

  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
      <Icon
        className={cn("mt-0.5 h-5 w-5 shrink-0", config.iconClass)}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{criterion}</p>
        {justification && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {justification}
          </p>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums",
          config.badgeClass,
        )}
      >
        {marksAwarded} / {marksPossible}
      </span>
    </div>
  );
}
