"use client";

import { Wrench } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import type { Maintenance } from "@/lib/status/types";
import { ComponentChip } from "./ComponentChip";
import { Countdown } from "./Countdown";
import { formatHM, formatLocal, formatUtc } from "./format";
import { STATUS_META, tint } from "./statusMeta";

/** Compact maintenance window: local time + UTC, countdown, affected components. */
export function MaintenanceCard({
  maintenance,
  names,
}: {
  maintenance: Maintenance;
  names: Record<string, string>;
}) {
  const now = useNow();
  const color = STATUS_META.maintenance.color;
  const inProgress = maintenance.state === "in_progress";
  const local =
    now === null
      ? null
      : `${formatLocal(maintenance.scheduledStart)} – ${formatLocal(maintenance.scheduledEnd).split(", ")[1]} local`;

  return (
    <article
      className="rounded-xl border bg-card p-4 sm:p-5"
      style={{ borderColor: tint(color, 35) }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="chip"
          style={{ color, background: tint(color, 10), borderColor: tint(color, 35) }}
        >
          <Wrench size={12} aria-hidden="true" strokeWidth={2.25} />
          {inProgress ? "In progress" : "Scheduled"}
        </span>
        <span className="num ml-auto text-xs text-muted">
          {inProgress ? (
            <>
              in progress · ends in <Countdown to={maintenance.scheduledEnd} variant="compact" />
            </>
          ) : (
            <>
              starts in <Countdown to={maintenance.scheduledStart} variant="compact" />
            </>
          )}
        </span>
      </div>
      <h3 className="mt-3 text-[15px] font-semibold">{maintenance.title}</h3>
      {maintenance.body && <p className="mt-1 text-sm leading-relaxed text-[#c9c9c9]">{maintenance.body}</p>}
      <p className="num mt-3 text-xs text-muted">
        {local && <span className="mr-3 text-fg">{local}</span>}
        <span>
          {formatUtc(maintenance.scheduledStart)} – {formatHM(maintenance.scheduledEnd)} UTC
        </span>
      </p>
      {maintenance.componentIds.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {maintenance.componentIds.map((id) => (
            <ComponentChip key={id} id={id} name={names[id] ?? id} />
          ))}
        </div>
      )}
    </article>
  );
}
