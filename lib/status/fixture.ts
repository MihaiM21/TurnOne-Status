/**
 * Deterministic sample StatusSummary for UI work, tests and Storybook-style previews.
 * Never used in production code paths — only when STATUS_FIXTURE=1 or in dev previews.
 * Deterministic on purpose: no Math.random, so server and client render the same thing.
 */
import type {
  ComponentStatus,
  ComponentSummary,
  GroupId,
  LatencyPoint,
  StatusSummary,
  UptimeDay,
} from "./types";

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const DAY = 86_400_000;

function days(seed: number, now: number): UptimeDay[] {
  return Array.from({ length: 90 }, (_, i) => {
    const date = new Date(now - (89 - i) * DAY).toISOString().slice(0, 10);
    if (i < 12 && seed % 3 === 0) {
      return { date, uptimePct: null, worst: null, downtimeSeconds: 0, incidentIds: [] };
    }
    const r = hash(seed * 1000 + i);
    if (r > 0.985) {
      return { date, uptimePct: 97.2, worst: "major_outage" as const, downtimeSeconds: 2419, incidentIds: ["inc-fixture-1"] };
    }
    if (r > 0.95) {
      return { date, uptimePct: 99.6, worst: "degraded" as const, downtimeSeconds: 345, incidentIds: [] };
    }
    return { date, uptimePct: 100, worst: "operational" as const, downtimeSeconds: 0, incidentIds: [] };
  });
}

function spark(seed: number, base: number, now: number): LatencyPoint[] {
  return Array.from({ length: 60 }, (_, i) => {
    const r = hash(seed * 77 + i);
    const ok = r > 0.01;
    return {
      t: new Date(now - (59 - i) * 60_000).toISOString(),
      ms: ok ? Math.round(base * (0.8 + r * 0.6)) : null,
      ok,
    };
  });
}

function c(
  seed: number,
  id: string,
  name: string,
  group: GroupId,
  description: string,
  base: number,
  now: number,
  extra: Partial<ComponentSummary> = {},
): ComponentSummary {
  const u = days(seed, now);
  const withData = u.filter((d) => d.uptimePct !== null);
  const pct = withData.reduce((a, d) => a + (d.uptimePct ?? 0), 0) / withData.length;
  const status: ComponentStatus = extra.status ?? "operational";
  return {
    id,
    name,
    group,
    description,
    beta: false,
    status,
    autoStatus: status,
    latencyMs: base,
    version: null,
    spark: spark(seed, base, now),
    uptime90: u,
    uptimePct: Math.round(pct * 1000) / 1000,
    subchecks: [],
    lastCheckedAt: new Date(now - 12_000).toISOString(),
    derivedFrom: [],
    reason: null,
    ...extra,
  };
}

export function fixtureSummary(now = Date.UTC(2026, 10, 27, 11, 0, 0)): StatusSummary {
  const sim = [
    c(1, "sim-telemetry", "Live Telemetry", "sim", "Turn One Link → browser, ~100 Hz over SignalR", 142, now),
    c(2, "sim-sessions", "Session Uploads & History", "sim", "Saving laps from Link and reading your session history", 151, now, {
      subchecks: [
        { name: "database", state: "ok", value: "healthy" },
        { name: "memory", state: "ok", value: "446 MB" },
      ],
    }),
    c(3, "ai-coaching", "AI Coaching", "sim", "Lap analysis and coaching chat", 610, now, {
      status: "degraded",
      autoStatus: "degraded",
      reason: "Slow responses (p95 4.2s)",
    }),
    c(4, "stream-overlays", "Stream Overlays", "sim", "OBS browser-source overlays for streamers", 233, now),
    c(5, "turn-one-link", "Turn One Link", "sim", "Desktop app for ACC, AC, iRacing and F1 25/26", 0, now, {
      latencyMs: null,
      derivedFrom: ["sim-telemetry", "sim-sessions"],
    }),
  ];
  const f1 = [
    c(6, "f1-live-timing", "Live Timing", "f1", "Timing tower, gaps, tyres and sectors during F1 sessions", 385, now),
  ];
  const platform = [
    c(7, "web-app", "Web App", "platform", "turnonehub.com", 237, now, { version: "1.0.0" }),
    c(8, "accounts", "Accounts & Sign-in", "platform", "Login, profiles, coins and rewards", 150, now, { version: "1.12.1" }),
  ];
  const developers = [
    c(9, "api-prod", "T1API", "developers", "api.t1f1.com — analysis, charts and data", 390, now, {
      version: "1.7.0",
      subchecks: [
        { name: "api", state: "ok", value: "healthy" },
        { name: "mongodb", state: "ok", value: "healthy" },
        { name: "session_tracker", state: "ok", value: "healthy" },
        { name: "background_processor", state: "ok", value: "running" },
      ],
    }),
    c(10, "api-dev", "T1API (dev)", "developers", "apidev.t1f1.com — next release, may change", 283, now, {
      beta: true,
      version: "1.3.7",
    }),
    c(11, "docs", "Documentation", "developers", "docs.t1f1.com", 371, now),
  ];

  const ai = sim[2];
  return {
    overall: "degraded",
    generatedAt: new Date(now).toISOString(),
    groups: [
      { id: "sim", name: "Sim Racing", status: "degraded", components: sim },
      { id: "f1", name: "F1 Live", status: "operational", components: f1 },
      { id: "platform", name: "Platform", status: "operational", components: platform },
      { id: "developers", name: "Developers", status: "operational", components: developers },
    ],
    activeIncidents: [
      {
        id: "inc-fixture-2",
        title: "AI Coaching responses are slow",
        impact: "minor",
        state: "monitoring",
        components: [{ id: ai.id, status: "degraded" }],
        updates: [
          { id: "u3", state: "monitoring", body: "A fix is rolling out. Responses are recovering; we are watching it.", createdAt: new Date(now - 10 * 60_000).toISOString() },
          { id: "u2", state: "identified", body: "Our model provider is rate-limiting us. Switching to the fallback model.", createdAt: new Date(now - 35 * 60_000).toISOString() },
          { id: "u1", state: "investigating", body: "Coaching replies are taking longer than usual.", createdAt: new Date(now - 52 * 60_000).toISOString() },
        ],
        createdAt: new Date(now - 52 * 60_000).toISOString(),
        resolvedAt: null,
        automatic: false,
      },
    ],
    recentIncidents: [
      {
        id: "inc-fixture-1",
        title: "Live Timing unavailable at session start",
        impact: "major",
        state: "resolved",
        components: [{ id: "f1-live-timing", status: "major_outage" }],
        updates: [
          { id: "u5", state: "resolved", body: "Live timing is back. The upstream feed handshake changed; we have adapted.", createdAt: new Date(now - 3 * DAY + 40 * 60_000).toISOString() },
          { id: "u4", state: "investigating", body: "Live timing is not loading for Qualifying.", createdAt: new Date(now - 3 * DAY).toISOString() },
        ],
        createdAt: new Date(now - 3 * DAY).toISOString(),
        resolvedAt: new Date(now - 3 * DAY + 40 * 60_000).toISOString(),
        automatic: true,
      },
    ],
    maintenance: [
      {
        id: "mnt-fixture-1",
        title: "Database upgrade",
        body: "Session history will be read-only for up to 20 minutes. Live Telemetry is not affected.",
        state: "scheduled",
        componentIds: ["sim-sessions", "accounts"],
        scheduledStart: new Date(now + 2 * DAY).toISOString(),
        scheduledEnd: new Date(now + 2 * DAY + 20 * 60_000).toISOString(),
      },
    ],
    f1: {
      eventName: "Abu Dhabi Grand Prix",
      sessionName: "Practice 1",
      startsAt: new Date(now + 6 * DAY + 4 * 3_600_000 + 12 * 60_000).toISOString(),
      endsAt: null,
      live: false,
    },
    pollSeconds: 30,
  };
}
