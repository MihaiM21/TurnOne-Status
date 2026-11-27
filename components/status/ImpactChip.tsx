import type { IncidentImpact } from "@/lib/status/types";
import { IMPACT_META, tint } from "./statusMeta";

export function ImpactChip({ impact, className = "" }: { impact: IncidentImpact; className?: string }) {
  const { label, color } = IMPACT_META[impact];
  return (
    <span
      className={`chip ${className}`}
      style={{ color, background: tint(color, 10), borderColor: tint(color, 35) }}
    >
      {label}
    </span>
  );
}
