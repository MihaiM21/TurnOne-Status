/**
 * The component registry: what we monitor, in public display order, and how
 * each probe decides pass / degraded / fail.
 */
import type { GroupId, SubCheck } from "./types";

export interface ProbeResponse {
  status: number;
  /** Parsed JSON body, or undefined when the body was not JSON. */
  json: unknown;
}

export interface Verdict {
  state: "ok" | "degraded" | "fail";
  reason?: string;
  version?: string | null;
  subchecks?: SubCheck[];
}

export interface ProbeSpec {
  label: string;
  url: string;
  method: "GET" | "POST";
  /** Latency above this makes the component degraded. */
  degradedMs: number;
  /** Whether a JSON body is needed (read + parsed). */
  json?: boolean;
  expect: (r: ProbeResponse) => Verdict;
}

export interface ComponentDef {
  id: string;
  name: string;
  group: GroupId;
  description: string;
  beta: boolean;
  probes: ProbeSpec[];
  derivedFrom: string[];
}

export const GROUPS: { id: GroupId; name: string }[] = [
  { id: "sim", name: "Sim Racing" },
  { id: "f1", name: "Formula 1" },
  { id: "platform", name: "Platform" },
  { id: "developers", name: "Developers" },
];

const BACKEND = "https://backend.turnonehub.com";
const WEB = "https://turnonehub.com";
const NEGOTIATE_MS = 1500;
const API_MS = 2000;
const PAGE_MS = 3000;

const ok = (extra: Partial<Verdict> = {}): Verdict => ({ state: "ok", ...extra });
const fail = (reason: string): Verdict => ({ state: "fail", reason });
const http = (status: number) => fail(`HTTP ${status}`);

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function lower(v: unknown): string {
  return typeof v === "string" ? v.toLowerCase() : "";
}

const negotiate = (label: string, url: string): ProbeSpec => ({
  label,
  url,
  method: "POST",
  degradedMs: NEGOTIATE_MS,
  expect: (r) => (r.status === 401 || r.status === 200 ? ok() : http(r.status)),
});

const leaderboards: ProbeSpec = {
  label: "leaderboards",
  url: `${BACKEND}/api/telemetry/leaderboards`,
  method: "GET",
  json: true,
  degradedMs: API_MS,
  expect: (r) => {
    if (r.status !== 200) return http(r.status);
    return Array.isArray(r.json) ? ok() : fail("Unexpected response");
  },
};

/** Maps an upstream sub-status string to our three states. */
function subState(v: unknown): SubCheck["state"] {
  const s = lower(v);
  if (["healthy", "ok", "running", "ready", "connected", "up"].includes(s)) return "ok";
  if (["degraded", "warn", "warning", "slow"].includes(s)) return "warn";
  return "fail";
}

function t1apiProbe(url: string): ProbeSpec {
  return {
    label: "health",
    url,
    method: "GET",
    json: true,
    degradedMs: API_MS,
    expect: (r) => {
      if (r.status !== 200) return http(r.status);
      const j = obj(r.json);
      const checks = obj(j?.checks);
      if (!j || !checks) return fail("Unexpected response");
      const subchecks: SubCheck[] = [];
      let reason: string | undefined;
      for (const [name, value] of Object.entries(checks)) {
        if (name === "environment") continue;
        if (name === "processed_sessions") {
          subchecks.push({ name, state: "ok", value: String(value) });
          continue;
        }
        const good = name === "background_processor" ? lower(value) === "running" : lower(value) === "healthy";
        subchecks.push({ name, state: good ? "ok" : "warn", value: String(value) });
        if (!good && !reason) {
          reason = name === "mongodb" ? "mongodb: unreachable" : `${name}: ${String(value)}`;
        }
      }
      const version = str(j.version);
      if (reason) return { state: "degraded", reason, version, subchecks };
      if (lower(j.status) === "degraded") {
        return { state: "degraded", reason: "Reporting degraded", version, subchecks };
      }
      return { state: "ok", version, subchecks };
    },
  };
}

export const COMPONENTS: ComponentDef[] = [
  {
    id: "sim-telemetry",
    name: "Live Telemetry",
    group: "sim",
    description: "Game → Link → browser, ~100 Hz",
    beta: false,
    derivedFrom: [],
    probes: [negotiate("telemetry hub", `${BACKEND}/api/hubs/simtelemetry/negotiate?negotiateVersion=1`)],
  },
  {
    id: "sim-sessions",
    name: "Session Uploads & History",
    group: "sim",
    description: "Saving laps, history, leaderboards",
    beta: false,
    derivedFrom: [],
    probes: [
      {
        label: "ready",
        url: `${BACKEND}/health/ready`,
        method: "GET",
        json: true,
        degradedMs: API_MS,
        expect: (r) => {
          if (r.status !== 200) return http(r.status);
          const j = obj(r.json);
          if (!j || lower(j.status) !== "ready") return fail("Unexpected response");
          if (lower(j.database) !== "connected") return fail("database: unreachable");
          return ok({ subchecks: [{ name: "database", state: "ok", value: String(j.database) }] });
        },
      },
      leaderboards,
    ],
  },
  {
    id: "ai-coaching",
    name: "AI Coaching",
    group: "sim",
    description: "Post-session tips from your laps",
    beta: false,
    derivedFrom: [],
    probes: [
      {
        label: "coaching tips",
        url: `${BACKEND}/api/coaching/sessions/00000000-0000-0000-0000-000000000000/tips`,
        method: "GET",
        degradedMs: API_MS,
        expect: (r) => (r.status === 401 ? ok() : http(r.status)),
      },
    ],
  },
  {
    id: "stream-overlays",
    name: "Stream Overlays",
    group: "sim",
    description: "OBS browser-source overlays",
    beta: false,
    derivedFrom: [],
    probes: [
      {
        label: "overlay page",
        url: `${WEB}/overlay/test/leaderboard`,
        method: "GET",
        degradedMs: PAGE_MS,
        expect: (r) => (r.status === 200 ? ok() : http(r.status)),
      },
      leaderboards,
    ],
  },
  {
    id: "turn-one-link",
    name: "Turn One Link",
    group: "sim",
    description:
      "Desktop app for ACC, iRacing, F1 25",
    beta: false,
    derivedFrom: ["sim-telemetry", "sim-sessions"],
    probes: [],
  },
  {
    id: "f1-live-timing",
    name: "Live Timing",
    group: "f1",
    description: "Timing tower, gaps, tyres, sectors",
    beta: false,
    derivedFrom: [],
    probes: [
      {
        label: "relay status",
        url: `${BACKEND}/api/F1LiveTiming/status`,
        method: "GET",
        json: true,
        degradedMs: API_MS,
        expect: (r) => {
          if (r.status !== 200) return http(r.status);
          return obj(r.json)?.available === true ? ok() : fail("Live timing relay unavailable");
        },
      },
      negotiate("live data hub", `${BACKEND}/hubs/f1livedata/negotiate?negotiateVersion=1`),
    ],
  },
  {
    id: "web-app",
    name: "Web App",
    group: "platform",
    description: "turnonehub.com",
    beta: false,
    derivedFrom: [],
    probes: [
      {
        label: "health",
        url: `${WEB}/api/health`,
        method: "GET",
        json: true,
        degradedMs: API_MS,
        expect: (r) => {
          if (r.status !== 200) return http(r.status);
          const j = obj(r.json);
          if (!j || lower(j.status) !== "healthy") return fail("Unexpected response");
          const mem = obj(j.memory);
          const subchecks: SubCheck[] = [];
          if (mem && typeof mem.used === "number" && typeof mem.total === "number") {
            subchecks.push({
              name: "memory",
              state: "ok",
              value: `${Math.round(mem.used)} / ${Math.round(mem.total)} MB`,
            });
          }
          return ok({ version: str(j.version), subchecks });
        },
      },
    ],
  },
  {
    id: "accounts",
    name: "Accounts & Sign-in",
    group: "platform",
    description: "Login, profiles, coins, rewards",
    beta: false,
    derivedFrom: [],
    probes: [
      {
        label: "backend health",
        url: `${BACKEND}/health`,
        method: "GET",
        json: true,
        degradedMs: API_MS,
        expect: (r) => {
          const j = obj(r.json);
          if (r.status !== 200 && !(r.status === 503 && lower(j?.status) === "degraded")) {
            return http(r.status);
          }
          if (!j) return fail("Unexpected response");
          const checks = obj(j.checks);
          const subchecks: SubCheck[] = [];
          const db = obj(checks?.database);
          if (db) subchecks.push({ name: "database", state: subState(db.status), value: String(db.status) });
          const mem = obj(checks?.memory);
          if (mem) {
            subchecks.push({
              name: "memory",
              state: subState(mem.status),
              value: typeof mem.usageMB === "number" ? `${mem.usageMB} MB` : String(mem.status),
            });
          }
          if (r.status === 503 || lower(j.status) !== "healthy") {
            const bad = subchecks.find((s) => s.state !== "ok");
            return {
              state: "degraded",
              reason: bad ? `${bad.name}: ${bad.value}` : "Reporting degraded",
              subchecks,
            };
          }
          return ok({ subchecks });
        },
      },
    ],
  },
  {
    id: "api-prod",
    name: "T1API",
    group: "developers",
    description: "api.t1f1.com",
    beta: false,
    derivedFrom: [],
    probes: [t1apiProbe("https://api.t1f1.com/api/health")],
  },
  {
    id: "api-dev",
    name: "T1API (dev)",
    group: "developers",
    description: "apidev.t1f1.com · next release",
    beta: true,
    derivedFrom: [],
    probes: [t1apiProbe("https://apidev.t1f1.com/api/health")],
  },
  {
    id: "docs",
    name: "Documentation",
    group: "developers",
    description: "docs.t1f1.com",
    beta: false,
    derivedFrom: [],
    probes: [
      {
        label: "docs site",
        url: "https://docs.t1f1.com",
        method: "GET",
        degradedMs: PAGE_MS,
        expect: (r) => (r.status >= 200 && r.status < 400 ? ok() : http(r.status)),
      },
    ],
  },
];

export const COMPONENT_BY_ID = new Map(COMPONENTS.map((c) => [c.id, c]));

export function overrideUrl(id: string): string | undefined {
  const key = `STATUS_PROBE_OVERRIDE_${id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  return process.env[key] || undefined;
}
