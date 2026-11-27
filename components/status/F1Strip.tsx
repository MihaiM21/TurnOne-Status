import type { F1Session } from "@/lib/status/types";
import { Countdown } from "./Countdown";

/** Slim, muted F1 row. Sim racing leads the page; F1 is secondary. */
export function F1Strip({ session }: { session: F1Session }) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-xs text-muted"
      role="status"
    >
      <span className="label">F1</span>
      <span className="text-[13px] text-fg">{session.eventName}</span>
      <span aria-hidden="true">·</span>
      <span className="text-[13px]">{session.sessionName}</span>
      <span aria-hidden="true">·</span>
      {session.live ? (
        <span className="inline-flex items-center gap-2 text-fg">
          <span aria-hidden="true" className="live-dot size-2 rounded-full bg-crimson" />
          <span className="num tracking-[0.1em]">LIVE NOW</span>
        </span>
      ) : (
        <span className="num text-[13px]">
          in <Countdown to={session.startsAt} />
        </span>
      )}
    </div>
  );
}
