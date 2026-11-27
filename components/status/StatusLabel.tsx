import type { ComponentStatus } from "@/lib/status/types";
import { StatusDot } from "./StatusDot";
import { STATUS_META } from "./statusMeta";

/** Status dot + text label ("Operational"). */
export function StatusLabel({
  status,
  className = "",
  dotSize = 8,
  ping = false,
}: {
  status: ComponentStatus;
  className?: string;
  dotSize?: number;
  ping?: boolean;
}) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap text-[13px] ${className}`}>
      <StatusDot status={status} size={dotSize} ping={ping} />
      <span style={{ color: status === "operational" ? "var(--fg)" : meta.color }}>{meta.label}</span>
    </span>
  );
}
