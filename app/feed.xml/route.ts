import { listActiveMaintenance, listIncidentsOverlapping, listRecentMaintenance } from "@/lib/status/store";
import { INCIDENT_STATE_LABEL } from "@/components/status/statusMeta";

const DAY = 86_400_000;
const MAX_ENTRIES = 50;
const TAG = "tag:status.t1f1.com,2026";

/** Drop code points that are illegal in XML 1.0. */
function stripIllegal(v: string): string {
  let out = "";
  for (const ch of v) {
    const c = ch.codePointAt(0)!;
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c <= 55295) || (c >= 57344 && c <= 65533) || c >= 65536) out += ch;
  }
  return out;
}

/** Strip illegal chars, then escape the five XML specials. */
function xml(v: string): string {
  return stripIllegal(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** HTML-escape, so user text can never become markup inside the html content. */
const html = (v: string) => xml(v);

const utc = (iso: string) => `${iso.slice(0, 16).replace("T", " ")} UTC`;

interface Entry {
  id: string;
  title: string;
  updated: string;
  link: string;
  content: string;
}

export async function GET() {
  const base = (process.env.PUBLIC_URL ?? "https://status.t1f1.com").replace(/\/$/, "");
  const now = Date.now();
  const entries: Entry[] = [];

  for (const i of listIncidentsOverlapping(now - 90 * DAY, now)) {
    const updated = i.updates[0]?.createdAt ?? i.createdAt;
    const timeline = i.updates
      .map(
        (u) =>
          `<p><strong>${html(INCIDENT_STATE_LABEL[u.state])}</strong> - <small>${html(utc(u.createdAt))}</small><br/>${html(u.body).replace(/\n/g, "<br/>")}</p>`,
      )
      .join("");
    entries.push({
      id: `${TAG}:incident/${i.id}`,
      title: `[${INCIDENT_STATE_LABEL[i.state]}] ${i.title}`,
      updated,
      link: `${base}/incidents/${i.id}`,
      content: timeline,
    });
  }

  const seen = new Set<string>();
  for (const m of [...listActiveMaintenance(90, now), ...listRecentMaintenance(90, now)]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    const label = m.state === "in_progress" ? "In progress" : m.state === "scheduled" ? "Scheduled" : "Completed";
    entries.push({
      id: `${TAG}:maintenance/${m.id}`,
      title: `[Maintenance ${label.toLowerCase()}] ${m.title}`,
      updated: m.state === "completed" ? m.scheduledEnd : m.scheduledStart,
      link: `${base}/`,
      content: `<p><strong>${html(label)}</strong> - <small>${html(utc(m.scheduledStart))} to ${html(utc(m.scheduledEnd))}</small><br/>${html(m.body).replace(/\n/g, "<br/>")}</p>`,
    });
  }

  entries.sort((a, b) => b.updated.localeCompare(a.updated));
  const top = entries.slice(0, MAX_ENTRIES);
  const feedUpdated = top[0]?.updated ?? new Date(0).toISOString();

  const body = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${TAG}:feed</id>
  <title>Turn One Status</title>
  <subtitle>Incidents and maintenance for Turn One services</subtitle>
  <updated>${xml(feedUpdated)}</updated>
  <link rel="self" type="application/atom+xml" href="${xml(base)}/feed.xml"/>
  <link rel="alternate" type="text/html" href="${xml(base)}/"/>
  <author><name>Turn One Status</name></author>
${top
  .map(
    (e) => `  <entry>
    <id>${xml(e.id)}</id>
    <title>${xml(e.title)}</title>
    <updated>${xml(e.updated)}</updated>
    <link rel="alternate" type="text/html" href="${xml(e.link)}"/>
    <content type="html">${xml(e.content)}</content>
  </entry>`,
  )
  .join("\n")}
</feed>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
