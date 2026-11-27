/** Tiny shared in-memory cache for the computed summary (5 s TTL). */
import type { StatusSummary } from "./types";

const g = globalThis as unknown as { __t1SummaryCache?: { at: number; value: StatusSummary } };
export const SUMMARY_TTL_MS = 5000;

export function getCachedSummary(now = Date.now()): StatusSummary | null {
  const c = g.__t1SummaryCache;
  return c && now - c.at < SUMMARY_TTL_MS ? c.value : null;
}

export function setCachedSummary(value: StatusSummary, now = Date.now()): void {
  g.__t1SummaryCache = { at: now, value };
}

export function clearSummaryCache(): void {
  g.__t1SummaryCache = undefined;
}
