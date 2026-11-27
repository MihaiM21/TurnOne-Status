/**
 * The status contract. WP1 (engine) produces these shapes; WP2 (UI) and the
 * public JSON API (`/api/status`) consume them. Change this file first, then
 * both sides — never let the UI and the engine drift.
 *
 * All timestamps are ISO-8601 UTC strings so the shape is JSON-safe.
 */

/** Automatic + manual states a component can be in. Order = severity (low → high). */
export type ComponentStatus =
  | "operational"
  | "maintenance"
  | "degraded"
  | "partial_outage"
  | "major_outage";

/** Severity order, used for "worst of" roll-ups. */
export const STATUS_SEVERITY: Record<ComponentStatus, number> = {
  operational: 0,
  maintenance: 1,
  degraded: 2,
  partial_outage: 3,
  major_outage: 4,
};

export type GroupId = "sim" | "f1" | "platform" | "developers";

export type IncidentImpact = "none" | "minor" | "major" | "critical";
export type IncidentState = "investigating" | "identified" | "monitoring" | "resolved";
export type MaintenanceState = "scheduled" | "in_progress" | "completed";

/** One sub-check reported by a service's own health endpoint (mongodb, database, memory…). */
export interface SubCheck {
  name: string;
  /** "ok" | "warn" | "fail" — normalised from whatever the upstream reported. */
  state: "ok" | "warn" | "fail";
  /** Raw upstream value, shown as-is (e.g. "running", "healthy", "412 MB"). */
  value: string;
}

/** One day of the 90-day uptime strip. */
export interface UptimeDay {
  /** YYYY-MM-DD (UTC). */
  date: string;
  /** 0..100, null when there is no data for that day (before monitoring began). */
  uptimePct: number | null;
  /** Worst status observed that day; null when no data. */
  worst: ComponentStatus | null;
  /** Seconds spent not operational (degraded or worse). */
  downtimeSeconds: number;
  /** Incident ids that touched this component on this day. */
  incidentIds: string[];
}

/** One point of a latency series. */
export interface LatencyPoint {
  /** ISO timestamp of the check. */
  t: string;
  /** Milliseconds, null when the check failed (no response). */
  ms: number | null;
  ok: boolean;
}

export interface ComponentSummary {
  id: string;
  name: string;
  group: GroupId;
  description: string;
  /** Shown as a BETA tag. */
  beta: boolean;
  /** Effective status after manual overrides (incident / maintenance). */
  status: ComponentStatus;
  /** What the probes alone say, before overrides. */
  autoStatus: ComponentStatus;
  /** Latest successful latency in ms, null if the last check failed or none yet. */
  latencyMs: number | null;
  /** Version reported by the upstream health endpoint, if any. */
  version: string | null;
  /** Last 60 checks, oldest first (sparkline). */
  spark: LatencyPoint[];
  /** Exactly 90 entries, oldest first, ending today (UTC). */
  uptime90: UptimeDay[];
  /** Uptime over the 90 days that have data, 0..100 with 2-3 decimals; null if no data yet. */
  uptimePct: number | null;
  subchecks: SubCheck[];
  /** ISO timestamp of the last probe, null if never probed. */
  lastCheckedAt: string | null;
  /** Ids of components this one is derived from (e.g. Turn One Link). Empty for probed components. */
  derivedFrom: string[];
  /** Short human reason when not operational ("HTTP 503", "mongodb unreachable", "timeout after 8s"). */
  reason: string | null;
}

export interface GroupSummary {
  id: GroupId;
  name: string;
  /** Worst effective status among its non-beta components. */
  status: ComponentStatus;
  components: ComponentSummary[];
}

export interface IncidentUpdate {
  id: string;
  state: IncidentState;
  body: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  title: string;
  impact: IncidentImpact;
  state: IncidentState;
  /** Component ids affected and the status forced on each while unresolved. */
  components: { id: string; status: ComponentStatus }[];
  /** Newest first. */
  updates: IncidentUpdate[];
  createdAt: string;
  resolvedAt: string | null;
  /** true when opened by the probe engine rather than by a human. */
  automatic: boolean;
}

export interface Maintenance {
  id: string;
  title: string;
  body: string;
  state: MaintenanceState;
  componentIds: string[];
  scheduledStart: string;
  scheduledEnd: string;
}

/** Next/current F1 session — secondary strip. Null when no T1API_KEY or calendar unavailable. */
export interface F1Session {
  eventName: string; // "Abu Dhabi Grand Prix"
  sessionName: string; // "Practice 1"
  startsAt: string;
  endsAt: string | null;
  /** True while the live-timing relay reports an active session. */
  live: boolean;
}

export interface StatusSummary {
  /** Worst effective status across all public components. */
  overall: ComponentStatus;
  generatedAt: string;
  groups: GroupSummary[];
  /** Unresolved incidents, newest first. */
  activeIncidents: Incident[];
  /** Resolved incidents from the last 14 days, newest first. */
  recentIncidents: Incident[];
  /** In-progress first, then upcoming (scheduled) by start time. */
  maintenance: Maintenance[];
  f1: F1Session | null;
  /** Seconds the client should wait before polling again (30 normally, 10 during a live session). */
  pollSeconds: number;
}
