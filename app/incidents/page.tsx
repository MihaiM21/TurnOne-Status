import type { Metadata } from "next";
import Link from "next/link";
import { ComponentChip } from "@/components/status/ComponentChip";
import { ImpactChip } from "@/components/status/ImpactChip";
import { PageShell } from "@/components/status/PageShell";
import { formatDuration, formatHM, formatShortDate, formatUtc } from "@/components/status/format";
import { INCIDENT_STATE_LABEL } from "@/components/status/statusMeta";
import { COMPONENT_BY_ID } from "@/lib/status/components";
import { countIncidents, listIncidentsPage, listRecentMaintenance } from "@/lib/status/store";
import type { Incident } from "@/lib/status/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Incident history",
  description: "Every incident and maintenance window on Turn One services.",
};

const PAGE_SIZE = 25;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Props = { searchParams: Promise<{ page?: string | string[] }> };

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function durationOf(i: Incident): string {
  if (!i.resolvedAt) return "ongoing";
  return formatDuration((new Date(i.resolvedAt).getTime() - new Date(i.createdAt).getTime()) / 1000);
}

export default async function IncidentsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const total = countIncidents();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(raw ?? "1", 10) || 1));
  const incidents = listIncidentsPage(PAGE_SIZE, (page - 1) * PAGE_SIZE);
  const maintenance = page === 1 ? listRecentMaintenance(365) : [];

  const groups: { month: string; items: Incident[] }[] = [];
  for (const i of incidents) {
    const m = monthKey(i.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.month === m) last.items.push(i);
    else groups.push({ month: m, items: [i] });
  }

  return (
    <PageShell>
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="display text-[36px] font-bold leading-none sm:text-[44px]">Incident history</h1>
        <p className="mt-1.5 text-sm text-muted">
          <span className="num">{total}</span> incident{total === 1 ? "" : "s"} on record. Times are UTC.
        </p>
      </header>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-line bg-card p-5 text-sm text-muted">No incidents have been recorded.</p>
      ) : (
        groups.map((g) => (
          <section key={g.month} aria-label={g.month}>
            <h2 className="label mb-3">{g.month}</h2>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {g.items.map((i) => (
                <li key={i.id} className="rounded-xl border border-line bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <ImpactChip impact={i.impact} />
                    <span className="chip border-line text-muted">{INCIDENT_STATE_LABEL[i.state]}</span>
                    {i.automatic && (
                      <span className="chip border-line text-muted" title="Opened automatically by the monitoring engine">
                        Automatic
                      </span>
                    )}
                    <span className="num ml-auto text-xs text-muted">
                      {formatUtc(i.createdAt)} · {durationOf(i)}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-[15px] font-semibold leading-snug">
                    <Link href={`/incidents/${i.id}`} className="hover:underline hover:underline-offset-4">
                      {i.title}
                    </Link>
                  </h3>
                  {i.components.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {i.components.map((c) => (
                        <ComponentChip
                          key={c.id}
                          id={c.id}
                          name={COMPONENT_BY_ID.get(c.id)?.name ?? c.id}
                          status={c.status}
                        />
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={`/incidents?page=${page - 1}`} className="t-fast text-muted hover:text-fg">
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="num text-xs text-muted">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={`/incidents?page=${page + 1}`} className="t-fast text-muted hover:text-fg">
              Older
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      {maintenance.length > 0 && (
        <section aria-labelledby="h-maint">
          <h2 id="h-maint" className="label mb-3">
            Completed maintenance · last 365 days
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {maintenance.map((m) => (
              <li key={m.id} className="rounded-xl border border-line bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip border-line text-muted">Maintenance</span>
                  <span className="num ml-auto text-xs text-muted">
                    {formatShortDate(m.scheduledStart)}, {formatHM(m.scheduledStart)} to {formatHM(m.scheduledEnd)} UTC
                  </span>
                </div>
                <h3 className="mt-2.5 text-[15px] font-semibold">{m.title}</h3>
                {m.body && <p className="mt-1 text-sm leading-relaxed text-[#c9c9c9]">{m.body}</p>}
                {m.componentIds.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {m.componentIds.map((id) => (
                      <ComponentChip key={id} id={id} name={COMPONENT_BY_ID.get(id)?.name ?? id} />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
    </PageShell>
  );
}
