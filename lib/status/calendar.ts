/**
 * F1 calendar via T1API. Response shapes are undocumented, so the parser is
 * defensive and the raw shape is logged once in dev. Returns null without
 * T1API_KEY or on any error.
 */
import type { F1Session } from "./types";

const API = "https://api.t1f1.com/api/v2";
const HOUR = 3_600_000;
const FALLBACK_SESSION_MS = 2 * HOUR;
const LONG_TTL_MS = HOUR;
const SHORT_TTL_MS = 30_000;
const BOUNDARY_WINDOW_MS = 5 * 60_000;

interface Cached {
  at: number;
  ttl: number;
  session: { eventName: string; sessionName: string; start: number; end: number | null } | null;
}
const g = globalThis as unknown as { __t1Calendar?: Cached; __t1CalendarLogged?: boolean };

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);

function logShape(label: string, raw: unknown) {
  if (process.env.NODE_ENV === "production" || g.__t1CalendarLogged) return;
  g.__t1CalendarLogged = true;
  const sample = Array.isArray(raw) ? raw.slice(0, 2) : raw;
  console.info(`[status/calendar] raw ${label} shape:`, JSON.stringify(sample)?.slice(0, 1500));
}

/** Unwraps `[...]`, `{events:[...]}`, `{data:[...]}`, `{sessions:[...]}` etc. */
function toArray(raw: unknown, keys: string[]): Rec[] {
  if (Array.isArray(raw)) return raw.filter(isRec);
  if (isRec(raw)) {
    for (const k of [...keys, "data", "items", "results"]) {
      const v = raw[k];
      if (Array.isArray(v)) return v.filter(isRec);
      if (isRec(v)) {
        const inner = toArray(v, keys);
        if (inner.length) return inner;
      }
    }
  }
  return [];
}

function pickString(r: Rec, keys: string[]): string | null {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickTime(r: Rec, keys: string[]): number | null {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string") {
      // Dates without a zone are treated as UTC.
      const s = /[zZ]|[+-]\d\d:?\d\d$/.test(v) || !/T|\d:\d/.test(v) ? v : `${v}Z`;
      const t = Date.parse(s);
      if (!Number.isNaN(t)) return t;
    } else if (typeof v === "number" && v > 1e9) {
      return v < 1e12 ? v * 1000 : v;
    }
  }
  return null;
}

const EVENT_NAME_KEYS = ["event_name", "EventName", "eventName", "name", "official_event_name", "OfficialEventName", "title"];
const EVENT_START_KEYS = ["date_start", "event_date", "EventDate", "date", "start", "start_date", "startDate", "Session1DateUtc", "Session1Date"];
const EVENT_END_KEYS = ["date_end", "end_date", "endDate", "end", "Session5DateUtc", "Session5Date"];
const SESSION_NAME_KEYS = ["session_name", "SessionName", "sessionName", "name", "session", "session_type", "type", "title"];
const SESSION_START_KEYS = ["date_start", "start", "start_time", "startTime", "starts_at", "startsAt", "date_utc", "date", "session_date"];
const SESSION_END_KEYS = ["date_end", "end", "end_time", "endTime", "ends_at", "endsAt"];

interface ParsedEvent {
  name: string;
  start: number | null;
  end: number | null;
}

function parseEvents(raw: unknown): ParsedEvent[] {
  return toArray(raw, ["events", "races", "schedule"])
    .map((r) => ({
      name: pickString(r, EVENT_NAME_KEYS) ?? "",
      start: pickTime(r, EVENT_START_KEYS),
      end: pickTime(r, EVENT_END_KEYS),
    }))
    .filter((e) => e.name);
}

interface ParsedSession {
  name: string;
  start: number;
  end: number | null;
}

function parseSessions(raw: unknown): ParsedSession[] {
  const out: ParsedSession[] = [];
  for (const r of toArray(raw, ["sessions"])) {
    const name = pickString(r, SESSION_NAME_KEYS);
    const start = pickTime(r, SESSION_START_KEYS);
    if (name && start != null) out.push({ name, start, end: pickTime(r, SESSION_END_KEYS) });
  }
  if (out.length) return out;
  // FastF1-style flat event record: Session1..Session5 + Session1Date..Session5Date
  const flat = isRec(raw) ? (toArray(raw, ["sessions"])[0] ?? raw) : null;
  if (flat) {
    for (let i = 1; i <= 5; i++) {
      const name = pickString(flat, [`Session${i}`]);
      const start = pickTime(flat, [`Session${i}DateUtc`, `Session${i}Date`]);
      if (name && start != null) out.push({ name, start, end: null });
    }
  }
  return out;
}

async function fetchJson(url: string, key: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "X-API-Key": key, Accept: "application/json", "User-Agent": "TurnOneStatus/1.0 (+https://status.t1f1.com)" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadNextSession(key: string, now: number): Promise<Cached["session"]> {
  const year = new Date(now).getUTCFullYear();
  for (const y of [year, year + 1]) {
    const raw = await fetchJson(`${API}/seasons/${y}/events`, key);
    logShape(`events(${y})`, raw);
    const events = parseEvents(raw)
      .filter((e) => (e.end ?? (e.start != null ? e.start + 4 * 24 * HOUR : Infinity)) >= now)
      .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
    // Try upcoming events in order until one has a session that hasn't ended.
    for (const ev of events.slice(0, 3)) {
      const sraw = await fetchJson(`${API}/seasons/${y}/events/${encodeURIComponent(ev.name)}/sessions`, key);
      logShape(`sessions(${ev.name})`, sraw);
      const sessions = parseSessions(sraw).sort((a, b) => a.start - b.start);
      const next = sessions.find((s) => (s.end ?? s.start + FALLBACK_SESSION_MS) > now);
      if (next) {
        return { eventName: ev.name, sessionName: next.name, start: next.start, end: next.end };
      }
    }
  }
  return null;
}

function ttlFor(session: Cached["session"], now: number): number {
  if (!session) return LONG_TTL_MS;
  const end = session.end ?? session.start + FALLBACK_SESSION_MS;
  const nearStart = Math.abs(now - session.start) < BOUNDARY_WINDOW_MS;
  const nearEnd = Math.abs(now - end) < BOUNDARY_WINDOW_MS;
  const live = now >= session.start && now < end;
  return nearStart || nearEnd || live ? SHORT_TTL_MS : LONG_TTL_MS;
}

function toF1Session(c: NonNullable<Cached["session"]>, now: number): F1Session {
  const end = c.end ?? c.start + FALLBACK_SESSION_MS;
  return {
    eventName: c.eventName,
    sessionName: c.sessionName,
    startsAt: new Date(c.start).toISOString(),
    endsAt: c.end != null ? new Date(c.end).toISOString() : null,
    live: now >= c.start && now < end,
  };
}

export async function getF1Session(now = Date.now()): Promise<F1Session | null> {
  const key = process.env.T1API_KEY;
  if (!key) return null;
  const cached = g.__t1Calendar;
  const expired =
    !cached ||
    now - cached.at > cached.ttl ||
    (cached.session != null && now >= (cached.session.end ?? cached.session.start + FALLBACK_SESSION_MS));
  if (expired) {
    try {
      const session = await loadNextSession(key, now);
      g.__t1Calendar = { at: now, ttl: ttlFor(session, now), session };
    } catch (err) {
      // Keep the failure cached briefly so we don't hammer the API.
      g.__t1Calendar = { at: now, ttl: SHORT_TTL_MS, session: null };
      if (process.env.NODE_ENV !== "production") console.info("[status/calendar] failed:", String(err));
    }
  }
  const s = g.__t1Calendar?.session;
  return s ? toF1Session(s, now) : null;
}

export function pollSecondsFor(session: F1Session | null): number {
  return session?.live ? 10 : 30;
}
