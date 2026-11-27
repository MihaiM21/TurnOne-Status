/** Deterministic formatting helpers. Everything here is timezone-explicit so
 *  server and client render identically unless the "local" variant is used. */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

/** "Thu 26 Nov" from a YYYY-MM-DD string (UTC). */
export function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "26 Nov" (UTC). */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "HH:MM" (UTC). */
export function formatHM(iso: string | number): string {
  const d = new Date(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "26 Nov, 11:00 UTC". */
export function formatUtc(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${formatHM(iso)} UTC`;
}

/** "26 Nov, 13:00" in the viewer's timezone (client only, after mount). */
export function formatLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Seconds -> "40s", "40m", "1h 12m". */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return rm ? `${h}h ${rm}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

/** Relative time: "12s ago" / "in 5m". */
export function formatRelative(targetMs: number, nowMs: number): string {
  const diff = Math.round((targetMs - nowMs) / 1000);
  const abs = Math.abs(diff);
  if (abs < 5) return "just now";
  const body = formatDuration(abs);
  return diff < 0 ? `${body} ago` : `in ${body}`;
}

/** Countdown clock: "6d 04:12:09" or "04:12:09". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return d > 0 ? `${d}d ${hms}` : hms;
}

export function formatPct(p: number | null, digits = 3): string {
  return p === null ? "—" : `${p.toFixed(digits)}%`;
}

export function formatMs(ms: number | null): string {
  return ms === null ? "—" : `${Math.round(ms)} ms`;
}
