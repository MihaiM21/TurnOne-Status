import type { ComponentStatus, GroupId } from "@/lib/status/types";

/** The original Turn One circuit. viewBox 0 0 800 420, start (150,340), Turn 1 bottom-right. */
export const CIRCUIT_PATH =
  "M 150 340 L 560 340 Q 640 340 650 290 L 655 250 C 660 200 720 200 735 160 C 750 115 715 70 665 72 C 615 74 600 110 560 120 L 420 150 C 370 160 360 110 320 100 C 270 88 250 130 210 130 L 120 128 C 60 128 50 190 80 220 C 105 245 150 240 165 270 C 178 295 120 300 115 320 C 110 338 125 340 150 340 Z";

export const VIEWBOX_W = 800;
export const VIEWBOX_H = 420;

/** S1..S4 = these groups, in lap order. */
export const SECTOR_GROUPS: readonly GroupId[] = ["sim", "f1", "platform", "developers"];

/** Start/finish line sits on the main straight at (300,340). */
export const SF_POINT = { x: 300, y: 340 };

/**
 * Total path length (user units) and the start/finish line's position along it as a
 * fraction. Numerically integrated from CIRCUIT_PATH; the runtime re-measures the real
 * element, so this only needs to be close enough for the static (server) render.
 * Sector 1 starts at the start/finish line, so a lap and the 4 sectors line up.
 */
export const PATH_LEN = 1761.32;
export const SF_FRAC = 150 / PATH_LEN;

/** Sector boundary ticks (S1|S2, S2|S3, S3|S4): point + unit tangent along travel. */
export const BOUNDARIES = [
  { x: 664.4, y: 224.5, tx: 0.58, ty: -0.815 },
  { x: 468.6, y: 139.6, tx: -0.978, ty: 0.21 },
  { x: 66.7, y: 161.4, tx: -0.335, ty: 0.942 },
] as const;

/** Sector label anchors: sector midpoint pushed outward off the track. */
export const SECTOR_LABELS = [
  { x: 520, y: 366 },
  { x: 702, y: 40 },
  { x: 259, y: 84 },
  { x: 119, y: 290 },
] as const;

/** Lap time at operational pace. */
export const BASE_LAP_MS = 14000;

/** Speed multiplier by the status of the sector the car is in. */
export const SECTOR_SPEED: Record<ComponentStatus, number> = {
  operational: 1,
  maintenance: 0.55,
  degraded: 0.6,
  partial_outage: 0.45,
  major_outage: 0.3,
};

/** Pit-lane speed when the connection to the API is lost. */
export const PIT_SPEED = 0.25;

/** Sector colour while a group has not been probed yet. */
export const SECTOR_WAITING_COLOR = "#4a4a4a";

export interface FlagInfo {
  label: string;
  color: string;
}

export const FLAGS: Record<ComponentStatus, FlagInfo> = {
  operational: { label: "Green flag", color: "#00E436" },
  degraded: { label: "Yellow flag", color: "#FFC61A" },
  partial_outage: { label: "Double yellow", color: "#FF7A1A" },
  major_outage: { label: "Red flag", color: "#EE343B" },
  maintenance: { label: "Safety car", color: "#7C8CA3" },
};

export const FLAG_FORMATION: FlagInfo = { label: "Formation lap", color: "#868686" };
