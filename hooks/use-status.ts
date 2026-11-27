"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StatusSummary } from "@/lib/status/types";

/**
 * Keeps the server-rendered summary as initial state and refreshes it from
 * /api/status every `summary.pollSeconds`. Pauses while the tab is hidden and
 * refetches as soon as it becomes visible / focused again.
 */
export function useStatus(initial: StatusSummary) {
  const [summary, setSummary] = useState(initial);
  const [fetching, setFetching] = useState(false);
  const [failed, setFailed] = useState(false);
  const pollMs = useRef(initial.pollSeconds * 1000);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (document.visibilityState === "hidden") return;
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    setFetching(true);
    try {
      const res = await fetch("/api/status", { signal: ctrl.signal, cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const next = (await res.json()) as StatusSummary;
      pollMs.current = Math.max(5, next.pollSeconds) * 1000;
      setSummary(next);
      setFailed(false);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setFailed(true);
    } finally {
      if (inflight.current === ctrl) {
        setFetching(false);
        timer.current = setTimeout(load, pollMs.current);
      }
    }
  }, []);

  useEffect(() => {
    timer.current = setTimeout(load, pollMs.current);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
      else {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        inflight.current?.abort();
        setFetching(false);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (timer.current) clearTimeout(timer.current);
      inflight.current?.abort();
    };
  }, [load]);

  return { summary, fetching, failed };
}
