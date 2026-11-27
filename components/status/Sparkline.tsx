"use client";

import { useChangeTick } from "@/hooks/use-change-tick";
import type { LatencyPoint } from "@/lib/status/types";

/**
 * Inline latency sparkline. Muted line, crimson ticks for failed checks,
 * a dot on the latest point. Draws in on load; the dot pulses when a new point arrives.
 */
export function Sparkline({
  points,
  width = 120,
  height = 28,
  label,
  className = "",
}: {
  points: LatencyPoint[];
  width?: number;
  height?: number;
  label?: string;
  className?: string;
}) {
  const n = points.length;
  // a new point arrived: the newest dot pulses once (tick stays 0 on load)
  const tick = useChangeTick(points[n - 1]?.t ?? "");
  const padX = 3;
  const padTop = 4;
  const padBottom = 7; // room for failure ticks
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  const okVals = points.filter((p) => p.ok && p.ms !== null).map((p) => p.ms as number);
  const min = okVals.length ? Math.min(...okVals) : 0;
  const max = okVals.length ? Math.max(...okVals) : 1;
  const span = max - min || 1;

  const x = (i: number) => padX + (n <= 1 ? innerW : (i / (n - 1)) * innerW);
  const y = (ms: number) =>
    max === min ? padTop + innerH / 2 : padTop + innerH - ((ms - min) / span) * innerH;

  // Build path segments, breaking at failed checks.
  let d = "";
  let pen = false;
  points.forEach((p, i) => {
    if (p.ok && p.ms !== null) {
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(p.ms).toFixed(1)}`;
      pen = true;
    } else pen = false;
  });

  const last = points[n - 1];
  const latest = last && last.ok && last.ms !== null ? last.ms : null;
  const aria =
    label ??
    `Latency, last ${n} checks, ${latest === null ? "latest check failed" : `latest ${Math.round(latest)} ms`}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={aria}
      className={`block shrink-0 ${className}`}
    >
      <line
        x1={padX}
        x2={width - padX}
        y1={height - 1.5}
        y2={height - 1.5}
        stroke="var(--border)"
        strokeWidth="1"
      />
      {d && (
        <path
          d={d}
          pathLength={1}
          className="spark-line"
          fill="none"
          stroke="var(--fg)"
          strokeOpacity="0.7"
          strokeWidth="1.25"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {points.map((p, i) =>
        p.ok && p.ms !== null ? null : (
          <rect
            key={i}
            x={x(i) - 0.75}
            y={height - 7}
            width="1.5"
            height="6"
            rx="0.5"
            fill="var(--crimson)"
          />
        ),
      )}
      {last &&
        (latest !== null ? (
          <>
            {tick > 0 && (
              <circle
                key={tick}
                cx={x(n - 1)}
                cy={y(latest)}
                r="2.25"
                fill="none"
                stroke="var(--fg)"
                strokeWidth="1"
                className="spark-ring"
              />
            )}
            <circle cx={x(n - 1)} cy={y(latest)} r="2.25" fill="var(--fg)" />
          </>
        ) : (
          <circle cx={x(n - 1)} cy={height - 4} r="2.25" fill="var(--crimson)" />
        ))}
    </svg>
  );
}
