/**
 * Typed CRUD for incidents, incident updates and maintenance windows.
 * The admin UI is built on these helpers; the scheduler uses them for
 * automatic incidents.
 */
import { randomBytes } from "node:crypto";
import { getDb } from "./db";
import type {
  ComponentStatus,
  Incident,
  IncidentImpact,
  IncidentState,
  IncidentUpdate,
  Maintenance,
  MaintenanceState,
} from "./types";

const newId = (prefix: string) => `${prefix}_${randomBytes(6).toString("hex")}`;
const iso = (ms: number) => new Date(ms).toISOString();
const toMs = (v: string | number | Date): number => (typeof v === "number" ? v : new Date(v).getTime());

// ---- incidents -------------------------------------------------------------

interface IncidentRow {
  id: string;
  title: string;
  impact: string;
  state: string;
  components_json: string;
  created_at: number;
  resolved_at: number | null;
  automatic: number;
}
interface UpdateRow {
  id: string;
  incident_id: string;
  state: string;
  body: string;
  created_at: number;
}

function updatesFor(ids: string[]): Map<string, IncidentUpdate[]> {
  const map = new Map<string, IncidentUpdate[]>();
  if (ids.length === 0) return map;
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM incident_updates WHERE incident_id IN (${ids.map(() => "?").join(",")})
       ORDER BY created_at DESC, rowid DESC`,
    )
    .all(...ids) as unknown as UpdateRow[];
  for (const r of rows) {
    const list = map.get(r.incident_id) ?? [];
    list.push({ id: r.id, state: r.state as IncidentState, body: r.body, createdAt: iso(r.created_at) });
    map.set(r.incident_id, list);
  }
  return map;
}

function hydrate(rows: IncidentRow[]): Incident[] {
  const updates = updatesFor(rows.map((r) => r.id));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    impact: r.impact as IncidentImpact,
    state: r.state as IncidentState,
    components: JSON.parse(r.components_json) as Incident["components"],
    updates: updates.get(r.id) ?? [],
    createdAt: iso(r.created_at),
    resolvedAt: r.resolved_at == null ? null : iso(r.resolved_at),
    automatic: r.automatic === 1,
  }));
}

export interface CreateIncidentInput {
  id?: string;
  title: string;
  impact: IncidentImpact;
  components: { id: string; status: ComponentStatus }[];
  /** Body of the first update. */
  body: string;
  state?: IncidentState;
  automatic?: boolean;
  createdAt?: string | number;
}

export function createIncident(input: CreateIncidentInput): Incident {
  const db = getDb();
  const id = input.id ?? newId("inc");
  const now = input.createdAt != null ? toMs(input.createdAt) : Date.now();
  const state = input.state ?? "investigating";
  db.prepare(
    `INSERT INTO incidents (id, title, impact, state, components_json, created_at, resolved_at, automatic)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.title,
    input.impact,
    state,
    JSON.stringify(input.components),
    now,
    state === "resolved" ? now : null,
    input.automatic ? 1 : 0,
  );
  db.prepare(
    `INSERT INTO incident_updates (id, incident_id, state, body, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(newId("upd"), id, state, input.body, now);
  return getIncident(id)!;
}

export interface UpdateIncidentInput {
  title?: string;
  impact?: IncidentImpact;
  components?: { id: string; status: ComponentStatus }[];
}

/** Edit incident metadata (not its timeline). Returns null if unknown. */
export function updateIncident(id: string, patch: UpdateIncidentInput): Incident | null {
  const cur = getIncident(id);
  if (!cur) return null;
  getDb()
    .prepare(`UPDATE incidents SET title = ?, impact = ?, components_json = ? WHERE id = ?`)
    .run(
      patch.title ?? cur.title,
      patch.impact ?? cur.impact,
      JSON.stringify(patch.components ?? cur.components),
      id,
    );
  return getIncident(id);
}

/** Post a timeline update and move the incident to `state`. "resolved" stamps resolvedAt. */
export function addIncidentUpdate(
  incidentId: string,
  input: { state: IncidentState; body: string; createdAt?: string | number },
): { incident: Incident; update: IncidentUpdate } | null {
  const db = getDb();
  const cur = getIncident(incidentId);
  if (!cur) return null;
  const now = input.createdAt != null ? toMs(input.createdAt) : Date.now();
  const updateId = newId("upd");
  db.prepare(
    `INSERT INTO incident_updates (id, incident_id, state, body, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(updateId, incidentId, input.state, input.body, now);
  db.prepare(`UPDATE incidents SET state = ?, resolved_at = ? WHERE id = ?`).run(
    input.state,
    input.state === "resolved" ? (cur.resolvedAt ? toMs(cur.resolvedAt) : now) : null,
    incidentId,
  );
  const incident = getIncident(incidentId)!;
  return { incident, update: incident.updates.find((u) => u.id === updateId)! };
}

export function getIncident(id: string): Incident | null {
  const row = getDb().prepare(`SELECT * FROM incidents WHERE id = ?`).get(id) as unknown as IncidentRow | undefined;
  return row ? hydrate([row])[0] : null;
}

/** Unresolved incidents, newest first. */
export function listActiveIncidents(): Incident[] {
  const rows = getDb()
    .prepare(`SELECT * FROM incidents WHERE state != 'resolved' ORDER BY created_at DESC`)
    .all() as unknown as IncidentRow[];
  return hydrate(rows);
}

/** Resolved incidents from the last `days` days, newest first. */
export function listRecentIncidents(days = 14, limit = 100): Incident[] {
  const since = Date.now() - days * 86_400_000;
  const rows = getDb()
    .prepare(
      `SELECT * FROM incidents WHERE state = 'resolved' AND resolved_at >= ?
       ORDER BY resolved_at DESC LIMIT ?`,
    )
    .all(since, limit) as unknown as IncidentRow[];
  return hydrate(rows);
}

/** All incidents (any state), newest first, paginated. Used by /incidents. */
export function listIncidentsPage(limit: number, offset: number): Incident[] {
  const rows = getDb()
    .prepare(`SELECT * FROM incidents ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?`)
    .all(limit, offset) as unknown as IncidentRow[];
  return hydrate(rows);
}

export function countIncidents(): number {
  const r = getDb().prepare(`SELECT COUNT(*) AS n FROM incidents`).get() as unknown as { n: number };
  return Number(r.n);
}

/** Incidents (any state) that overlap [fromMs, toMs]. Used for the 90-day strip. */
export function listIncidentsOverlapping(fromMs: number, toMsValue: number): Incident[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM incidents WHERE created_at <= ? AND (resolved_at IS NULL OR resolved_at >= ?)
       ORDER BY created_at DESC`,
    )
    .all(toMsValue, fromMs) as unknown as IncidentRow[];
  return hydrate(rows);
}

// ---- maintenance -----------------------------------------------------------

interface MaintenanceRow {
  id: string;
  title: string;
  body: string;
  state: string;
  component_ids_json: string;
  scheduled_start: number;
  scheduled_end: number;
}

export function maintenanceStateAt(startMs: number, endMs: number, now = Date.now()): MaintenanceState {
  if (now < startMs) return "scheduled";
  if (now < endMs) return "in_progress";
  return "completed";
}

function hydrateMaintenance(r: MaintenanceRow, now = Date.now()): Maintenance {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    state: maintenanceStateAt(r.scheduled_start, r.scheduled_end, now),
    componentIds: JSON.parse(r.component_ids_json) as string[],
    scheduledStart: iso(r.scheduled_start),
    scheduledEnd: iso(r.scheduled_end),
  };
}

export interface MaintenanceInput {
  title: string;
  body: string;
  componentIds: string[];
  scheduledStart: string | number;
  scheduledEnd: string | number;
}

export function createMaintenance(input: MaintenanceInput & { id?: string }): Maintenance {
  const id = input.id ?? newId("mnt");
  const start = toMs(input.scheduledStart);
  const end = toMs(input.scheduledEnd);
  getDb()
    .prepare(
      `INSERT INTO maintenance (id, title, body, state, component_ids_json, scheduled_start, scheduled_end)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.title, input.body, maintenanceStateAt(start, end), JSON.stringify(input.componentIds), start, end);
  return getMaintenance(id)!;
}

export function updateMaintenance(id: string, patch: Partial<MaintenanceInput>): Maintenance | null {
  const cur = getMaintenance(id);
  if (!cur) return null;
  const start = toMs(patch.scheduledStart ?? cur.scheduledStart);
  const end = toMs(patch.scheduledEnd ?? cur.scheduledEnd);
  getDb()
    .prepare(
      `UPDATE maintenance SET title = ?, body = ?, state = ?, component_ids_json = ?,
       scheduled_start = ?, scheduled_end = ? WHERE id = ?`,
    )
    .run(
      patch.title ?? cur.title,
      patch.body ?? cur.body,
      maintenanceStateAt(start, end),
      JSON.stringify(patch.componentIds ?? cur.componentIds),
      start,
      end,
      id,
    );
  return getMaintenance(id);
}

export function deleteMaintenance(id: string): boolean {
  const r = getDb().prepare(`DELETE FROM maintenance WHERE id = ?`).run(id);
  return Number(r.changes) > 0;
}

export function getMaintenance(id: string): Maintenance | null {
  const row = getDb().prepare(`SELECT * FROM maintenance WHERE id = ?`).get(id) as unknown as
    | MaintenanceRow
    | undefined;
  return row ? hydrateMaintenance(row) : null;
}

/** In-progress first, then upcoming within `withinDays`, by start time. */
export function listActiveMaintenance(withinDays = 30, now = Date.now()): Maintenance[] {
  const horizon = now + withinDays * 86_400_000;
  const rows = getDb()
    .prepare(`SELECT * FROM maintenance WHERE scheduled_end > ? AND scheduled_start <= ? ORDER BY scheduled_start ASC`)
    .all(now, horizon) as unknown as MaintenanceRow[];
  const list = rows.map((r) => hydrateMaintenance(r, now));
  return [...list.filter((m) => m.state === "in_progress"), ...list.filter((m) => m.state === "scheduled")];
}

/** Completed windows from the last `days` days, newest first. */
export function listRecentMaintenance(days = 14, now = Date.now()): Maintenance[] {
  const rows = getDb()
    .prepare(`SELECT * FROM maintenance WHERE scheduled_end <= ? AND scheduled_end >= ? ORDER BY scheduled_end DESC`)
    .all(now, now - days * 86_400_000) as unknown as MaintenanceRow[];
  return rows.map((r) => hydrateMaintenance(r, now));
}

/** Raw windows overlapping [fromMs, toMs]; rollups use these to count maintenance as up. */
export function maintenanceWindows(fromMs: number, toMsValue: number): { componentIds: string[]; start: number; end: number }[] {
  const rows = getDb()
    .prepare(`SELECT * FROM maintenance WHERE scheduled_start < ? AND scheduled_end > ?`)
    .all(toMsValue, fromMs) as unknown as MaintenanceRow[];
  return rows.map((r) => ({
    componentIds: JSON.parse(r.component_ids_json) as string[],
    start: r.scheduled_start,
    end: r.scheduled_end,
  }));
}
