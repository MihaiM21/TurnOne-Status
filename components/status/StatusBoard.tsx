"use client";

import { useMemo } from "react";
import { useStatus } from "@/hooks/use-status";
import type { StatusSummary } from "@/lib/status/types";
import { F1Strip } from "./F1Strip";

import { CircuitHero } from "@/components/hero/CircuitHero";
import { IncidentCard } from "./IncidentCard";
import { MaintenanceCard } from "./MaintenanceCard";
import { RecentIncidents } from "./RecentIncidents";
import { GroupBlock } from "./TimingTower";

export function componentNames(summary: StatusSummary): Record<string, string> {
  const out: Record<string, string> = {};
  for (const g of summary.groups) for (const c of g.components) out[c.id] = c.name;
  return out;
}

function SectionTitle({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2 id={id} className="display mb-3 text-[20px] font-semibold leading-none">
      {children}
    </h2>
  );
}

/** The whole home page body. Server data is the initial state; it then polls. */
export function StatusBoard({ initial }: { initial: StatusSummary }) {
  const { summary, fetching, failed } = useStatus(initial);
  const names = useMemo(() => componentNames(summary), [summary]);
  const maintenance = summary.maintenance.filter((m) => m.state !== "completed");

  return (
    <div className="flex flex-col gap-8">
      <CircuitHero summary={summary} fetching={fetching} failed={failed} />

      {summary.activeIncidents.length > 0 && (
        <section aria-labelledby="active-incidents">
          <SectionTitle id="active-incidents">Active incidents</SectionTitle>
          <div className="flex flex-col gap-3">
            {summary.activeIncidents.map((i) => (
              <IncidentCard key={i.id} incident={i} names={names} />
            ))}
          </div>
        </section>
      )}

      {maintenance.length > 0 && (
        <section aria-labelledby="maintenance">
          <SectionTitle id="maintenance">Maintenance</SectionTitle>
          <div className="flex flex-col gap-3">
            {maintenance.map((m) => (
              <MaintenanceCard key={m.id} maintenance={m} names={names} />
            ))}
          </div>
        </section>
      )}

      {summary.f1 && <F1Strip session={summary.f1} />}

      <section aria-labelledby="systems" className="flex flex-col gap-5">
        <h2 id="systems" className="sr-only">
          Systems
        </h2>
        {summary.groups.map((g, gi) => (
          <GroupBlock key={g.id} group={g} names={names} startIndex={summary.groups.slice(0, gi).reduce((n, x) => n + x.components.length, 0)} />
        ))}
      </section>

      <section aria-labelledby="recent-incidents">
        <SectionTitle id="recent-incidents">Recent incidents · past 14 days</SectionTitle>
        <RecentIncidents incidents={summary.recentIncidents} />
      </section>
    </div>
  );
}
