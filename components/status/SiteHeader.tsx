import Link from "next/link";
import { SubscribeMenu } from "./SubscribeMenu";
import { T1Mark } from "./T1Mark";
import { UtcClock } from "./UtcClock";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Turn One Status, home">
          <T1Mark size={22} />
          <span className="text-[15px] font-semibold tracking-[0.12em]">TURN ONE</span>
          <span className="num text-[13px] tracking-[0.08em] text-muted">/ STATUS</span>
        </Link>
        <div className="flex items-center gap-4">
          <UtcClock className="hidden min-[420px]:inline" />
          <SubscribeMenu />
        </div>
      </div>
    </header>
  );
}
