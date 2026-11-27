/**
 * Entry point the UI and /api/status call. Builds the StatusSummary contract
 * from the SQLite store; cached in memory for 5 s.
 */
import { getCachedSummary, setCachedSummary } from "./cache";
import { getF1Session, pollSecondsFor } from "./calendar";
import { COMPONENTS, GROUPS, type ComponentDef } from "./components";
import { worstOf } from "./evaluate";
import { dayKey, lastChecks, loadRollups } from "./history";
import { startScheduler } from "./scheduler";
import { listActiveIncidents, listActiveMaintenance, listIncidentsOverlapping, listRecentIncidents } from "./store";
import type {
  ComponentStatus,
  ComponentSummary,
  GroupSummary,
  Incident,
  LatencyPoint,
  Maintenance,
  StatusSummary,
  UptimeDay,
} from "./types";

const DAY_MS = 86_400_000;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

function buildUptime(
  def: ComponentDef,
  days: string[],
  rollups: Map<string, ReturnType<typeof loadRollups>[number]>,
  incidents: Incident[],
): { uptime90: UptimeDay[]; uptimePct: number | null } {
  let sumTotal = 0;
  let sumDown = 0;
  const mine = incidents.filter((i) => i.components.some((c) => c.id === def.id));
  const uptime90 = days.map((date): UptimeDay => {
    const r = rollups.get(`${def.id}|${date}`);
    const start = Date.parse(`${date}T00:00:00.000Z`);
    const incidentIds = mine
      .filter((i) => {
        const created = Date.parse(i.createdAt);
        const resolved = i.resolvedAt ? Date.parse(i.resolvedAt) : Infinity;
        return created < start + DAY_MS && resolved >= start;
      })
      .map((i) => i.id);
    if (!r || r.totalS <= 0) {
      return { date, uptimePct: null, worst: null, downtimeSeconds: 0, incidentIds };
    }
    sumTotal += r.totalS;
    sumDown += r.downS;
    return {
      date,
      uptimePct: round3(((r.totalS - r.downS) / r.totalS) * 100),
      worst: r.worst,
      downtimeSeconds: Math.round(r.degradedS + r.downS),
      incidentIds,
    };
  });
  return { uptime90, uptimePct: sumTotal > 0 ? round3(((sumTotal - sumDown) / sumTotal) * 100) : null };
}

async function build(now: number): Promise<StatusSummary> {
  const today = new Date(now);
  const days = Array.from({ length: 90 }, (_, i) => dayKey(now - (89 - i) * DAY_MS));
  const rollups = new Map(loadRollups(days[0]).map((r) => [`${r.componentId}|${r.day}`, r]));
  const firstDayMs = Date.parse(`${days[0]}T00:00:00.000Z`);
  const overlapping = listIncidentsOverlapping(firstDayMs, now);
  const active = listActiveIncidents();
  const recent = listRecentIncidents(14);
  const maintenance: Maintenance[] = listActiveMaintenance(30, now);
  const inProgress = maintenance.filter((m) => m.state === "in_progress");
  const f1 = await getF1Session(now).catch(() => null);

  const components = new Map<string, ComponentSummary>();
  for (const def of COMPONENTS) {
    const rows = lastChecks(def.id, 60); // newest first
    const latest = rows[0];
    const autoStatus: ComponentStatus = latest?.status ?? "operational";
    let status = autoStatus;
    for (const inc of active) {
      for (const c of inc.components) if (c.id === def.id) status = worstOf([status, c.status]);
    }
    if (status === "operational" && inProgress.some((m) => m.componentIds.includes(def.id))) {
      status = "maintenance";
    }
    const spark: LatencyPoint[] = rows
      .slice()
      .reverse()
      .map((r) => ({ t: new Date(r.t).toISOString(), ms: r.ok ? r.latencyMs : null, ok: r.ok }));
    const { uptime90, uptimePct } = buildUptime(def, days, rollups, overlapping);
    components.set(def.id, {
      id: def.id,
      name: def.name,
      group: def.group,
      description: def.description,
      beta: def.beta,
      status,
      autoStatus,
      latencyMs: latest?.ok ? latest.latencyMs : null,
      version: latest?.version ?? null,
      spark,
      uptime90,
      uptimePct,
      subchecks: latest?.subchecks ?? [],
      lastCheckedAt: latest ? new Date(latest.t).toISOString() : null,
      derivedFrom: def.derivedFrom,
      reason: status === "operational" ? null : (latest?.reason ?? null),
    });
  }

  const groups: GroupSummary[] = GROUPS.map((gr) => {
    const list = COMPONENTS.filter((d) => d.group === gr.id).map((d) => components.get(d.id)!);
    // Beta components show their own state but never colour the group (or the overall headline).
    const counted = list.filter((c) => !c.beta);
    return {
      id: gr.id,
      name: gr.name,
      status: worstOf((counted.length ? counted : list).map((c) => c.status)),
      components: list,
    };
  }).filter((gr) => gr.components.length > 0);

  // The headline is proportional: one component down (say, docs) is a partial outage for
  // the platform, not a major one. "Major outage" only when half or more are down.
  const publicStatuses = COMPONENTS.filter((d) => !d.beta).map((d) => components.get(d.id)!.status);
  const worst = worstOf(publicStatuses);
  const downCount = publicStatuses.filter((s) => s === "major_outage").length;
  const overall: ComponentStatus =
    worst === "major_outage" && downCount * 2 < publicStatuses.length ? "partial_outage" : worst;

  return {
    overall,
    generatedAt: today.toISOString(),
    groups,
    activeIncidents: active,
    recentIncidents: recent,
    maintenance,
    f1,
    pollSeconds: pollSecondsFor(f1),
  };
}

export async function getStatusSummary(): Promise<StatusSummary> {
  startScheduler();
  const cached = getCachedSummary();
  if (cached) return cached;
  const summary = await build(Date.now());
  setCachedSummary(summary);
  return summary;
}

/** Single component lookup for /components/[id]. */
export async function getComponentSummary(id: string) {
  const s = await getStatusSummary();
  for (const g of s.groups) {
    const c = g.components.find((x) => x.id === id);
    if (c) return { component: c, summary: s };
  }
  return null;
}
