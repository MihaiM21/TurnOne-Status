import Link from "next/link";
import { AdminIncidentRow } from "@/components/admin/IncidentRow";
import { AdminMaintenanceRow } from "@/components/admin/MaintenanceRow";
import { btnCls, btnPrimaryCls } from "@/components/admin/ui";
import { StatusPill } from "@/components/status/StatusPill";
import { requireAdmin } from "@/lib/status/auth";
import { COMPONENTS } from "@/lib/status/components";
import { getStatusSummary } from "@/lib/status/summary";

export const dynamic = "force-dynamic";

const NAMES = Object.fromEntries(COMPONENTS.map((c) => [c.id, c.name]));

export default async function AdminDashboard() {
  await requireAdmin("/admin");
  const summary = await getStatusSummary();
  const { activeIncidents, maintenance } = summary;
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-xl font-semibold">Dashboard</h1>
        <Link href="/admin/maintenance/new" className={btnCls}>
          Schedule maintenance
        </Link>
        <Link href="/admin/incidents/new" className={btnPrimaryCls}>
          New incident
        </Link>
      </div>

      <section aria-labelledby="h-inc">
        <h2 id="h-inc" className="label mb-3">
          Active incidents · {activeIncidents.length}
        </h2>
        {activeIncidents.length === 0 ? (
          <p className="rounded-xl border border-line bg-card p-4 text-sm text-muted">No active incidents.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {activeIncidents.map((i) => (
              <AdminIncidentRow key={i.id} incident={i} names={NAMES} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-mnt">
        <h2 id="h-mnt" className="label mb-3">
          Maintenance · {maintenance.length}
        </h2>
        {maintenance.length === 0 ? (
          <p className="rounded-xl border border-line bg-card p-4 text-sm text-muted">
            Nothing in progress or scheduled.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {maintenance.map((m) => (
              <AdminMaintenanceRow key={m.id} maintenance={m} names={NAMES} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-live">
        <h2 id="h-live" className="label mb-3">
          Live component states
        </h2>
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="label px-4 py-3 font-normal">Component</th>
                <th className="label px-4 py-3 font-normal">Auto status</th>
                <th className="label px-4 py-3 font-normal">Effective</th>
                <th className="label px-4 py-3 text-right font-normal">Latency</th>
              </tr>
            </thead>
            <tbody>
              {summary.groups.flatMap((g) =>
                g.components.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="text-muted">{g.name} / </span>
                      {c.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={c.autoStatus} />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={c.status} />
                    </td>
                    <td className="num px-4 py-2.5 text-right text-muted">
                      {c.latencyMs === null ? "-" : `${Math.round(c.latencyMs)} ms`}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
