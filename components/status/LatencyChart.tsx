"use client";

import { useState } from "react";
import type { LatencyPoint } from "@/lib/status/types";
import { formatHM } from "./format";

const W = 760;
const H = 240;
const M = { l: 52, r: 16, t: 16, b: 34 };

function niceMax(v: number): number {
  if (v <= 0) return 100;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 3 ? 3 : f <= 5 ? 5 : 10;
  return nice * pow;
}

const MONO = "var(--font-geist-mono), ui-monospace, monospace";

/** Hand-written SVG latency chart: series, p50 reference, failure ticks, hover readout. */
export function LatencyChart({ points }: { points: LatencyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = points.length;
  const ok = points.filter((p) => p.ok && p.ms !== null).map((p) => p.ms as number);
  const max = niceMax(ok.length ? Math.max(...ok) * 1.1 : 100);
  const sorted = [...ok].sort((a, b) => a - b);
  const p50 = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null;

  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const x = (i: number) => M.l + (n <= 1 ? 0 : (i / (n - 1)) * iw);
  const y = (ms: number) => M.t + ih - (ms / max) * ih;

  let d = "";
  let pen = false;
  points.forEach((p, i) => {
    if (p.ok && p.ms !== null) {
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(p.ms).toFixed(1)}`;
      pen = true;
    } else pen = false;
  });

  const grid = [0, 1, 2, 3].map((k) => (max / 3) * k);
  // Dedupe: with few points (fresh boot) several fractions round to the same index.
  const xTicks = n > 1 ? [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (n - 1))))] : [];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (n < 2) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - M.l) / iw) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const hp = hover !== null ? points[hover] : null;
  const readout = hp
    ? `${formatHM(hp.t)} UTC  ${hp.ok && hp.ms !== null ? `${Math.round(hp.ms)} ms` : "failed"}`
    : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Latency, last ${n} checks${p50 !== null ? `, median ${Math.round(p50)} ms` : ""}`}
      className="block h-auto w-full touch-pan-y select-none"
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
    >
      {grid.map((g, k) => (
        <g key={k}>
          <line x1={M.l} x2={W - M.r} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeWidth="1" />
          <text
            x={M.l - 8}
            y={y(g) + 3.5}
            textAnchor="end"
            fontSize="11"
            fill="var(--muted)"
            style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}
          >
            {Math.round(g)}
          </text>
        </g>
      ))}
      <text
        x={M.l - 8}
        y={M.t - 5}
        textAnchor="end"
        fontSize="10"
        fill="var(--muted)"
        style={{ fontFamily: MONO, letterSpacing: "0.1em" }}
      >
        MS
      </text>

      {xTicks.map((i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 12}
          textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
          fontSize="11"
          fill="var(--muted)"
          style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}
        >
          {formatHM(points[i].t)}
        </text>
      ))}

      {p50 !== null && (
        <g>
          <line
            x1={M.l}
            x2={W - M.r}
            y1={y(p50)}
            y2={y(p50)}
            stroke="var(--fg)"
            strokeOpacity="0.28"
            strokeDasharray="3 4"
          />
          <text
            x={W - M.r - 4}
            y={y(p50) - 5}
            textAnchor="end"
            fontSize="10"
            fill="var(--muted)"
            style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums", letterSpacing: "0.06em" }}
          >
            P50 {Math.round(p50)} MS
          </text>
        </g>
      )}

      {d && (
        <path
          d={d}
          fill="none"
          stroke="var(--fg)"
          strokeOpacity="0.85"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {points.map((p, i) =>
        p.ok && p.ms !== null ? null : (
          <g key={i}>
            <line
              x1={x(i)}
              x2={x(i)}
              y1={M.t}
              y2={M.t + ih}
              stroke="var(--crimson)"
              strokeOpacity="0.18"
            />
            <rect x={x(i) - 1.25} y={M.t + ih - 12} width="2.5" height="12" rx="1" fill="var(--crimson)" />
          </g>
        ),
      )}

      {hp && hover !== null && (
        <g pointerEvents="none">
          <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={M.t + ih} stroke="var(--fg)" strokeOpacity="0.3" />
          {hp.ok && hp.ms !== null && <circle cx={x(hover)} cy={y(hp.ms)} r="3.5" fill="var(--fg)" />}
          <text
            x={x(hover) > W / 2 ? x(hover) - 8 : x(hover) + 8}
            y={M.t + 10}
            textAnchor={x(hover) > W / 2 ? "end" : "start"}
            fontSize="11"
            fill="var(--fg)"
            style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums", whiteSpace: "pre" }}
          >
            {readout}
          </text>
        </g>
      )}
    </svg>
  );
}
