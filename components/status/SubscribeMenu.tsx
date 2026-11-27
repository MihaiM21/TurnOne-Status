"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Bell, MessageCircle, Rss } from "lucide-react";

const DISCORD = "https://discord.gg/rFWq3F6C8t";

/** "Subscribe" button with a small popover: Atom feed + Discord. */
export function SubscribeMenu() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "t-fast flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-fg hover:bg-surface";

  return (
    <div ref={wrap} className="relative">
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="t-fast inline-flex h-8 items-center gap-2 rounded-md border border-line bg-surface px-3 text-[13px] text-fg hover:bg-elevated"
      >
        <Bell size={14} aria-hidden="true" />
        Subscribe
      </button>
      {open && (
        <div
          id={id}
          className="pop-in absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-line bg-card p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
        >
          <a href="/feed.xml" className={item}>
            <Rss size={15} aria-hidden="true" className="text-muted" />
            <span>
              Atom feed
              <span className="num block text-[11px] text-muted">/feed.xml</span>
            </span>
          </a>
          <a href={DISCORD} target="_blank" rel="noopener noreferrer" className={item}>
            <MessageCircle size={15} aria-hidden="true" className="text-muted" />
            <span>
              Discord
              <span className="block text-[11px] text-muted">Announcements channel</span>
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
