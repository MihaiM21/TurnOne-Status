/**
 * Exercises lib/status/admin.ts directly: create -> update -> resolve an incident,
 * plus a maintenance window. Run: DATA_DIR=./data-wp3 npx tsx scripts/wp3-smoke.ts
 * Prints the incident id on the last line.
 */
async function main() {
  const a = await import("../lib/status/admin");

  const bad = await a.createIncidentAdmin({ title: "", impact: "x", state: "resolved", body: "", components: [{ id: "nope", status: "degraded" }] });
  if (bad.ok) throw new Error("validation should have failed");
  console.log("validation errors:", Object.keys(bad.errors).join(","));

  const created = await a.createIncidentAdmin({
    title: "Live Timing unavailable <test> & more",
    impact: "major",
    state: "investigating",
    body: "We are investigating.\nSecond line with <b>markup</b>.",
    components: [{ id: "f1-live-timing", status: "major_outage" }],
    discord: true,
  });
  if (!created.ok) throw new Error(JSON.stringify(created.errors));
  const id = created.data.id;
  const upd = await a.postIncidentUpdate(id, { state: "identified", body: "Root cause found.", components: [{ id: "f1-live-timing", status: "partial_outage" }] });
  if (!upd.ok) throw new Error(JSON.stringify(upd.errors));
  const res = await a.resolveIncident(id, "", false);
  if (!res.ok || res.data.state !== "resolved" || !res.data.resolvedAt) throw new Error("resolve failed");
  console.log("updates:", res.data.updates.length);

  const now = Date.now();
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 16);
  const badM = await a.createMaintenanceAdmin({ title: "x", body: "y", componentIds: [], start: fmt(now), end: fmt(now - 3600_000) });
  if (badM.ok) throw new Error("end<start should fail");
  const m = await a.createMaintenanceAdmin({ title: "DB upgrade", body: "Short window.", componentIds: [], start: fmt(now + 86_400_000), end: fmt(now + 90_000_000) });
  if (!m.ok) throw new Error(JSON.stringify(m.errors));
  console.log("maintenance:", m.data.id, m.data.state);
  console.log(id);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
