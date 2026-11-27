import Link from "next/link";
import { ComponentChip } from "@/components/status/ComponentChip";
import { formatUtc } from "@/components/status/format";
import type { Maintenance } from "@/lib/status/types";
import { cancelMaintenanceAction, completeMaintenanceAction } from "@/app/admin/actions";
import { btnCls, btnDangerCls } from "./ui";

export function AdminMaintenanceRow({ maintenance, names }: { maintenance: Maintenance; names: Record<string, string> }) {
  const inProgress = maintenance.state === "in_progress";
  return (
    <li className="rounded-xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip border-line text-muted">{inProgress ? "In progress" : "Scheduled"}</span>
        <span className="num ml-auto text-xs text-muted">
          {formatUtc(maintenance.scheduledStart)} to {formatUtc(maintenance.scheduledEnd)}
        </span>
      </div>
      <h3 className="mt-2.5 text-[15px] font-semibold">
        <Link href={`/admin/maintenance/${maintenance.id}`} className="hover:underline hover:underline-offset-4">
          {maintenance.title}
        </Link>
      </h3>
      {maintenance.componentIds.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {maintenance.componentIds.map((id) => (
            <ComponentChip key={id} id={id} name={names[id] ?? id} />
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/admin/maintenance/${maintenance.id}`} className={btnCls}>
          Edit
        </Link>
        {inProgress && (
          <form action={completeMaintenanceAction}>
            <input type="hidden" name="id" value={maintenance.id} />
            <button type="submit" className={btnCls}>
              Complete now
            </button>
          </form>
        )}
        <form action={cancelMaintenanceAction}>
          <input type="hidden" name="id" value={maintenance.id} />
          <button type="submit" className={btnDangerCls}>
            Cancel
          </button>
        </form>
      </div>
    </li>
  );
}
