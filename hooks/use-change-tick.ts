import { useState } from "react";

/**
 * Counts how many times `key` has changed since mount (0 on first render, so
 * nothing animates on load). Uses the render-phase "derive state" pattern, so no
 * effect and no extra paint. Use the count as a React `key` to restart a CSS animation.
 */
export function useChangeTick(key: string): number {
  const [state, setState] = useState({ key, n: 0 });
  if (state.key !== key) setState({ key, n: state.n + 1 });
  return state.n;
}

export type Delta = "faster" | "slower" | null;

/**
 * Tracks a latency value. `n` increments on every change; `dir` is "faster" when
 * the value dropped by 10% or more, "slower" when it rose by 10% or more (the
 * F1 timing-screen personal-best / slower convention), else null.
 */
export function useLatencyDelta(value: number | null): { n: number; dir: Delta } {
  const [s, setS] = useState<{ value: number | null; n: number; dir: Delta }>({
    value,
    n: 0,
    dir: null,
  });
  if (s.value !== value) {
    let dir: Delta = null;
    if (s.value !== null && value !== null && s.value > 0) {
      if (value <= s.value * 0.9) dir = "faster";
      else if (value >= s.value * 1.1) dir = "slower";
    }
    setS({ value, n: s.n + 1, dir });
  }
  return { n: s.n, dir: s.dir };
}
