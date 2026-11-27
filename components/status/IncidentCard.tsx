"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { Incident } from "@/lib/status/types";
import { ComponentChip } from "./ComponentChip";
import { ImpactChip } from "./ImpactChip";
import { IncidentTimeline } from "./IncidentTimeline";
import { RelativeTime } from "./RelativeTime";
import { INCIDENT_STATE_LABEL, IMPACT_META, tint } from "./statusMeta";

/**
 * Incident card: impact, title (links to /incidents/<id>), latest update,
 * state, relative time, affected components, expandable timeline.
 * `names` maps component id -> display name.
 */
export function IncidentCard({
  incident,
  names,
  defaultExpanded = false,
}: {
  incident: Incident;
  names: Record<string, string>;
  defaultExpanded?: boolean;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  const panelId = useId();
  const latest = incident.updates[0];
  const color = IMPACT_META[incident.impact].color;

  return (
    <article
      className="rounded-xl border bg-card"
      style={{ borderColor: tint(color, 40) }}
      aria-labelledby={`${panelId}-t`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <ImpactChip impact={incident.impact} />
          <span className="chip border-line text-muted">{INCIDENT_STATE_LABEL[incident.state]}</span>
          {incident.automatic && (
            <span
              className="chip border-line text-muted"
              title="Opened automatically by the monitoring engine"
            >
              Automatic
            </span>
          )}
          <RelativeTime
            iso={latest?.createdAt ?? incident.createdAt}
            className="ml-auto text-xs text-muted"
          />
        </div>
        <h3 id={`${panelId}-t`} className="mt-3 text-[17px] font-semibold leading-snug">
          <Link
            href={`/incidents/${incident.id}`}
            className="t-fast hover:underline hover:underline-offset-4"
          >
            {incident.title}
          </Link>
        </h3>
        {latest && <p className="mt-1.5 text-sm leading-relaxed text-[#c9c9c9]">{latest.body}</p>}
        {incident.components.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {incident.components.map((c) => (
              <ComponentChip key={c.id} id={c.id} name={names[c.id] ?? c.id} status={c.status} />
            ))}
          </div>
        )}
      </div>
      {incident.updates.length > 1 && (
        <>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
            className="t-fast flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-muted hover:bg-surface hover:text-fg sm:px-5"
          >
            <ChevronDown
              size={14}
              aria-hidden="true"
              className="transition-transform duration-200"
              style={{ transform: open ? "rotate(180deg)" : undefined }}
            />
            <span className="label">
              {open ? "Hide timeline" : `Timeline · ${incident.updates.length} updates`}
            </span>
          </button>
          {open && (
            <div id={panelId} className="pop-in border-t border-line p-4 sm:p-5">
              <IncidentTimeline updates={incident.updates} />
            </div>
          )}
        </>
      )}
    </article>
  );
}
