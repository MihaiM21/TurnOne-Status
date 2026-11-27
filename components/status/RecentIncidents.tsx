import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { Incident } from "@/lib/status/types";
import { formatDuration, formatShortDate } from "./format";
import { ImpactChip } from "./ImpactChip";

/** Past incidents, compact. Links to /incidents/<id> and /incidents. */
export function RecentIncidents({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="rounded-xl border border-line bg-card">
      {incidents.length === 0 ? (
        <p className="flex items-center gap-2.5 px-4 py-5 text-sm text-muted sm:px-5">
          <Check size={16} aria-hidden="true" style={{ color: "var(--status-operational)" }} />
          No incidents in the last 14 days.
        </p>
      ) : (
        <ul className="m-0 list-none p-0">
          {incidents.map((i) => {
            const secs = i.resolvedAt
              ? (new Date(i.resolvedAt).getTime() - new Date(i.createdAt).getTime()) / 1000
              : null;
            return (
              <li key={i.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/incidents/${i.id}`}
                  className="t-fast grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 px-4 py-3 hover:bg-elevated sm:px-5 md:grid-cols-[64px_1fr_auto_64px_96px]"
                >
                  <span className="num text-xs text-muted">{formatShortDate(i.createdAt)}</span>
                  <span className="min-w-0 truncate text-sm text-fg md:col-auto">{i.title}</span>
                  <span className="col-start-2 flex items-center gap-3 md:col-auto md:contents">
                    <ImpactChip impact={i.impact} className="md:justify-self-start" />
                    <span className="num text-xs text-muted md:text-right">
                      {secs === null ? "—" : formatDuration(secs)}
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 text-xs md:justify-self-end"
                      style={{ color: "var(--status-operational)" }}
                    >
                      <Check size={13} aria-hidden="true" />
                      Resolved
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-t border-line px-4 py-3 sm:px-5">
        <Link
          href="/incidents"
          className="t-fast inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg"
        >
          View incident history
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
