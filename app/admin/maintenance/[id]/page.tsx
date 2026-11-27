import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cancelMaintenanceAction, completeMaintenanceAction } from "@/app/admin/actions";
import { MaintenanceForm } from "@/components/admin/MaintenanceForm";
import { btnCls, btnDangerCls, cardCls } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/status/auth";
import { getMaintenance } from "@/lib/status/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: getMaintenance(id)?.title ?? "Maintenance" };
}

const STATE_LABEL = { scheduled: "Scheduled", in_progress: "In progress", completed: "Completed" } as const;

export default async function AdminMaintenancePage({ params }: Props) {
  const { id } = await params;
  await requireAdmin(`/admin/maintenance/${id}`);
  const m = getMaintenance(id);
  if (!m) notFound();

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
      <div>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{m.title}</h1>
          <span className="chip border-line text-muted">{STATE_LABEL[m.state]}</span>
        </div>
        <MaintenanceForm maintenance={m} />
      </div>
      <aside className={`${cardCls} h-fit`} aria-labelledby="h-act">
        <h2 id="h-act" className="label mb-4">
          Actions
        </h2>
        <div className="flex flex-col gap-3">
          {m.state === "in_progress" && (
            <form action={completeMaintenanceAction}>
              <input type="hidden" name="id" value={m.id} />
              <button type="submit" className={`${btnCls} w-full`}>
                Complete now
              </button>
              <p className="mt-1.5 text-xs text-muted">Ends the window at the current time.</p>
            </form>
          )}
          <form action={cancelMaintenanceAction}>
            <input type="hidden" name="id" value={m.id} />
            <button type="submit" className={`${btnDangerCls} w-full`}>
              Cancel and delete
            </button>
            <p className="mt-1.5 text-xs text-muted">Removes the window entirely.</p>
          </form>
        </div>
      </aside>
    </div>
  );
}
