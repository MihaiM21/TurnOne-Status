/**
 * Admin auth. One shared ADMIN_PASSWORD, a signed session cookie, an in-memory
 * login rate limit. Everything here is Node-runtime only.
 *
 * Cookie `t1s_admin` = `<expiresMs>.<base64url(HMAC-SHA256(SESSION_SECRET, expiresMs))>`.
 * If ADMIN_PASSWORD or SESSION_SECRET is unset the admin area is disabled.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "t1s_admin";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const LOGIN_DELAY_MS = 400;
const RATE_MAX = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD) && Boolean(process.env.SESSION_SECRET);
}

const sha256 = (v: string) => createHash("sha256").update(v).digest();

/** Constant-time password check. Always false when admin is not configured. */
export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!adminConfigured() || !expected) return false;
  return timingSafeEqual(sha256(input), sha256(expected));
}

function sign(expiresMs: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "").update(expiresMs).digest("base64url");
}

export function createSessionValue(now = Date.now()): { value: string; expires: number } {
  const expires = now + SESSION_TTL_MS;
  return { value: `${expires}.${sign(String(expires))}`, expires };
}

/** True for a well-formed, unexpired, correctly signed cookie value. */
export function verifySessionValue(value: string | undefined | null, now = Date.now()): boolean {
  if (!value || !adminConfigured()) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const exp = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  if (!/^\d{1,16}$/.test(exp) || Number(exp) <= now) return false;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

export const sessionCookieOptions = (expires: number) =>
  ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/admin",
    expires: new Date(expires),
  }) as const;

/** Current request carries a valid admin session (reads cookies itself). */
export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionValue(jar.get(SESSION_COOKIE)?.value);
}

/** Guard for pages and Server Actions: redirects to login when not signed in. */
export async function requireAdmin(next?: string): Promise<void> {
  if (await isAdmin()) return;
  redirect(next ? `/admin/login?next=${encodeURIComponent(next)}` : "/admin/login");
}

/** Only allow same-site /admin paths as post-login targets. */
export function safeNext(next: string | null | undefined): string {
  if (next && next.startsWith("/admin") && !next.startsWith("//") && !next.includes("\\") && !next.startsWith("/admin/login"))
    return next;
  return "/admin";
}

// ---- rate limit ------------------------------------------------------------

const g = globalThis as unknown as { __t1LoginAttempts?: Map<string, number[]> };
const attempts: Map<string, number[]> = (g.__t1LoginAttempts ??= new Map<string, number[]>());

export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim() || "unknown";
  return h.get("x-real-ip")?.trim() || "unknown";
}

/** Records an attempt; returns false when the IP is over its limit. */
export function registerLoginAttempt(ip: string, now = Date.now()): boolean {
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    attempts.set(ip, recent);
    return false;
  }
  recent.push(now);
  attempts.set(ip, recent);
  return true;
}

export function clearLoginAttempts(ip: string): void {
  attempts.delete(ip);
}
