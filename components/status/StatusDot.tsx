import type { ComponentStatus } from "@/lib/status/types";
import { STATUS_META, NO_DATA_COLOR } from "./statusMeta";

/**
 * A round status indicator. Always pair with text (StatusLabel) for meaning.
 * `ping` adds the live ring: slow (2.4s) when operational, fast (1.2s) when degraded
 * or worse, none for maintenance and for "no data".
 */
export function StatusDot({
  status,
  size = 8,
  pulse = false,
  ping = false,
  className = "",
}: {
  status: ComponentStatus | null;
  size?: number;
  pulse?: boolean;
  ping?: boolean;
  className?: string;
}) {
  const color = status ? STATUS_META[status].color : NO_DATA_COLOR;
  const ring = ping && status !== null && status !== "maintenance";
  return (
    <span
      aria-hidden="true"
      className={`relative inline-block shrink-0 rounded-full ${pulse ? "live-dot" : ""} ${className}`}
      style={{ width: size, height: size, background: color }}
    >
      {ring && (
        <span
          className={`ping-ring ${status === "operational" ? "" : "ping-fast"}`}
          style={{ background: color }}
        />
      )}
    </span>
  );
}
