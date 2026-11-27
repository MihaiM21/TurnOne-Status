"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { SECTOR_GROUPS, SECTOR_WAITING_COLOR } from "@/components/hero/circuitGeometry";
import { useChangeTick, useLatencyDelta } from "@/hooks/use-change-tick";
import type { ComponentSummary, GroupSummary } from "@/lib/status/types";
import { formatMs, formatPct } from "./format";
import { RollingNumber } from "./RollingNumber";
import { Sparkline } from "./Sparkline";
import { StatusDot } from "./StatusDot";
import { StatusLabel } from "./StatusLabel";
import { STATUS_META } from "./statusMeta";
import { UptimeStrip } from "./UptimeStrip";

export function BetaChip() {
  return (
    <span className="chip shrink-0 border-line bg-surface text-muted" style={{ padding: "2px 5px", fontSize: 9.5 }}>
      Beta
    </span>
  );
}

function Row({
  component: c,
  pos,
  index,
  names,
}: {
  component: ComponentSummary;
  pos: number;
  /** Row index across the whole tower, drives the load-in stagger. */
  index: number;
  names: Record<string, string>;
}) {
  const waiting = c.lastCheckedAt === null;
  const derived = c.derivedFrom.length > 0;
  const meta = STATUS_META[c.status];
  const sub = c.status !== "operational" && c.reason ? c.reason : c.description;
  const subColor = c.status !== "operational" && c.reason ? meta.color : undefined;

  // Row refresh sweep: when a new check lands for this row.
  const sweep = useChangeTick(`${c.lastCheckedAt}|${c.latencyMs}|${c.status}`);
  // Timing-screen colours on latency change.
  const delta = useLatencyDelta(c.latencyMs);

  return (
    <li
      className="tower-grid tower-row-in relative border-t border-line px-4 py-3.5 t-fast first:border-t-0 hover:bg-elevated md:py-3"
      style={{ "--i": index } as CSSProperties}
    >
      <span
        aria-hidden="true"
        className="row-bar absolute bottom-1.5 left-0 top-1.5 w-[2px] rounded-full"
        style={{ background: waiting ? "var(--status-nodata)" : meta.color }}
      />
      {sweep > 0 && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <span
            key={sweep}
            className="row-sweep absolute inset-y-0 left-0 w-2/5"
            style={{
              background:
                "linear-gradient(to right, transparent, rgb(255 255 255 / 0.04) 60%, rgb(255 255 255 / 0.04) 80%, transparent)",
            }}
          />
        </span>
      )}

      <span className="a-pos num text-xs text-muted">P{pos}</span>

      <div className="a-name min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/components/${c.id}`}
            className="row-link min-w-0 truncate text-[15px] font-medium text-fg"
          >
            {c.name}
          </Link>
          {c.beta && <BetaChip />}
        </div>
        <p
          className={`truncate text-xs text-muted ${
            c.status !== "operational" && c.reason ? "" : "hidden md:block"
          }`}
          style={subColor ? { color: subColor } : undefined}
        >
          {sub}
        </p>
      </div>

      <div className="a-status">
        {waiting ? (
          <span className="inline-flex items-center gap-2 text-[13px] text-muted">
            <StatusDot status={null} />
            Waiting for first check
          </span>
        ) : (
          <StatusLabel status={c.status} ping />
        )}
      </div>

      <div className="a-lat num whitespace-nowrap text-[13px] text-fg">
        {derived ? (
          <span
            className="relative z-10 cursor-help text-muted underline decoration-dotted decoration-[#3a3a3a] underline-offset-4"
            title={`Status comes from: ${c.derivedFrom.map((id) => names[id] ?? id).join(", ")}`}
            aria-label={`Status derived from ${c.derivedFrom.map((id) => names[id] ?? id).join(", ")}`}
          >
            via {c.derivedFrom.length} service{c.derivedFrom.length === 1 ? "" : "s"}
          </span>
        ) : (
          <span
            key={delta.dir ? delta.n : "static"}
            className={`${c.latencyMs === null ? "text-muted" : ""} ${
              delta.dir === "faster" ? "flash-faster" : delta.dir === "slower" ? "flash-slower" : ""
            }`}
          >
            <RollingNumber value={formatMs(c.latencyMs)} />
          </span>
        )}
      </div>

      <div className="a-spark">
        <Sparkline points={c.spark} />
      </div>

      <div className="a-strip min-w-0">
        <UptimeStrip days={c.uptime90} mobileCount={30} label={`${c.name} uptime, last 90 days`} />
      </div>

      <div className="a-up num text-[13px] text-fg">
        <span className={c.uptimePct === null ? "text-muted" : ""}>
          <RollingNumber value={formatPct(c.uptimePct)} />
        </span>
      </div>
    </li>
  );
}

/** Mini 4-segment indicator: which circuit sector this group is. */
function SectorIndicator({ index, color }: { index: number; color: string }) {
  return (
    <span className="inline-flex items-center gap-2" aria-hidden="true">
      <span className="flex gap-[2px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1 w-3.5 rounded-[1px]"
            style={{ background: i === index ? color : "var(--border)" }}
          />
        ))}
      </span>
      <span className="num text-[11px] leading-none tracking-[0.1em] text-muted">S{index + 1}</span>
    </span>
  );
}

/** One group block: header row with column headers (desktop) plus component rows. */
export function GroupBlock({
  group,
  names,
  startIndex = 0,
}: {
  group: GroupSummary;
  names: Record<string, string>;
  /** Number of rows rendered in the groups above, for the load-in stagger. */
  startIndex?: number;
}) {
  const allWaiting = group.components.every((c) => c.lastCheckedAt === null);
  const sector = SECTOR_GROUPS.indexOf(group.id);
  const sectorColor = allWaiting ? SECTOR_WAITING_COLOR : STATUS_META[group.status].color;
  return (
    <section aria-labelledby={`g-${group.id}`} className="rounded-xl border border-line bg-card">
      <div className="flex items-center justify-between gap-3 rounded-t-xl border-b border-line bg-surface px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <h3 id={`g-${group.id}`} className="display truncate text-[20px] font-semibold leading-none">
            {group.name}
          </h3>
          {sector >= 0 && <SectorIndicator index={sector} color={sectorColor} />}
        </div>
        {!allWaiting && <StatusLabel status={group.status} />}
      </div>
      <div className="tower-grid hidden border-b border-line px-4 py-2 md:grid" aria-hidden="true">
        <span className="label a-pos">Pos</span>
        <span className="label a-name">Component</span>
        <span className="label a-status">Status</span>
        <span className="label a-lat">Latency</span>
        <span className="label a-spark">Last 60 min</span>
        <span className="label a-strip">90 days</span>
        <span className="label a-up">Uptime</span>
      </div>
      <ul className="m-0 list-none p-0 [&>li:last-child]:rounded-b-[11px]">
        {group.components.map((c, i) => (
          <Row key={c.id} component={c} pos={i + 1} index={startIndex + i} names={names} />
        ))}
      </ul>
    </section>
  );
}
