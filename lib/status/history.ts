/**
 * Raw check storage, daily rollups and retention.
 */
import { getDb } from "./db";
import type { CheckResult } from "./evaluate";
import { maintenanceWindows } from "./store";
import type { ComponentStatus, SubCheck } from "./types";
import { STATUS_SEVERITY } from "./types";

const DAY_MS = 86_400_000;
export const RAW_RETENTION_DAYS = 30;
export const ROLLUP_RETENTION_DAYS = 400;
/** Nominal interval; a check never represents more than 3x this. */
export const BASE_INTERVAL_MS = 60_000;
const MAX_WEIGHT_MS = 3 * BASE_INTERVAL_MS;

export interface CheckRow {
  componentId: string;
  t: number;
  ok: boolean;
  status: ComponentStatus;
  latencyMs: number | null;
  reason: string | null;
  version: string | null;
  subchecks: SubCheck[];
}

interface RawCheckRow {
  component_id: string;
  t: number;
  ok: number;
  status: string;
  latency_ms: number | null;
  reason: string | null;
  version: string | null;
  subchecks_json: string;
}

function toRow(r: RawCheckRow): CheckRow {
  let subchecks: SubCheck[] = [];
  try {
    subchecks = JSON.parse(r.subchecks_json) as SubCheck[];
  } catch {
    /* ignore */
  }
  return {
    componentId: r.component_id,
    t: r.t,
    ok: r.ok === 1,
    status: r.status as ComponentStatus,
    latencyMs: r.latency_ms,
    reason: r.reason,
    version: r.version,
    subchecks,
  };
}

export function insertCheck(componentId: string, t: number, c: CheckResult): void {
  getDb()
    .prepare(
      `INSERT INTO checks (component_id, t, ok, status, latency_ms, reason, version, subchecks_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(componentId, t, c.ok ? 1 : 0, c.status, c.latencyMs, c.reason, c.version, JSON.stringify(c.subchecks));
}

/** Newest first. */
export function lastChecks(componentId: string, n: number): CheckRow[] {
  const rows = getDb()
    .prepare(`SELECT * FROM checks WHERE component_id = ? ORDER BY t DESC, id DESC LIMIT ?`)
    .all(componentId, n) as unknown as RawCheckRow[];
  return rows.map(toRow);
}

export function hasAnyChecks(): boolean {
  return getDb().prepare(`SELECT 1 AS x FROM checks LIMIT 1`).get() !== undefined;
}

export function lastCheckTime(): number | null {
  const r = getDb().prepare(`SELECT MAX(t) AS t FROM checks`).get() as unknown as { t: number | null };
  return r.t;
}

export function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function dayStart(key: string): number {
  return Date.parse(`${key}T00:00:00.000Z`);
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[idx];
}

/** Recompute one component's rollup for one UTC day from raw checks. */
export function recomputeRollup(componentId: string, day: string, now = Date.now()): void {
  const db = getDb();
  const start = dayStart(day);
  const end = start + DAY_MS;
  const rows = db
    .prepare(
      `SELECT t, status, ok, latency_ms FROM checks WHERE component_id = ? AND t >= ? AND t < ? ORDER BY t, id`,
    )
    .all(componentId, start, end) as unknown as { t: number; status: string; ok: number; latency_ms: number | null }[];
  if (rows.length === 0) return;

  const windows = maintenanceWindows(start, end).filter((w) => w.componentIds.includes(componentId));
  const dayEnd = Math.min(end, now);

  let total = 0;
  let degraded = 0;
  let down = 0;
  let worst: ComponentStatus = "operational";
  const latencies: number[] = [];

  rows.forEach((r, i) => {
    const next = i + 1 < rows.length ? rows[i + 1].t : dayEnd;
    const weight = Math.max(0, Math.min(next - r.t, MAX_WEIGHT_MS));
    let status = r.status as ComponentStatus;
    if (windows.some((w) => r.t >= w.start && r.t < w.end)) status = "maintenance";
    total += weight;
    if (status === "degraded") degraded += weight;
    if (status === "partial_outage" || status === "major_outage") down += weight;
    if (STATUS_SEVERITY[status] > STATUS_SEVERITY[worst]) worst = status;
    if (r.ok === 1 && r.latency_ms != null) latencies.push(r.latency_ms);
  });
  latencies.sort((a, b) => a - b);

  db.prepare(
    `INSERT INTO daily_rollups (component_id, day, total_s, degraded_s, down_s, worst, p50_ms, p95_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(component_id, day) DO UPDATE SET total_s = excluded.total_s, degraded_s = excluded.degraded_s,
       down_s = excluded.down_s, worst = excluded.worst, p50_ms = excluded.p50_ms, p95_ms = excluded.p95_ms`,
  ).run(componentId, day, total / 1000, degraded / 1000, down / 1000, worst, percentile(latencies, 0.5), percentile(latencies, 0.95));
}

/** Cheap per-tick refresh: today and yesterday. */
export function updateRecentRollups(componentIds: string[], now = Date.now()): void {
  const today = dayKey(now);
  const yesterday = dayKey(now - DAY_MS);
  for (const id of componentIds) {
    recomputeRollup(id, yesterday, now);
    recomputeRollup(id, today, now);
  }
}

export interface RollupRow {
  componentId: string;
  day: string;
  totalS: number;
  degradedS: number;
  downS: number;
  worst: ComponentStatus;
}

export function loadRollups(sinceDay: string): RollupRow[] {
  const rows = getDb()
    .prepare(`SELECT * FROM daily_rollups WHERE day >= ?`)
    .all(sinceDay) as unknown as {
    component_id: string;
    day: string;
    total_s: number;
    degraded_s: number;
    down_s: number;
    worst: string;
  }[];
  return rows.map((r) => ({
    componentId: r.component_id,
    day: r.day,
    totalS: r.total_s,
    degradedS: r.degraded_s,
    downS: r.down_s,
    worst: r.worst as ComponentStatus,
  }));
}

export function pruneOld(now = Date.now()): { checks: number; rollups: number } {
  const db = getDb();
  const c = db.prepare(`DELETE FROM checks WHERE t < ?`).run(now - RAW_RETENTION_DAYS * DAY_MS);
  const r = db
    .prepare(`DELETE FROM daily_rollups WHERE day < ?`)
    .run(dayKey(now - ROLLUP_RETENTION_DAYS * DAY_MS));
  return { checks: Number(c.changes), rollups: Number(r.changes) };
}
