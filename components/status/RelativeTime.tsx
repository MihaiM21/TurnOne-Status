"use client";

import { useNow } from "@/hooks/use-now";
import { formatRelative, formatUtc } from "./format";

/**
 * Hydration-safe relative time. Server and first client render show an
 * absolute UTC time; after mount it becomes "12s ago" and ticks every second.
 */
export function RelativeTime({
  iso,
  className = "",
  prefix,
}: {
  iso: string;
  className?: string;
  prefix?: string;
}) {
  const now = useNow();
  const abs = formatUtc(iso);
  const text = now === null ? abs : formatRelative(new Date(iso).getTime(), now);
  return (
    <time dateTime={iso} title={abs} className={`num ${className}`}>
      {prefix}
      {text}
    </time>
  );
}
