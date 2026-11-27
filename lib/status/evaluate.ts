/**
 * Turns raw probe outcomes into a component result, and applies the
 * consecutive-failure debounce.
 */
import type { ComponentDef } from "./components";
import type { ProbeOutcome } from "./probes";
import type { ComponentStatus, SubCheck } from "./types";
import { STATUS_SEVERITY } from "./types";

/** What the probes say, before debounce. */
export interface RawResult {
  kind: "pass" | "degraded" | "fail";
  reason: string | null;
  latencyMs: number | null;
  version: string | null;
  subchecks: SubCheck[];
}

/** One recorded check (post-debounce). */
export interface CheckResult {
  status: ComponentStatus;
  ok: boolean;
  latencyMs: number | null;
  reason: string | null;
  version: string | null;
  subchecks: SubCheck[];
}

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Combine all probes of one component: fail > degraded > pass. */
export function evaluateComponent(def: ComponentDef, outcomes: ProbeOutcome[]): RawResult {
  const worst: { kind: RawResult["kind"]; reason: string | null } = { kind: "pass", reason: null };
  let version: string | null = null;
  const subchecks: SubCheck[] = [];
  let latency: number | null = null;

  const bump = (k: RawResult["kind"], r: string | null) => {
    const rank = { pass: 0, degraded: 1, fail: 2 } as const;
    if (rank[k] > rank[worst.kind]) {
      worst.kind = k;
      worst.reason = r;
    }
  };

  outcomes.forEach((o, i) => {
    const spec = def.probes[i];
    if (o.latencyMs != null) latency = Math.max(latency ?? 0, o.latencyMs);
    if (o.verdict.version && !version) version = o.verdict.version;
    if (o.verdict.subchecks) subchecks.push(...o.verdict.subchecks);
    if (o.verdict.state === "fail") {
      bump("fail", o.verdict.reason ?? "Unexpected response");
    } else if (o.verdict.state === "degraded") {
      bump("degraded", o.verdict.reason ?? "Reporting degraded");
    } else if (spec && o.latencyMs != null && o.latencyMs > spec.degradedMs) {
      bump("degraded", `Slow response (${formatSeconds(o.latencyMs)})`);
    }
  });

  return {
    kind: worst.kind,
    reason: worst.reason,
    latencyMs: worst.kind === "fail" ? null : latency,
    version,
    subchecks,
  };
}

// ---- debounce ---------------------------------------------------------------

export interface DebounceState {
  fails: number;
  passes: number;
  /** True after a failure until two consecutive non-failures have been seen. */
  recovering: boolean;
}

export const FAILS_TO_DOWN = 2;
export const PASSES_TO_RECOVER = 2;
export const INTERMITTENT_REASON = "Intermittent failure (retrying)";

export function freshDebounce(): DebounceState {
  return { fails: 0, passes: 0, recovering: false };
}

/** Seed from the last stored check so a restart doesn't reset the debounce. */
export function seedDebounce(last: { status: string; reason: string | null } | undefined): DebounceState {
  const s = freshDebounce();
  if (!last) return s;
  if (last.status === "major_outage") return { fails: FAILS_TO_DOWN, passes: 0, recovering: true };
  if (last.status === "degraded" && last.reason && last.reason.startsWith("Intermittent")) {
    return { fails: 1, passes: 0, recovering: true };
  }
  if (last.status === "degraded" && last.reason === "Recovering") {
    return { fails: 0, passes: 1, recovering: true };
  }
  return s;
}

/** Mutates `state`, returns the debounced check to record. */
export function applyDebounce(state: DebounceState, raw: RawResult): CheckResult {
  const base = { latencyMs: raw.latencyMs, version: raw.version, subchecks: raw.subchecks };
  if (raw.kind === "fail") {
    state.fails += 1;
    state.passes = 0;
    state.recovering = true;
    if (state.fails >= FAILS_TO_DOWN) {
      return { ...base, status: "major_outage", ok: false, reason: raw.reason };
    }
    return { ...base, status: "degraded", ok: false, reason: INTERMITTENT_REASON };
  }
  state.fails = 0;
  state.passes += 1;
  if (state.recovering && state.passes < PASSES_TO_RECOVER) {
    // Not trusted yet: stay degraded until two clean checks in a row.
    return { ...base, status: "degraded", ok: true, reason: raw.reason ?? "Recovering" };
  }
  state.recovering = false;
  if (raw.kind === "degraded") return { ...base, status: "degraded", ok: true, reason: raw.reason };
  return { ...base, status: "operational", ok: true, reason: null };
}

export function worstOf(statuses: ComponentStatus[]): ComponentStatus {
  let worst: ComponentStatus = "operational";
  for (const s of statuses) if (STATUS_SEVERITY[s] > STATUS_SEVERITY[worst]) worst = s;
  return worst;
}
