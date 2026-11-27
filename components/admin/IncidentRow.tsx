import Link from "next/link";
import { ComponentChip } from "@/components/status/ComponentChip";
import { ImpactChip } from "@/components/status/ImpactChip";
import { RelativeTime } from "@/components/status/RelativeTime";
import { INCIDENT_STATE_LABEL } from "@/components/status/statusMeta";
import type { Incident } from "@/lib/status/types";
import { quickResolveAction } from "@/app/admin/actions";
import { btnCls } from "./ui";

/** Compact active-incident row with quick actions (dashboard). */
export function AdminIncidentRow({ incident, names }: { incident: Incident; names: Record<string, string> }) {
  return (
    <li className="rounded-xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ImpactChip impact={incident.impact} />
        <span className="chip border-line text-muted">{INCIDENT_STATE_LABEL[incident.state]}</span>
        {incident.automatic && <span className="chip border-line text-muted">Automatic</span>}
        <RelativeTime iso={incident.createdAt} className="ml-auto text-xs text-muted" />
      </div>
      <h3 className="mt-2.5 text-[15px] font-semibold">
        <Link href={`/admin/incidents/${incident.id}`} className="hover:underline hover:underline-offset-4">
          {incident.title}
        </Link>
      </h3>
      {incident.components.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {incident.components.map((c) => (
            <ComponentChip key={c.id} id={c.id} name={names[c.id] ?? c.id} status={c.status} />
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/admin/incidents/${incident.id}`} className={btnCls}>
          Post update
        </Link>
        <form action={quickResolveAction}>
          <input type="hidden" name="id" value={incident.id} />
          <button type="submit" className={btnCls}>
            Resolve
          </button>
        </form>
      </div>
    </li>
  );
}
