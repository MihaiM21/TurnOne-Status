import type { IncidentUpdate } from "@/lib/status/types";
import { RelativeTime } from "./RelativeTime";
import { INCIDENT_STATE_LABEL } from "./statusMeta";

/** Vertical timeline of incident updates, newest first (as given). */
export function IncidentTimeline({ updates }: { updates: IncidentUpdate[] }) {
  return (
    <ol className="relative m-0 list-none p-0">
      <span aria-hidden="true" className="absolute bottom-2 left-[4px] top-2 w-px bg-line" />
      {updates.map((u, i) => (
        <li key={u.id} className="relative pb-5 pl-6 last:pb-0">
          <span
            aria-hidden="true"
            className="absolute left-0 top-[5px] size-[9px] rounded-full border"
            style={{
              borderColor: i === 0 ? "var(--fg)" : "#3a3a3a",
              background: i === 0 ? "var(--fg)" : "var(--bg)",
            }}
          />
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[13px] font-medium text-fg">{INCIDENT_STATE_LABEL[u.state]}</span>
            <RelativeTime iso={u.createdAt} className="text-xs text-muted" />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-[#c9c9c9]">{u.body}</p>
        </li>
      ))}
    </ol>
  );
}
