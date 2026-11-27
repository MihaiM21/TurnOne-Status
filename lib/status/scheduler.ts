/**
 * The probe loop. startScheduler() is idempotent (globalThis guard); a tick
 * never throws. Each tick: probe -> store -> rollups -> prune -> transitions.
 */
import { clearSummaryCache } from "./cache";
import { getF1Session } from "./calendar";
import { COMPONENTS, type ComponentDef } from "./components";
import { notifyDiscord, notifyIncident } from "./discord";
import {
  applyDebounce,
  evaluateComponent,
  freshDebounce,
  seedDebounce,
  worstOf,
  type CheckResult,
  type DebounceState,
} from "./evaluate";
import { insertCheck, lastChecks, pruneOld, updateRecentRollups } from "./history";
import { lookupVersion, runComponentProbes } from "./probes";
import { addIncidentUpdate, createIncident, listActiveIncidents } from "./store";
import type { ComponentStatus } from "./types";

const NORMAL_INTERVAL_MS = 60_000;
const LIVE_INTERVAL_MS = 20_000;
const PRUNE_EVERY_MS = 60 * 60_000;

interface SchedulerState {
  started: boolean;
  startedAt: number;
  lastTickAt: number | null;
  lastPruneAt: number;
  running: boolean;
  seeded: boolean;
  debounce: Map<string, DebounceState>;
  timer: ReturnType<typeof setTimeout> | null;
}

const g = globalThis as unknown as { __t1Scheduler?: SchedulerState };

function state(): SchedulerState {
  if (!g.__t1Scheduler) {
    g.__t1Scheduler = {
      started: false,
      startedAt: Date.now(),
      lastTickAt: null,
      lastPruneAt: 0,
      running: false,
      seeded: false,
      debounce: new Map(),
      timer: null,
    };
  }
  return g.__t1Scheduler;
}

export function getSchedulerInfo(): { startedAt: number; lastTickAt: number | null; started: boolean } {
  const s = state();
  return { startedAt: s.startedAt, lastTickAt: s.lastTickAt, started: s.started };
}

function seed(s: SchedulerState) {
  if (s.seeded) return;
  for (const def of COMPONENTS) {
    if (def.derivedFrom.length > 0) continue;
    s.debounce.set(def.id, seedDebounce(lastChecks(def.id, 1)[0]));
  }
  s.seeded = true;
}

function isDerived(def: ComponentDef): boolean {
  return def.derivedFrom.length > 0;
}

function deriveResult(def: ComponentDef, results: Map<string, CheckResult>, version: string | null): CheckResult {
  const deps = def.derivedFrom.map((id) => ({ id, r: results.get(id) })).filter((d) => d.r) as {
    id: string;
    r: CheckResult;
  }[];
  const down = deps.filter((d) => d.r.status === "major_outage" || d.r.status === "partial_outage");
  let status: ComponentStatus;
  if (down.length > 0 && down.length === deps.length) status = "major_outage";
  else if (down.length > 0) status = "partial_outage";
  else status = worstOf(deps.map((d) => d.r.status));
  const bad = deps.find((d) => d.r.status !== "operational");
  const latencies = deps.map((d) => d.r.latencyMs).filter((v): v is number => v != null);
  const depName = (id: string) => COMPONENTS.find((c) => c.id === id)?.name ?? id;
  return {
    status,
    ok: status === "operational",
    latencyMs: status === "major_outage" || latencies.length === 0 ? null : Math.max(...latencies),
    reason: bad ? `${depName(bad.id)}: ${bad.r.reason ?? "unavailable"}` : null,
    version,
    subchecks: deps.map((d) => ({
      name: depName(d.id),
      state: d.r.status === "operational" ? "ok" : d.r.status === "degraded" ? "warn" : "fail",
      value: d.r.status === "operational" ? "operational" : (d.r.reason ?? d.r.status),
    })),
  };
}

async function handleTransitions(s: SchedulerState, results: Map<string, CheckResult>) {
  const active = listActiveIncidents();

  // Open
  for (const def of COMPONENTS) {
    const r = results.get(def.id);
    if (!r || r.status !== "major_outage" || def.beta) continue;
    if (active.some((i) => i.components.some((c) => c.id === def.id))) continue;
    const incident = createIncident({
      title: `${def.name} is unavailable`,
      impact: "major",
      components: [{ id: def.id, status: "major_outage" }],
      body: `Our monitoring detected that ${def.name} is not responding (${r.reason ?? "no response"}). We are investigating.`,
      state: "investigating",
      automatic: true,
    });
    active.push(incident);
    await notifyDiscord({
      title: `${def.name} is unavailable`,
      description: incident.updates[0]?.body,
      status: "major_outage",
      incidentId: incident.id,
    });
  }

  // Resolve
  for (const inc of active) {
    if (!inc.automatic || inc.state === "resolved") continue;
    const recovered = inc.components.every((c) => {
      const r = results.get(c.id);
      if (!r) return false;
      const recovering = s.debounce.get(c.id)?.recovering ?? false;
      return r.status === "operational" || (r.status === "degraded" && !recovering);
    });
    if (!recovered) continue;
    const names = inc.components.map((c) => COMPONENTS.find((d) => d.id === c.id)?.name ?? c.id);
    const res = addIncidentUpdate(inc.id, {
      state: "resolved",
      body: `${names.join(", ")} has recovered.`,
    });
    if (res) await notifyIncident(res.incident, res.update);
  }
}

/** One full probe cycle. Never throws. */
export async function runTick(): Promise<void> {
  const s = state();
  if (s.running) return;
  s.running = true;
  try {
    seed(s);
    const now = Date.now();
    const results = new Map<string, CheckResult>();

    await Promise.all(
      COMPONENTS.filter((d) => !isDerived(d)).map(async (def) => {
        const outcomes = await runComponentProbes(def);
        const raw = evaluateComponent(def, outcomes);
        if (!raw.version && raw.kind !== "fail") raw.version = await lookupVersion(def.id);
        let deb = s.debounce.get(def.id);
        if (!deb) {
          deb = freshDebounce();
          s.debounce.set(def.id, deb);
        }
        results.set(def.id, applyDebounce(deb, raw));
      }),
    );

    for (const def of COMPONENTS.filter(isDerived)) {
      const version = await lookupVersion(def.id).catch(() => null);
      results.set(def.id, deriveResult(def, results, version));
    }

    for (const def of COMPONENTS) {
      const r = results.get(def.id);
      if (r) insertCheck(def.id, now, r);
    }
    s.lastTickAt = now;

    try {
      updateRecentRollups(COMPONENTS.map((c) => c.id), now);
    } catch (err) {
      console.error("[status] rollup failed", err);
    }
    if (now - s.lastPruneAt > PRUNE_EVERY_MS) {
      s.lastPruneAt = now;
      try {
        pruneOld(now);
      } catch (err) {
        console.error("[status] prune failed", err);
      }
    }
    try {
      await handleTransitions(s, results);
    } catch (err) {
      console.error("[status] transitions failed", err);
    }
    clearSummaryCache();
  } catch (err) {
    console.error("[status] tick failed", err);
  } finally {
    s.running = false;
  }
}

async function loop() {
  const s = state();
  await runTick();
  let live = false;
  try {
    live = (await getF1Session())?.live ?? false;
  } catch {
    /* ignore */
  }
  s.timer = setTimeout(() => void loop(), live ? LIVE_INTERVAL_MS : NORMAL_INTERVAL_MS);
  s.timer.unref?.();
}

/** Idempotent. Runs the first tick immediately, then every 60 s (20 s during a live F1 session). */
export function startScheduler(): void {
  if (process.env.STATUS_DISABLE_SCHEDULER === "1") return;
  // `next build` imports server modules and runs instrumentation; never probe or write the DB then.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const s = state();
  if (s.started) return;
  s.started = true;
  s.startedAt = Date.now();
  void loop();
}
