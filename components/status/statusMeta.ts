import {
  CircleAlert,
  CircleCheck,
  CircleX,
  TriangleAlert,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ComponentStatus, IncidentImpact, IncidentState } from "@/lib/status/types";

export interface StatusMeta {
  label: string;
  /** CSS colour (a var reference). */
  color: string;
  Icon: LucideIcon;
  /** Hero headline for this overall status. */
  headline: string;
}

export const STATUS_META: Record<ComponentStatus, StatusMeta> = {
  operational: {
    label: "Operational",
    color: "var(--status-operational)",
    Icon: CircleCheck,
    headline: "All systems operational",
  },
  maintenance: {
    label: "Maintenance",
    color: "var(--status-maintenance)",
    Icon: Wrench,
    headline: "Maintenance in progress",
  },
  degraded: {
    label: "Degraded",
    color: "var(--status-degraded)",
    Icon: CircleAlert,
    headline: "Some systems degraded",
  },
  partial_outage: {
    label: "Partial outage",
    color: "var(--status-partial_outage)",
    Icon: TriangleAlert,
    headline: "Partial outage",
  },
  major_outage: {
    label: "Major outage",
    color: "var(--status-major_outage)",
    Icon: CircleX,
    headline: "Major outage",
  },
};

export const NO_DATA_COLOR = "var(--status-nodata)";

/** Colour for a possibly-null status (null = no data). */
export function statusColor(status: ComponentStatus | null): string {
  return status ? STATUS_META[status].color : NO_DATA_COLOR;
}

/** Translucent tint of a colour, for chip backgrounds and glows. */
export function tint(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

export const IMPACT_META: Record<IncidentImpact, { label: string; color: string }> = {
  none: { label: "No impact", color: "var(--muted)" },
  minor: { label: "Minor", color: "var(--status-degraded)" },
  major: { label: "Major", color: "var(--status-partial_outage)" },
  critical: { label: "Critical", color: "var(--status-major_outage)" },
};

export const INCIDENT_STATE_LABEL: Record<IncidentState, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

export const SUBCHECK_META = {
  ok: { label: "OK", color: "var(--status-operational)" },
  warn: { label: "Warn", color: "var(--status-degraded)" },
  fail: { label: "Fail", color: "var(--status-major_outage)" },
} as const;
