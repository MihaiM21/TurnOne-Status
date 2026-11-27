/**
 * Discord webhook notifications. No-op without DISCORD_WEBHOOK_URL; never throws.
 */
import type { ComponentStatus, Incident, IncidentUpdate } from "./types";

export const DISCORD_COLORS = {
  operational: 0x00e436,
  degraded: 0xffc61a,
  outage: 0xd40924,
  maintenance: 0x7c8ca3,
} as const;

export function colorForStatus(status: ComponentStatus): number {
  switch (status) {
    case "operational":
      return DISCORD_COLORS.operational;
    case "degraded":
      return DISCORD_COLORS.degraded;
    case "maintenance":
      return DISCORD_COLORS.maintenance;
    default:
      return DISCORD_COLORS.outage;
  }
}

export interface DiscordEvent {
  title: string;
  description?: string;
  status: ComponentStatus;
  incidentId?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
}

export function publicUrl(): string {
  return (process.env.PUBLIC_URL ?? "https://status.t1f1.com").replace(/\/$/, "");
}

export async function notifyDiscord(event: DiscordEvent): Promise<void> {
  const hook = process.env.DISCORD_WEBHOOK_URL;
  if (!hook) return;
  try {
    const embed: Record<string, unknown> = {
      title: event.title,
      description: event.description,
      color: colorForStatus(event.status),
      timestamp: new Date().toISOString(),
      footer: { text: "Turn One Status" },
    };
    if (event.incidentId) embed.url = `${publicUrl()}/incidents/${event.incidentId}`;
    if (event.fields?.length) embed.fields = event.fields;
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Turn One Status", embeds: [embed] }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* swallow: notifications are best-effort */
  }
}

/** Posts an incident timeline update. Reused by the admin UI. */
export async function notifyIncident(incident: Incident, update: IncidentUpdate): Promise<void> {
  const worst: ComponentStatus =
    update.state === "resolved"
      ? "operational"
      : incident.components.some((c) => c.status === "major_outage" || c.status === "partial_outage")
        ? "major_outage"
        : incident.components.some((c) => c.status === "degraded")
          ? "degraded"
          : incident.impact === "none"
            ? "maintenance"
            : "degraded";
  const label = update.state.charAt(0).toUpperCase() + update.state.slice(1);
  await notifyDiscord({
    title: `${label}: ${incident.title}`,
    description: update.body,
    status: worst,
    incidentId: incident.id,
    fields: [
      { name: "Impact", value: incident.impact, inline: true },
      { name: "Components", value: incident.components.map((c) => c.id).join(", ") || "none", inline: true },
    ],
  });
}
