/** Client-safe admin constants (no server imports): shared by forms and lib/status/admin.ts. */
import type { ComponentStatus, IncidentImpact, IncidentState } from "../../lib/status/types";

export const MAX_TITLE = 120;
export const MAX_BODY = 4000;

export const IMPACTS: IncidentImpact[] = ["none", "minor", "major", "critical"];
export const OPEN_STATES: Exclude<IncidentState, "resolved">[] = ["investigating", "identified", "monitoring"];
export const UPDATE_STATES: IncidentState[] = ["investigating", "identified", "monitoring", "resolved"];
export const FORCED_STATUSES: ComponentStatus[] = ["degraded", "partial_outage", "major_outage"];
export const DEFAULT_RESOLVE_BODY = "This incident has been resolved.";

/** ISO -> value for <input type="datetime-local"> (UTC). */
export const toUtcInput = (iso: string) => iso.slice(0, 16);
