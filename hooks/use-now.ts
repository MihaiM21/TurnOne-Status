"use client";

import { useSyncExternalStore } from "react";

/**
 * One shared 1 Hz clock for the whole page. Returns `null` on the server and
 * during hydration, then the current epoch ms after mount, so any markup
 * derived from it is hydration-safe.
 */
let current: number | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick() {
  current = Date.now();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    current = Date.now();
    timer = setInterval(tick, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
      current = null;
    }
  };
}

const getSnapshot = () => current;
const getServerSnapshot = () => null;

export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
