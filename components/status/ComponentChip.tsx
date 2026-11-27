import Link from "next/link";
import type { ComponentStatus } from "@/lib/status/types";
import { StatusDot } from "./StatusDot";

/** Link chip to a component's detail page, with an optional status dot. */
export function ComponentChip({
  id,
  name,
  status,
}: {
  id: string;
  name: string;
  status?: ComponentStatus;
}) {
  return (
    <Link
      href={`/components/${id}`}
      className="t-fast inline-flex items-center gap-1.5 rounded-[4px] border border-line bg-surface px-2 py-1 text-xs text-fg hover:border-[#2a2a2a] hover:bg-elevated"
    >
      {status && <StatusDot status={status} size={6} />}
      {name}
    </Link>
  );
}
