"use client";

import { useNow } from "@/hooks/use-now";
import { formatClock, formatDuration } from "./format";

/**
 * Ticking countdown to `to`. "clock" renders 6d 04:12:09, "compact" renders
 * "in 14m". Before mount it renders a same-width placeholder (no mismatch).
 */
export function Countdown({
  to,
  variant = "clock",
  className = "",
}: {
  to: string;
  variant?: "clock" | "compact";
  className?: string;
}) {
  const now = useNow();
  let text: string;
  if (now === null) text = variant === "clock" ? "--:--:--" : "…";
  else {
    const ms = new Date(to).getTime() - now;
    text = variant === "clock" ? formatClock(ms) : formatDuration(Math.max(0, ms / 1000));
  }
  return <span className={`num ${className}`}>{text}</span>;
}
