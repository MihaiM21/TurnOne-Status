/**
 * Probe execution. Server-side only. Each probe returns a Verdict plus latency;
 * nothing here throws.
 */
import type { ComponentDef, ProbeSpec, Verdict } from "./components";
import { overrideUrl } from "./components";

export const PROBE_TIMEOUT_MS = 8000;
const USER_AGENT = "TurnOneStatus/1.0 (+https://status.t1f1.com)";

export interface ProbeOutcome {
  label: string;
  verdict: Verdict;
  /** Wall-clock latency in ms; null if no response was received. */
  latencyMs: number | null;
}

function errorReason(err: unknown): string {
  const e = err as { name?: string; code?: string; cause?: { code?: string } } | null;
  if (e?.name === "TimeoutError" || e?.name === "AbortError") return `Timed out after ${PROBE_TIMEOUT_MS / 1000}s`;
  const code = e?.cause?.code ?? e?.code;
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "DNS lookup failed";
  if (code === "ECONNREFUSED") return "Connection refused";
  if (code === "ECONNRESET") return "Connection reset";
  if (code && /CERT|SSL|TLS/i.test(code)) return "TLS error";
  if (code === "UND_ERR_CONNECT_TIMEOUT" || code === "ETIMEDOUT") return `Timed out after ${PROBE_TIMEOUT_MS / 1000}s`;
  return "Connection failed";
}

export async function runProbe(spec: ProbeSpec, urlOverride?: string): Promise<ProbeOutcome> {
  const started = performance.now();
  try {
    const res = await fetch(urlOverride ?? spec.url, {
      method: spec.method,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: spec.json ? "application/json" : "*/*",
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    let json: unknown;
    if (spec.json) {
      const text = await res.text();
      try {
        json = JSON.parse(text);
      } catch {
        json = undefined;
      }
    } else {
      // Drain/cancel the body so the socket is released.
      await res.body?.cancel().catch(() => undefined);
    }
    const latencyMs = Math.round(performance.now() - started);
    let verdict: Verdict;
    try {
      verdict = spec.expect({ status: res.status, json });
    } catch {
      verdict = { state: "fail", reason: "Unexpected response" };
    }
    return { label: spec.label, verdict, latencyMs };
  } catch (err) {
    return { label: spec.label, verdict: { state: "fail", reason: errorReason(err) }, latencyMs: null };
  }
}

/** Runs all probes of a component concurrently. First probe honours the env override. */
export async function runComponentProbes(def: ComponentDef): Promise<ProbeOutcome[]> {
  const override = overrideUrl(def.id);
  return Promise.all(def.probes.map((p, i) => runProbe(p, i === 0 ? override : undefined)));
}

// ---- version lookups (best-effort, never throw) ----------------------------

const versionCache = new Map<string, { at: number; value: string | null }>();
const VERSION_TTL_MS = 10 * 60_000;

async function cachedVersion(key: string, load: () => Promise<string | null>): Promise<string | null> {
  const hit = versionCache.get(key);
  if (hit && Date.now() - hit.at < VERSION_TTL_MS) return hit.value;
  let value: string | null = null;
  try {
    value = await load();
  } catch {
    value = hit?.value ?? null;
  }
  versionCache.set(key, { at: Date.now(), value });
  return value;
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Extra version lookup for components whose health endpoint doesn't report one. */
export async function lookupVersion(componentId: string): Promise<string | null> {
  if (componentId === "accounts") {
    return cachedVersion("accounts", async () => {
      const j = (await getJson("https://backend.turnonehub.com/api/version/current")) as { version?: unknown };
      return typeof j?.version === "string" ? j.version : null;
    });
  }
  if (componentId === "turn-one-link") {
    return cachedVersion("link", async () => {
      const j = (await getJson("https://backend.turnonehub.com/api/simracing/link/release")) as Record<
        string,
        unknown
      >;
      if (j?.available !== true) return null;
      const v = j.version ?? j.latestVersion ?? j.versionNumber;
      return typeof v === "string" && /\d/.test(v) ? v : null;
    });
  }
  return null;
}
