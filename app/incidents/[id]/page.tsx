import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComponentChip } from "@/components/status/ComponentChip";
import { ImpactChip } from "@/components/status/ImpactChip";
import { PageShell } from "@/components/status/PageShell";
import { RelativeTime } from "@/components/status/RelativeTime";
import { formatDuration, formatUtc } from "@/components/status/format";
import { INCIDENT_STATE_LABEL } from "@/components/status/statusMeta";
import { COMPONENT_BY_ID } from "@/lib/status/components";
import { getIncident } from "@/lib/status/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const incident = getIncident(id);
  return { title: incident ? incident.title : "Incident not found" };
}

export default async function IncidentPage({ params }: Props) {
  const { id } = await params;
  const incident = getIncident(id);
  if (!incident) notFound();

  const start = new Date(incident.createdAt).getTime();
  const end = incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : null;
  const resolved = incident.state === "resolved";

  return (
    <PageShell>
      <article className="max-w-3xl">
        <Link href="/incidents" className="t-fast text-[13px] text-muted hover:text-fg">
          All incidents
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ImpactChip impact={incident.impact} />
          <span className="chip border-line text-muted">{INCIDENT_STATE_LABEL[incident.state]}</span>
          {incident.automatic && (
            <span className="chip border-line text-muted" title="Opened automatically by the monitoring engine">
              Automatic
            </span>
          )}
        </div>
        <h1 className="display mt-3 text-[32px] font-bold leading-[1.02] sm:text-[40px]">{incident.title}</h1>

        <dl className="mt-5 grid gap-4 rounded-xl border border-line bg-card p-4 sm:grid-cols-3 sm:p-5">
          <div>
            <dt className="label">Started</dt>
            <dd className="num mt-2 text-sm">{formatUtc(incident.createdAt)}</dd>
          </div>
          <div>
            <dt className="label">{resolved ? "Resolved" : "Status"}</dt>
            <dd className="num mt-2 text-sm">
              {incident.resolvedAt ? formatUtc(incident.resolvedAt) : "Ongoing"}
            </dd>
          </div>
          <div>
            <dt className="label">Duration</dt>
            <dd className="num mt-2 text-sm">
              {end !== null ? formatDuration((end - start) / 1000) : "ongoing"}
            </dd>
          </div>
        </dl>

        {incident.components.length > 0 && (
          <section className="mt-6" aria-labelledby="h-comp">
            <h2 id="h-comp" className="label mb-3">
              Affected components
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {incident.components.map((c) => (
                <ComponentChip
                  key={c.id}
                  id={c.id}
                  name={COMPONENT_BY_ID.get(c.id)?.name ?? c.id}
                  status={c.status}
                />
              ))}
            </div>
          </section>
        )}

        <section className="mt-8" aria-labelledby="h-tl">
          <h2 id="h-tl" className="label mb-4">
            Timeline
          </h2>
          <ol className="relative m-0 list-none p-0">
            <span aria-hidden="true" className="absolute bottom-2 left-[4px] top-2 w-px bg-line" />
            {incident.updates.map((u, i) => (
              <li key={u.id} className="relative pb-6 pl-6 last:pb-0">
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-[5px] size-[9px] rounded-full border"
                  style={{
                    borderColor: i === 0 ? "var(--fg)" : "#3a3a3a",
                    background: i === 0 ? "var(--fg)" : "var(--bg)",
                  }}
                />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[13px] font-medium">{INCIDENT_STATE_LABEL[u.state]}</span>
                  <time dateTime={u.createdAt} className="num text-xs text-fg">
                    {formatUtc(u.createdAt)}
                  </time>
                  <RelativeTime iso={u.createdAt} className="text-xs text-muted" />
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[#c9c9c9]">{u.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </article>
    </PageShell>
  );
}
