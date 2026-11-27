import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditIncidentForm, PostUpdateForm, ResolveForm } from "@/components/admin/UpdateForms";
import { cardCls } from "@/components/admin/ui";
import { ComponentChip } from "@/components/status/ComponentChip";
import { ImpactChip } from "@/components/status/ImpactChip";
import { IncidentTimeline } from "@/components/status/IncidentTimeline";
import { INCIDENT_STATE_LABEL } from "@/components/status/statusMeta";
import { requireAdmin } from "@/lib/status/auth";
import { COMPONENT_BY_ID } from "@/lib/status/components";
import { getIncident } from "@/lib/status/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: getIncident(id)?.title ?? "Incident" };
}

export default async function AdminIncidentPage({ params }: Props) {
  const { id } = await params;
  await requireAdmin(`/admin/incidents/${id}`);
  const incident = getIncident(id);
  if (!incident) notFound();
  const resolved = incident.state === "resolved";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="flex flex-col gap-6">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <ImpactChip impact={incident.impact} />
            <span className="chip border-line text-muted">{INCIDENT_STATE_LABEL[incident.state]}</span>
            {incident.automatic && <span className="chip border-line text-muted">Automatic</span>}
          </div>
          <h1 className="mt-3 text-xl font-semibold leading-snug">{incident.title}</h1>
          <p className="mt-1 text-xs text-muted">
            <Link href={`/incidents/${incident.id}`} className="underline underline-offset-4 hover:text-fg">
              View public page
            </Link>
          </p>
          {incident.components.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {incident.components.map((c) => (
                <ComponentChip key={c.id} id={c.id} name={COMPONENT_BY_ID.get(c.id)?.name ?? c.id} status={c.status} />
              ))}
            </div>
          )}
        </header>
        <section className={cardCls} aria-labelledby="h-tl">
          <h2 id="h-tl" className="label mb-4">
            Timeline
          </h2>
          <IncidentTimeline updates={incident.updates} />
        </section>
        <section className={cardCls} aria-labelledby="h-edit">
          <h2 id="h-edit" className="label mb-4">
            Edit title and impact
          </h2>
          <EditIncidentForm incident={incident} />
        </section>
      </div>

      <div className="flex flex-col gap-6">
        {!resolved && (
          <section className={cardCls} aria-labelledby="h-res">
            <h2 id="h-res" className="label mb-4">
              Resolve
            </h2>
            <ResolveForm incidentId={incident.id} />
          </section>
        )}
        <section className={cardCls} aria-labelledby="h-post">
          <h2 id="h-post" className="label mb-4">
            {resolved ? "Post follow-up (reopens)" : "Post update"}
          </h2>
          <PostUpdateForm incident={incident} />
        </section>
      </div>
    </div>
  );
}
