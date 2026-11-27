/**
 * Admin logic as plain functions (validate -> write -> notify -> invalidate).
 * The Server Actions in app/admin/actions.ts are thin wrappers around these.
 * No next/* imports here so scripts can call them directly.
 */
import { clearSummaryCache } from "./cache";
import { COMPONENT_BY_ID } from "./components";
import { notifyDiscord, notifyIncident } from "./discord";
import {
  addIncidentUpdate,
  createIncident,
  createMaintenance,
  deleteMaintenance,
  getIncident,
  getMaintenance,
  updateIncident,
  updateMaintenance,
} from "./store";
import type { ComponentStatus, Incident, Maintenance } from "./types";

import {
  DEFAULT_RESOLVE_BODY,
  FORCED_STATUSES,
  IMPACTS,
  MAX_BODY,
  MAX_TITLE,
  OPEN_STATES,
  UPDATE_STATES,
} from "../../components/admin/constants";

export * from "../../components/admin/constants";

export type FieldErrors = Record<string, string>;
export type Result<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

const fail = (errors: FieldErrors): { ok: false; errors: FieldErrors } => ({ ok: false, errors });

// ---- field validators ------------------------------------------------------

function text(v: unknown, field: string, max: number, errors: FieldErrors, label: string): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) errors[field] = `${label} is required.`;
  else if (s.length > max) errors[field] = `${label} must be ${max} characters or fewer (now ${s.length}).`;
  return s;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], field: string, errors: FieldErrors, label: string): T {
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) return v as T;
  errors[field] = `Choose a valid ${label}.`;
  return allowed[0];
}

export interface RawComponent {
  id: string;
  status: string;
}

/** Pulls `comp` checkboxes + `status_<id>` selects out of a form. */
export function componentsFromForm(fd: FormData): RawComponent[] {
  return fd
    .getAll("comp")
    .filter((v): v is string => typeof v === "string")
    .map((id) => ({ id, status: String(fd.get(`status_${id}`) ?? "") }));
}

function checkComponents(list: RawComponent[], errors: FieldErrors): { id: string; status: ComponentStatus }[] {
  const out: { id: string; status: ComponentStatus }[] = [];
  const seen = new Set<string>();
  for (const c of list) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    if (!COMPONENT_BY_ID.has(c.id)) {
      errors.components = `Unknown component "${c.id}".`;
    } else if (!(FORCED_STATUSES as string[]).includes(c.status)) {
      errors.components = `Choose degraded, partial outage or major outage for ${COMPONENT_BY_ID.get(c.id)!.name}.`;
    } else {
      out.push({ id: c.id, status: c.status as ComponentStatus });
    }
  }
  return out;
}

function checkComponentIds(ids: string[], errors: FieldErrors): string[] {
  const out: string[] = [];
  for (const id of new Set(ids)) {
    if (!COMPONENT_BY_ID.has(id)) errors.components = `Unknown component "${id}".`;
    else out.push(id);
  }
  return out;
}

/** "YYYY-MM-DDTHH:mm" interpreted as UTC -> epoch ms, or null. */
export function parseUtcLocal(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const d = new Date(ms);
  // Reject rollovers like 2026-02-31.
  if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  return ms;
}

// ---- incidents -------------------------------------------------------------

export interface IncidentRaw {
  title?: unknown;
  impact?: unknown;
  state?: unknown;
  body?: unknown;
  components?: RawComponent[];
  discord?: boolean;
}

export async function createIncidentAdmin(raw: IncidentRaw): Promise<Result<Incident>> {
  const errors: FieldErrors = {};
  const title = text(raw.title, "title", MAX_TITLE, errors, "Title");
  const impact = oneOf(raw.impact, IMPACTS, "impact", errors, "impact");
  const state = oneOf(raw.state, OPEN_STATES, "state", errors, "state");
  const body = text(raw.body, "body", MAX_BODY, errors, "The first update");
  const components = checkComponents(raw.components ?? [], errors);
  if (Object.keys(errors).length) return fail(errors);

  const incident = createIncident({ title, impact, state, body, components });
  clearSummaryCache();
  if (raw.discord) await notifyIncident(incident, incident.updates[0]);
  return { ok: true, data: incident };
}

export async function postIncidentUpdate(id: string, raw: IncidentRaw): Promise<Result<Incident>> {
  const errors: FieldErrors = {};
  if (!getIncident(id)) return fail({ form: "Incident not found." });
  const state = oneOf(raw.state, UPDATE_STATES, "state", errors, "state");
  const body = text(raw.body, "body", MAX_BODY, errors, "The update");
  const components = checkComponents(raw.components ?? [], errors);
  if (Object.keys(errors).length) return fail(errors);

  updateIncident(id, { components });
  const res = addIncidentUpdate(id, { state, body });
  if (!res) return fail({ form: "Incident not found." });
  clearSummaryCache();
  if (raw.discord) await notifyIncident(res.incident, res.update);
  return { ok: true, data: res.incident };
}

export async function resolveIncident(id: string, body: unknown, discord: boolean): Promise<Result<Incident>> {
  const errors: FieldErrors = {};
  if (!getIncident(id)) return fail({ form: "Incident not found." });
  const raw = typeof body === "string" && body.trim() ? body : DEFAULT_RESOLVE_BODY;
  const clean = text(raw, "body", MAX_BODY, errors, "The update");
  if (Object.keys(errors).length) return fail(errors);
  const res = addIncidentUpdate(id, { state: "resolved", body: clean });
  if (!res) return fail({ form: "Incident not found." });
  clearSummaryCache();
  if (discord) await notifyIncident(res.incident, res.update);
  return { ok: true, data: res.incident };
}

export function editIncident(id: string, raw: { title?: unknown; impact?: unknown }): Result<Incident> {
  const errors: FieldErrors = {};
  if (!getIncident(id)) return fail({ form: "Incident not found." });
  const title = text(raw.title, "title", MAX_TITLE, errors, "Title");
  const impact = oneOf(raw.impact, IMPACTS, "impact", errors, "impact");
  if (Object.keys(errors).length) return fail(errors);
  const incident = updateIncident(id, { title, impact });
  if (!incident) return fail({ form: "Incident not found." });
  clearSummaryCache();
  return { ok: true, data: incident };
}

// ---- maintenance -----------------------------------------------------------

export interface MaintenanceRaw {
  title?: unknown;
  body?: unknown;
  componentIds?: string[];
  /** "YYYY-MM-DDTHH:mm", interpreted as UTC. */
  start?: unknown;
  end?: unknown;
  discord?: boolean;
}

function checkMaintenance(raw: MaintenanceRaw, errors: FieldErrors) {
  const title = text(raw.title, "title", MAX_TITLE, errors, "Title");
  const body = text(raw.body, "body", MAX_BODY, errors, "Description");
  const componentIds = checkComponentIds(raw.componentIds ?? [], errors);
  const start = parseUtcLocal(raw.start);
  const end = parseUtcLocal(raw.end);
  if (start === null) errors.start = "Enter a valid UTC start.";
  if (end === null) errors.end = "Enter a valid UTC end.";
  if (start !== null && end !== null && end <= start) errors.end = "End must be after start.";
  return { title, body, componentIds, start: start ?? 0, end: end ?? 0 };
}

export async function createMaintenanceAdmin(raw: MaintenanceRaw): Promise<Result<Maintenance>> {
  const errors: FieldErrors = {};
  const v = checkMaintenance(raw, errors);
  if (Object.keys(errors).length) return fail(errors);
  const m = createMaintenance({
    title: v.title,
    body: v.body,
    componentIds: v.componentIds,
    scheduledStart: v.start,
    scheduledEnd: v.end,
  });
  clearSummaryCache();
  if (raw.discord) await notifyMaintenance(m, "Maintenance scheduled");
  return { ok: true, data: m };
}

export function updateMaintenanceAdmin(id: string, raw: MaintenanceRaw): Result<Maintenance> {
  const errors: FieldErrors = {};
  if (!getMaintenance(id)) return fail({ form: "Maintenance window not found." });
  const v = checkMaintenance(raw, errors);
  if (Object.keys(errors).length) return fail(errors);
  const m = updateMaintenance(id, {
    title: v.title,
    body: v.body,
    componentIds: v.componentIds,
    scheduledStart: v.start,
    scheduledEnd: v.end,
  });
  if (!m) return fail({ form: "Maintenance window not found." });
  clearSummaryCache();
  return { ok: true, data: m };
}

/** Cancel = delete the window. */
export function cancelMaintenance(id: string): boolean {
  const ok = deleteMaintenance(id);
  clearSummaryCache();
  return ok;
}

/** Ends an in-progress window now. Scheduled windows must be cancelled or edited instead. */
export function completeMaintenanceEarly(id: string, now = Date.now()): Result<Maintenance> {
  const cur = getMaintenance(id);
  if (!cur) return fail({ form: "Maintenance window not found." });
  if (cur.state !== "in_progress") return fail({ form: "Only a window that is in progress can be completed early." });
  const m = updateMaintenance(id, { scheduledEnd: now });
  clearSummaryCache();
  return { ok: true, data: m! };
}

async function notifyMaintenance(m: Maintenance, heading: string): Promise<void> {
  await notifyDiscord({
    title: `${heading}: ${m.title}`,
    description: m.body,
    status: "maintenance",
    fields: [
      { name: "Starts (UTC)", value: m.scheduledStart.slice(0, 16).replace("T", " "), inline: true },
      { name: "Ends (UTC)", value: m.scheduledEnd.slice(0, 16).replace("T", " "), inline: true },
      { name: "Components", value: m.componentIds.join(", ") || "none" },
    ],
  });
}
