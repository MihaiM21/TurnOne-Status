import type { ComponentStatus } from "@/lib/status/types";
import { STATUS_META, tint } from "./statusMeta";

/** Chip with icon + label, tinted in the status colour. */
export function StatusPill({
  status,
  className = "",
}: {
  status: ComponentStatus;
  className?: string;
}) {
  const { Icon, label, color } = STATUS_META[status];
  return (
    <span
      className={`chip ${className}`}
      style={{ color, background: tint(color, 10), borderColor: tint(color, 35) }}
    >
      <Icon size={12} aria-hidden="true" strokeWidth={2.25} />
      {label}
    </span>
  );
}
