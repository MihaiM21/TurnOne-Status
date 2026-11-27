"use client";

import { useRef, useState } from "react";
import type { UptimeDay } from "@/lib/status/types";
import { formatDay, formatDuration } from "./format";
import { STATUS_META, statusColor } from "./statusMeta";

function dayLabel(d: UptimeDay): string {
  if (d.uptimePct === null) return `${formatDay(d.date)}: no data`;
  const parts = [
    formatDay(d.date),
    `${d.uptimePct.toFixed(3)}% uptime`,
    d.downtimeSeconds > 0 ? `Down ${formatDuration(d.downtimeSeconds)}` : "No downtime",
  ];
  if (d.incidentIds.length > 0) {
    parts.push(`${d.incidentIds.length} incident${d.incidentIds.length > 1 ? "s" : ""}`);
  }
  return parts.join(", ");
}

/**
 * 90 thin bars coloured by worst status. Roving tabindex: one tab stop, arrow
 * keys move between days. Hover or focus shows a tooltip; Escape closes it.
 * `mobileCount` limits how many of the latest bars are shown below 768px.
 */
export function UptimeStrip({
  days,
  size = "sm",
  mobileCount,
  label = "Uptime, last 90 days",
}: {
  days: UptimeDay[];
  size?: "sm" | "lg";
  mobileCount?: number;
  label?: string;
}) {
  const [shown, setShown] = useState<number | null>(null);
  const [active, setActive] = useState(days.length - 1);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const n = days.length;
  const hiddenBelow = mobileCount ? n - mobileCount : 0;

  const move = (to: number) => {
    const next = Math.min(n - 1, Math.max(0, to));
    setActive(next);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const go = (to: number) => {
      e.preventDefault();
      move(to);
    };
    if (e.key === "Escape") setShown(null);
    else if (e.key === "ArrowLeft") go(i - 1);
    else if (e.key === "ArrowRight") go(i + 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(n - 1);
  };

  const barH = size === "lg" ? "h-11" : "h-[22px]";

  return (
    <div
      role="group"
      aria-label={label}
      className="relative z-10 flex w-full gap-px focus-within:z-30 hover:z-30"
      onMouseLeave={() => setShown(null)}
    >
      {days.map((d, i) => {
        const align =
          i < 12
            ? "left-0"
            : i >= n - 12
              ? "right-0"
              : i >= hiddenBelow && i < hiddenBelow + 12 && hiddenBelow > 0
                ? "left-1/2 -translate-x-1/2 max-md:left-0 max-md:translate-x-0"
                : "left-1/2 -translate-x-1/2";
        const hideOnMobile = i < hiddenBelow ? "max-md:hidden" : "";
        return (
          <span key={d.date} className={`relative min-w-0 flex-1 ${hideOnMobile}`}>
            <span
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="img"
              tabIndex={i === active ? 0 : -1}
              aria-label={dayLabel(d)}
              onMouseEnter={() => setShown(i)}
              onFocus={() => {
                setActive(i);
                setShown(i);
              }}
              onBlur={() => setShown((s) => (s === i ? null : s))}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`bar-grow relative block w-full rounded-[1px] ${barH} ${
                shown === i ? "opacity-100" : "opacity-85"
              } t-fast`}
              style={{
                background: d.worst ? STATUS_META[d.worst].color : "var(--border)",
                "--i": i,
              } as React.CSSProperties}
            >
              {i === n - 1 && (
                <span
                  aria-hidden="true"
                  className="bar-cursor absolute inset-x-0 top-0 h-[3px] rounded-[1px] bg-white"
                />
              )}
            </span>
            {shown === i && (
              <span
                role="tooltip"
                aria-hidden="true"
                className={`pop-in pointer-events-none absolute bottom-full z-40 mb-2 w-max max-w-[220px] rounded-md border border-line bg-elevated px-2.5 py-2 text-left shadow-[0_4px_16px_rgba(0,0,0,0.6)] ${align}`}
              >
                <span className="num block text-[12px] text-fg">{formatDay(d.date)}</span>
                {d.uptimePct === null ? (
                  <span className="num block text-[12px] text-muted">No data</span>
                ) : (
                  <>
                    <span className="num block text-[12px]" style={{ color: statusColor(d.worst) }}>
                      {d.uptimePct.toFixed(3)}%
                    </span>
                    <span className="num block text-[12px] text-muted">
                      {d.downtimeSeconds > 0 ? `Down ${formatDuration(d.downtimeSeconds)}` : "No downtime"}
                    </span>
                    {d.incidentIds.length > 0 && (
                      <span className="num block text-[12px] text-muted">
                        {d.incidentIds.length} incident{d.incidentIds.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </>
                )}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
