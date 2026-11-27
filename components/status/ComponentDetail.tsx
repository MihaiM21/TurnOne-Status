"use client";

import Link from "next/link";
import { useStatus } from "@/hooks/use-status";
import type { ComponentSummary, StatusSummary } from "@/lib/status/types";
import { BetaChip } from "./TimingTower";
import { formatMs, formatPct } from "./format";
import { IncidentCard } from "./IncidentCard";
import { LatencyChart } from "./LatencyChart";
import { RelativeTime } from "./RelativeTime";
import { StatusDot } from "./StatusDot";
import { StatusLabel } from "./StatusLabel";
import { STATUS_META, SUBCHECK_META, statusColor } from "./statusMeta";
import { UptimeStrip } from "./UptimeStrip";
import { componentNames } from "./StatusBoard";

function findComponent(summary: StatusSummary, id: string): ComponentSummary | null {
  for (const g of summary.groups) {
    const c = g.components.find((x) => x.id === id);
    if (c) return c;
  }
  return null;
}

function Panel({
  title,
  id,
  children,
  aside,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-line bg-card">
      <div className="flex items-center justify-between gap-3 rounded-t-xl border-b border-line bg-surface px-4 py-3 sm:px-5">
        <h2 id={id} className="label !text-fg">
          {title}
        </h2>
        {aside}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="num mt-2 text-xl text-fg">{children}</div>
    </div>
  );
}

export function ComponentDetail({ initial, id }: { initial: StatusSummary; id: string }) {
  const { summary } = useStatus(initial);
  const c = findComponent(summary, id) ?? findComponent(initial, id);
  if (!c) return null;

  const names = componentNames(summary);
  const touches = (i: { components: { id: string }[] }) => i.components.some((x) => x.id === id);
  const active = summary.activeIncidents.filter(touches);
  const recent = summary.recentIncidents.filter(touches);
  const maint = summary.maintenance.filter((m) => m.state !== "completed" && m.componentIds.includes(id));
  const hasLatency = c.spark.some((p) => p.ok && p.ms !== null && p.ms > 0);
  const waiting = c.lastCheckedAt === null;
  const meta = STATUS_META[c.status];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/"
        className="t-fast inline-flex w-fit items-center gap-1.5 text-[13px] text-muted hover:text-fg"
      >
        <span aria-hidden="true">←</span> All systems
      </Link>

      <header
        className="relative overflow-hidden rounded-xl border border-line bg-card py-6 pl-7 pr-5 sm:pl-9 sm:pr-8"
      >
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: waiting ? "var(--muted)" : meta.color }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="display text-[36px] font-bold leading-none sm:text-[48px]">{c.name}</h1>
          {c.beta && <BetaChip />}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          {waiting ? (
            <span className="inline-flex items-center gap-2 text-muted">
              <StatusDot status={null} /> Waiting for first check
            </span>
          ) : (
            <StatusLabel status={c.status} />
          )}
          {c.version && <span className="num text-xs text-muted">v{c.version}</span>}
          {c.lastCheckedAt && (
            <span className="text-xs text-muted">
              Last checked <RelativeTime iso={c.lastCheckedAt} />
            </span>
          )}
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#c9c9c9]">{c.description}</p>
        {c.status !== "operational" && c.reason && (
          <p className="mt-2 text-sm" style={{ color: meta.color }}>
            {c.reason}
          </p>
        )}
      </header>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-line bg-card p-4 sm:grid-cols-3 sm:p-5">
        <Stat label="Latency">
          {c.derivedFrom.length > 0 ? <span className="text-muted">derived</span> : formatMs(c.latencyMs)}
        </Stat>
        <Stat label="Uptime · 90 days">{formatPct(c.uptimePct)}</Stat>
        <Stat label="Auto status">
          <span className="font-sans text-base" style={{ color: statusColor(c.autoStatus) }}>
            {STATUS_META[c.autoStatus].label}
          </span>
        </Stat>
      </div>

      {c.derivedFrom.length > 0 && (
        <Panel title="Status comes from" id="derived">
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {c.derivedFrom.map((d) => {
              const dep = findComponent(summary, d);
              return (
                <li key={d}>
                  <Link
                    href={`/components/${d}`}
                    className="t-fast inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm hover:bg-elevated"
                  >
                    {dep && <StatusDot status={dep.status} />}
                    {names[d] ?? d}
                    {dep && <span className="text-xs text-muted">{STATUS_META[dep.status].label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {c.derivedFrom.length === 0 && (
        <Panel title="Latency · last 60 min" id="latency" aside={<span className="num text-xs text-muted">UTC</span>}>
          {hasLatency ? (
            <LatencyChart points={c.spark} />
          ) : (
            <p className="py-6 text-center text-sm text-muted">No latency data yet.</p>
          )}
          <div className="num mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-px w-4 bg-fg/80" /> Response time
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-3 w-[3px] rounded-sm bg-crimson" /> Failed check
            </span>
          </div>
        </Panel>
      )}

      <Panel
        title="Uptime · 90 days"
        id="uptime"
        aside={<span className="num text-xs text-muted">{formatPct(c.uptimePct)}</span>}
      >
        <UptimeStrip days={c.uptime90} size="lg" label={`${c.name} uptime, last 90 days`} />
        <div className="num mt-3 flex items-center justify-between text-[11px] text-muted">
          <span>90 days ago</span>
          <span>Today</span>
        </div>
        <ul className="m-0 mt-4 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-xs text-muted">
          {(["operational", "maintenance", "degraded", "partial_outage", "major_outage"] as const).map((s) => (
            <li key={s} className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-3 w-1 rounded-[1px]" style={{ background: STATUS_META[s].color }} />
              {STATUS_META[s].label}
            </li>
          ))}
          <li className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-3 w-1 rounded-[1px] bg-line" />
            No data
          </li>
        </ul>
      </Panel>

      {c.subchecks.length > 0 && (
        <Panel title="Sub-checks" id="subchecks">
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[320px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="label px-4 pb-2.5 font-normal sm:px-5">Name</th>
                  <th scope="col" className="label px-2 pb-2.5 font-normal">State</th>
                  <th scope="col" className="label px-4 pb-2.5 text-right font-normal sm:px-5">Value</th>
                </tr>
              </thead>
              <tbody>
                {c.subchecks.map((s) => {
                  const m = SUBCHECK_META[s.state];
                  return (
                    <tr key={s.name} className="border-b border-line last:border-b-0">
                      <td className="num px-4 py-2.5 text-[13px] sm:px-5">{s.name}</td>
                      <td className="num px-2 py-2.5 text-[13px]">
                        <span className="inline-flex items-center gap-2" style={{ color: m.color }}>
                          <span aria-hidden="true" className="inline-block size-2 rounded-full" style={{ background: m.color }} />
                          {m.label}
                        </span>
                      </td>
                      <td className="num px-4 py-2.5 text-right text-[13px] text-muted sm:px-5">{s.value}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {(active.length > 0 || recent.length > 0 || maint.length > 0) && (
        <section aria-labelledby="touching" className="flex flex-col gap-3">
          <h2 id="touching" className="label">
            Incidents affecting this component
          </h2>
          {active.map((i) => (
            <IncidentCard key={i.id} incident={i} names={names} />
          ))}
          {recent.map((i) => (
            <IncidentCard key={i.id} incident={i} names={names} />
          ))}
          {maint.map((m) => (
            <div key={m.id} className="rounded-xl border border-line bg-card p-4 text-sm">
              <span className="label mr-3">{m.state === "in_progress" ? "Maintenance · in progress" : "Maintenance · scheduled"}</span>
              {m.title}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
