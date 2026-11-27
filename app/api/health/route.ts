import { getDb } from "@/lib/status/db";
import { getSchedulerInfo, startScheduler } from "@/lib/status/scheduler";

export const dynamic = "force-dynamic";

const STALE_MS = 3 * 60_000;

/** Liveness of the status site itself (not of the monitored services). */
export async function GET() {
  startScheduler();
  const { startedAt, lastTickAt } = getSchedulerInfo();
  const now = Date.now();

  let dbOk = false;
  try {
    getDb().prepare("SELECT 1").get();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const inGrace = lastTickAt == null && now - startedAt < STALE_MS;
  const fresh = lastTickAt != null && now - lastTickAt <= STALE_MS;
  const ok = dbOk && (inGrace || fresh);

  return Response.json(
    { ok, lastTickAt: lastTickAt == null ? null : new Date(lastTickAt).toISOString(), dbOk },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
