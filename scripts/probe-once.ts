/**
 * Runs N ticks (default 1, `TICKS=2`) against a temp DATA_DIR and prints a
 * condensed summary. Run: npx tsx scripts/probe-once.ts
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.DATA_DIR ??= mkdtempSync(path.join(tmpdir(), "t1status-"));
process.env.STATUS_DISABLE_SCHEDULER = "1";

async function main() {
  const { runTick } = await import("../lib/status/scheduler");
  const { getStatusSummary } = await import("../lib/status/summary");
  const { clearSummaryCache } = await import("../lib/status/cache");
  const ticks = Number(process.env.TICKS ?? 1);

  for (let i = 1; i <= ticks; i++) {
    await runTick();
    clearSummaryCache();
    const s = await getStatusSummary();
    console.log(`\n=== tick ${i}/${ticks}  overall=${s.overall}  pollSeconds=${s.pollSeconds}  f1=${s.f1 ? s.f1.sessionName : "null"}`);
    for (const g of s.groups) {
      for (const c of g.components) {
        console.log(
          [
            c.id.padEnd(16),
            c.status.padEnd(14),
            (c.latencyMs != null ? `${c.latencyMs}ms` : "-").padEnd(7),
            (c.version ?? "-").padEnd(8),
            `up=${c.uptimePct}% days=${c.uptime90.length} spark=${c.spark.length}`,
            c.reason ?? "",
            c.subchecks.length ? `[${c.subchecks.map((x) => `${x.name}=${x.value}`).join(", ")}]` : "",
          ].join("  "),
        );
      }
    }
    for (const inc of s.activeIncidents) {
      console.log(`  INCIDENT ${inc.id} auto=${inc.automatic} ${inc.impact} "${inc.title}" -> ${inc.updates[0]?.body}`);
    }
  }
  console.log(`\nDATA_DIR=${process.env.DATA_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
