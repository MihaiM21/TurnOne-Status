"use client";

import { useNow } from "@/hooks/use-now";

const pad = (n: number) => String(n).padStart(2, "0");

/** Live UTC clock, HH:MM:SS UTC. */
export function UtcClock({ className = "" }: { className?: string }) {
  const now = useNow();
  let text = "--:--:--";
  if (now !== null) {
    const d = new Date(now);
    text = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  }
  return (
    <span className={`num text-[13px] text-muted ${className}`} aria-label="Current time, UTC">
      {text} <span className="text-[11px] tracking-[0.1em]">UTC</span>
    </span>
  );
}
