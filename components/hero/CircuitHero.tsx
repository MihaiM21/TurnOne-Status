"use client";

import { useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useChangeTick } from "@/hooks/use-change-tick";
import type { ComponentStatus, GroupSummary, StatusSummary } from "@/lib/status/types";
import { RelativeTime } from "../status/RelativeTime";
import { STATUS_META, tint } from "../status/statusMeta";
import {
  BOUNDARIES,
  CIRCUIT_PATH,
  FLAGS,
  FLAG_FORMATION,
  SECTOR_GROUPS,
  SECTOR_LABELS,
  SECTOR_SPEED,
  SECTOR_WAITING_COLOR,
  SF_FRAC,
} from "./circuitGeometry";
import { TRAIL_LENGTHS, shouldPlayIntro, useCircuit, useParallax } from "./useCircuit";

/* ---------- lap seed: minutes since UTC midnight, fixed at first client read ---------- */
let lapSeed: number | null = null;
const subscribeNoop = () => () => {};
const getLapSeed = () => {
  if (lapSeed === null) {
    const d = new Date();
    lapSeed = d.getUTCHours() * 60 + d.getUTCMinutes();
  }
  return lapSeed;
};
const getServerLapSeed = () => null;

/* ---------- per-sector view model ---------- */
interface Sector {
  index: number;
  id: string;
  name: string;
  status: ComponentStatus;
  waiting: boolean;
  color: string;
  value: string;
  alarm: boolean;
}

function sectorValue(group: GroupSummary | undefined, waiting: boolean): string {
  if (!group || waiting) return "NO DATA";
  const pool = group.components.filter((c) => !c.beta);
  const comps = pool.length > 0 ? pool : group.components;
  const n = comps.length;
  switch (group.status) {
    case "operational": {
      const ok = comps.filter((c) => c.status === "operational").length;
      return `${ok}/${n} OK`;
    }
    case "maintenance":
      return `${comps.filter((c) => c.status === "maintenance").length} MAINT`;
    case "degraded":
      return `${comps.filter((c) => c.status === "degraded").length} DEGRADED`;
    default:
      return `${comps.filter((c) => c.status === "partial_outage" || c.status === "major_outage").length} DOWN`;
  }
}

function buildSectors(summary: StatusSummary): Sector[] {
  return SECTOR_GROUPS.map((gid, index) => {
    const group = summary.groups.find((g) => g.id === gid);
    const waiting = !group || group.components.every((c) => c.lastCheckedAt === null);
    const status: ComponentStatus = group?.status ?? "operational";
    return {
      index,
      id: gid,
      name: group?.name ?? gid,
      status,
      waiting,
      color: waiting ? SECTOR_WAITING_COLOR : STATUS_META[status].color,
      value: sectorValue(group, waiting),
      alarm: !waiting && (status === "partial_outage" || status === "major_outage"),
    };
  });
}

/* ---------- small pieces ---------- */
function FlagGlyph({ color }: { color: string }) {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true" className="shrink-0">
      <path d="M2.5 1v12" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <g className="flag-wave">
        <path d="M3.25 1.5C6 0 8.5 3 11 1.5L14.5 1v7C11.5 9.5 9 6.5 6.5 8l-3.25.75Z" fill={color} />
      </g>
    </svg>
  );
}

/** Gentle dash pattern per sector: S1 starts at the start/finish line. */
function sectorDash(k: number): { strokeDasharray: string; strokeDashoffset: number } {
  return {
    strokeDasharray: "250 750",
    strokeDashoffset: -((SF_FRAC * 1000 + k * 250) % 1000),
  };
}

const KERB_T1 = "M 572 351.5 Q 649.5 351.5 661.3 292.3";
const KERB_HAIRPIN = "M 746 163 C 761 113 718 59 665 60";

/**
 * The hero: the monitoring loop as a lap. Four sectors, one per group, coloured by
 * status; a lit car laps continuously and slows through troubled sectors.
 */
export function CircuitHero({
  summary,
  fetching,
  failed,
}: {
  summary: StatusSummary;
  fetching: boolean;
  failed: boolean;
}) {
  const comps = summary.groups.flatMap((g) => g.components);
  const waiting = comps.length > 0 && comps.every((c) => c.lastCheckedAt === null);
  const meta = STATUS_META[summary.overall];
  const flag = waiting ? FLAG_FORMATION : FLAGS[summary.overall];
  const color = waiting ? "var(--muted)" : meta.color;
  const sectors = buildSectors(summary);
  const live = summary.f1?.live === true;

  const [intro] = useState(shouldPlayIntro);
  const [hl, setHl] = useState<number | null>(null);
  const [laps, setLaps] = useState(0);
  const seed = useSyncExternalStore(subscribeNoop, getLapSeed, getServerLapSeed);
  const tick = useChangeTick(summary.generatedAt);

  const rootRef = useRef<HTMLElement | null>(null);
  const plxRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const layerRef = useRef<SVGGElement | null>(null);
  const carRef = useRef<SVGGElement | null>(null);
  const trailRef = useRef<SVGGElement | null>(null);
  const trailPaths = useRef<(SVGPathElement | null)[]>([]);
  const lights = useRef<(SVGCircleElement | null)[]>([]);
  const gantryRef = useRef<SVGGElement | null>(null);

  useCircuit(
    {
      path: pathRef,
      layer: layerRef,
      car: carRef,
      trail: trailRef,
      trailPaths,
      lights,
      gantry: gantryRef,
      root: rootRef,
    },
    {
      speeds: sectors.map((s) => (waiting ? 0.5 : SECTOR_SPEED[s.status])),
      colors: sectors.map((s) => s.color),
      failed,
      onLap: setLaps,
    },
    intro,
  );
  useParallax(plxRef, rootRef);

  const ariaLabel = `Live circuit, one sector per service group. ${sectors
    .map((s) => `Sector ${s.index + 1}, ${s.name}: ${s.waiting ? "waiting for first check" : STATUS_META[s.status].label}`)
    .join(". ")}.`;

  const sfX = 300;

  return (
    <section
      ref={rootRef}
      aria-labelledby="overall-status"
      className="relative isolate overflow-hidden rounded-xl border border-line bg-card"
      style={{ boxShadow: `inset 0 0 0 1px ${tint(color, 10)}, 0 0 56px -18px ${tint(color, 30)}` }}
    >
      <div className="relative grid lg:grid-cols-[5fr_7fr]">
        {/* ambient glow in the overall status colour, behind the circuit */}
        <div
          aria-hidden="true"
          className="hero-glow pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[70%]"
          style={{ background: `radial-gradient(closest-side at 55% 50%, ${tint(color, 9)}, transparent)` }}
        />

        {/* ---- text ---- */}
        <div className="relative z-10 flex flex-col justify-center gap-4 px-5 pb-6 pt-2 sm:px-8 sm:pb-8 lg:py-10 max-lg:order-2">
          <span
            className="chip w-fit gap-2 px-2 py-1.5 text-[11px]"
            style={{ color: flag.color, background: tint(flag.color, 10), borderColor: tint(flag.color, 35) }}
          >
            <FlagGlyph color={flag.color} />
            {flag.label}
          </span>

          <h1
            id="overall-status"
            className="display text-[40px] font-bold leading-[0.92] lg:text-[clamp(56px,6.4vw,84px)]"
          >
            {waiting ? "Waiting for first check" : meta.headline}
          </h1>

          <div className="num flex flex-col gap-1.5 text-xs uppercase tracking-[0.04em] text-muted">
            <p aria-live="polite" className="flex flex-wrap items-center gap-x-2">
              {failed ? (
                <span style={{ color: "var(--status-degraded)" }}>
                  Signal lost · showing last known status
                </span>
              ) : (
                <>
                  <span>
                    {fetching ? (
                      "Updating…"
                    ) : (
                      <>
                        Updated <RelativeTime iso={summary.generatedAt} />
                      </>
                    )}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Lap {seed === null ? "—" : (seed + laps).toLocaleString("en-US")}</span>
                  <span aria-hidden="true">·</span>
                  <span>{comps.length} components</span>
                </>
              )}
            </p>
            {live && (
              <p className="flex items-center gap-2 text-fg">
                <span aria-hidden="true" className="live-dot size-1.5 rounded-full bg-op" />
                F1 session live
              </p>
            )}
          </div>
        </div>

        {/* ---- circuit + legend ---- */}
        <div className="relative z-10 flex flex-col gap-3 px-3 pb-5 pt-5 sm:px-5 lg:py-6 max-lg:order-1">
          <div ref={plxRef} className="will-change-transform">
            <svg
              viewBox="30 24 750 356"
              role="img"
              aria-label={ariaLabel}
              className="block h-auto w-full overflow-visible"
              onMouseLeave={() => setHl(null)}
            >
              <g aria-hidden="true">
                {/* 1. tarmac: 1px edges around a darker surface */}
                <path
                  d={CIRCUIT_PATH}
                  pathLength={1000}
                  fill="none"
                  stroke="#2A2A2A"
                  strokeWidth="24"
                  strokeLinejoin="round"
                  className={intro ? "tarmac-draw" : undefined}
                />
                <path
                  ref={pathRef}
                  d={CIRCUIT_PATH}
                  pathLength={1000}
                  fill="none"
                  stroke="#111111"
                  strokeWidth="21"
                  strokeLinejoin="round"
                  className={intro ? "tarmac-draw" : undefined}
                />

                {/* 4. kerbs: Turn 1 and the top-right hairpin only */}
                <g
                  fill="none"
                  strokeWidth="6"
                  strokeDasharray="8 8"
                  opacity="0.85"
                  className={intro ? "fade-in-late" : undefined}
                >
                  {[KERB_T1, KERB_HAIRPIN].map((d) => (
                    <g key={d}>
                      <path d={d} stroke="#D40924" />
                      <path d={d} stroke="#E8E8E8" strokeDashoffset="8" />
                    </g>
                  ))}
                </g>

                {/* 2. sectors, each a quarter of the lap */}
                {sectors.map((s) => {
                  const dash = sectorDash(s.index);
                  const dim = hl !== null && hl !== s.index;
                  return (
                    <g
                      key={`${s.index}-${tick}`}
                      className="sector-dim"
                      style={{ opacity: dim ? 0.35 : 1, "--k": s.index } as CSSProperties}
                    >
                      <path
                        d={CIRCUIT_PATH}
                        pathLength={1000}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="9"
                        strokeLinejoin="round"
                        className={tick > 0 ? "sector-glow" : undefined}
                        style={tick > 0 ? undefined : { opacity: 0 }}
                        {...dash}
                      />
                      <path
                        d={CIRCUIT_PATH}
                        pathLength={1000}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={hl === s.index ? 5 : 3}
                        strokeLinejoin="round"
                        className={`sector-line ${tick > 0 ? "sector-pulse" : intro ? "sector-in" : ""}`}
                        style={{ opacity: 0.9 }}
                        {...dash}
                      />
                      {s.alarm && (
                        <path
                          d={CIRCUIT_PATH}
                          pathLength={1000}
                          fill="none"
                          stroke="var(--crimson)"
                          strokeWidth="3.5"
                          strokeLinejoin="round"
                          className="sector-alarm"
                          {...dash}
                        />
                      )}
                    </g>
                  );
                })}

                {/* 3. sector boundary ticks and labels */}
                {BOUNDARIES.map((b, i) => {
                  const nx = -b.ty;
                  const ny = b.tx;
                  return (
                    <line
                      key={i}
                      x1={b.x - nx * 11}
                      y1={b.y - ny * 11}
                      x2={b.x + nx * 11}
                      y2={b.y + ny * 11}
                      stroke="#F8F8F8"
                      strokeOpacity="0.55"
                      strokeWidth="1.5"
                    />
                  );
                })}
                {SECTOR_LABELS.map((p, i) => (
                  <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="circuit-label">
                    S{i + 1}
                  </text>
                ))}

                {/* 5. start/finish: checkered block, plus the T1 marker (the brand) */}
                <g>
                  {[0, 1, 2, 3].flatMap((r) =>
                    [0, 1].map((c) => (
                      <rect
                        key={`${r}-${c}`}
                        x={sfX - 2 + c * 2}
                        y={331 + r * 4.5}
                        width="2"
                        height="4.5"
                        fill={(r + c) % 2 === 0 ? "#F8F8F8" : "#0b0b0b"}
                      />
                    )),
                  )}
                </g>
                <line x1="662" y1="320" x2="680" y2="334" stroke="var(--crimson)" strokeOpacity="0.8" strokeWidth="1" />
                <text x="684" y="338" dominantBaseline="middle" className="circuit-label circuit-label-t1">
                  T1
                </text>

                {/* lights-out gantry: only on the first load of the page */}
                {intro && (
                  <g ref={gantryRef} className="gantry">
                    <rect x="279" y="310" width="42" height="13" rx="3" fill="#0b0b0b" stroke="#1B1B1B" />
                    {[0, 1, 2, 3, 4].map((i) => (
                      <circle
                        key={i}
                        ref={(el) => {
                          lights.current[i] = el;
                        }}
                        cx={sfX + (i - 2) * 7.5}
                        cy="316.5"
                        r="2.5"
                        fill="#EE343B"
                        opacity="0.12"
                      />
                    ))}
                  </g>
                )}

                {/* 6. the car: trail, glow, capsule */}
                <g ref={layerRef}>
                  <g ref={trailRef} className="trail-layer" style={{ opacity: 0 }}>
                    {TRAIL_LENGTHS.map((len, i) => (
                      <path
                        key={len}
                        ref={(el) => {
                          trailPaths.current[i] = el;
                        }}
                        d={CIRCUIT_PATH}
                        pathLength={1000}
                        fill="none"
                        stroke="var(--car, #F8F8F8)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeOpacity={[0.14, 0.22, 0.36, 0.6][i]}
                        strokeDasharray={`${len} ${1000 - len}`}
                        strokeDashoffset={len - SF_FRAC * 1000}
                      />
                    ))}
                  </g>
                  <g className="car-fade" style={{ opacity: failed ? 0.4 : 1 }}>
                    <g ref={carRef} transform={`translate(${sfX} 340) rotate(0)`}>
                      <circle r="14" fill="var(--car, #F8F8F8)" opacity="0.12" />
                      <circle r="8" fill="var(--car, #F8F8F8)" opacity="0.35" />
                      <rect x="-7" y="-2.75" width="14" height="5.5" rx="2.75" fill="#F8F8F8" />
                    </g>
                  </g>
                </g>

                {/* hit areas so hovering a sector highlights its legend cell */}
                {sectors.map((s) => (
                  <path
                    key={s.index}
                    d={CIRCUIT_PATH}
                    pathLength={1000}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="24"
                    pointerEvents="stroke"
                    onMouseEnter={() => setHl(s.index)}
                    {...sectorDash(s.index)}
                  />
                ))}
              </g>
            </svg>
          </div>

          {/* sector legend: F1 sector-time boxes */}
          <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4">
            {sectors.map((s) => (
              <li key={s.index}>
                <div
                  role="group"
                  tabIndex={0}
                  aria-label={`Sector ${s.index + 1}, ${s.name}: ${s.value}`}
                  onMouseEnter={() => setHl(s.index)}
                  onMouseLeave={() => setHl(null)}
                  onFocus={() => setHl(s.index)}
                  onBlur={() => setHl(null)}
                  className="t-fast relative overflow-hidden rounded-md border border-line bg-surface px-3 pb-2.5 pt-3 hover:bg-elevated focus-visible:bg-elevated"
                  style={hl === s.index ? { borderColor: tint(s.color, 55) } : undefined}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-[2px]"
                    style={{ background: s.color }}
                  />
                  <span className="num block text-[10px] leading-none tracking-[0.1em] text-muted">
                    S{s.index + 1}
                  </span>
                  <span className="display mt-1.5 block truncate text-[17px] font-semibold leading-none">
                    {s.name}
                  </span>
                  <span
                    className="num mt-2 block text-[12px] leading-none tracking-[0.04em]"
                    style={{ color: s.waiting || s.status === "operational" ? "var(--fg)" : s.color }}
                  >
                    {s.value}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* scanlines: this panel only */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgb(255 255 255 / 0.02) 0, rgb(255 255 255 / 0.02) 1px, transparent 1px, transparent 3px)",
        }}
      />

      {/* refresh sweep: once per data arrival, never on a timer */}
      {tick > 0 && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          <div key={tick} className="hero-sweep absolute inset-0" />
        </div>
      )}
    </section>
  );
}
