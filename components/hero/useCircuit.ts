"use client";

import { useEffect, useRef, type RefObject } from "react";
import { BASE_LAP_MS, PIT_SPEED, SF_FRAC } from "./circuitGeometry";

/** Trail: stacked dashes behind the car, lengths in pathLength=1000 units. */
export const TRAIL_LENGTHS = [38, 28, 18, 9] as const;

export interface CircuitElements {
  /** The tarmac path, measured with getPointAtLength. */
  path: RefObject<SVGPathElement | null>;
  /** Wrapper that carries the --car colour (trail + car). */
  layer: RefObject<SVGGElement | null>;
  car: RefObject<SVGGElement | null>;
  trail: RefObject<SVGGElement | null>;
  trailPaths: RefObject<(SVGPathElement | null)[]>;
  lights: RefObject<(SVGCircleElement | null)[]>;
  gantry: RefObject<SVGGElement | null>;
  /** Observed for visibility. */
  root: RefObject<HTMLElement | null>;
}

export interface CircuitConfig {
  /** Speed multiplier per sector (index 0..3). */
  speeds: readonly number[];
  /** CSS colour per sector. */
  colors: readonly string[];
  failed: boolean;
  onLap: (laps: number) => void;
}

const INTRO_FLAG = "__t1CircuitIntro";
type IntroWindow = Window & { [INTRO_FLAG]?: boolean };

/** True the first time in a page load. The load sequence plays once. */
export function shouldPlayIntro(): boolean {
  return typeof window === "undefined" || !(window as IntroWindow)[INTRO_FLAG];
}

const LIGHT_START = 1100;
const LIGHT_STEP = 140;
const LIGHT_HOLD = 300;

/**
 * The monitoring loop as a lap. One rAF loop mutates refs and attributes; React never
 * re-renders per frame. It pauses when the tab is hidden or the hero is off-screen, and
 * never runs under prefers-reduced-motion (the car stays parked on the grid).
 */
export function useCircuit(el: CircuitElements, config: CircuitConfig, intro: boolean) {
  const cfg = useRef(config);
  useEffect(() => {
    cfg.current = config;
    // Parked (reduced motion): the car glows in sector 1 colour; the loop owns it otherwise.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.layer.current?.style.setProperty("--car", config.colors[0] ?? "");
    }
  });

  useEffect(() => {
    const path = el.path.current;
    const car = el.car.current;
    const layer = el.layer.current;
    const root = el.root.current;
    if (!path || !car || !layer || !root) return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const total = path.getTotalLength();
    const sf = SF_FRAC;

    let reduced = mql.matches;
    let visible = true;
    let launched = !intro; // without the intro the car is racing straight away
    let running = false;
    let raf = 0;
    let last = 0;
    let dist = 0; // 0..1 lap progress, 0 = start/finish
    let speed = 0;
    let laps = 0;
    let lastColor = "";
    const timers: ReturnType<typeof setTimeout>[] = [];

    const place = () => {
      const frac = (sf + dist) % 1;
      const u = frac * total;
      const p = path.getPointAtLength(u);
      const q = path.getPointAtLength((u + 1) % total);
      const deg = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
      car.setAttribute(
        "transform",
        `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${deg.toFixed(1)})`,
      );
      const u1000 = frac * 1000;
      const tp = el.trailPaths.current;
      for (let i = 0; i < TRAIL_LENGTHS.length; i++) {
        tp[i]?.setAttribute("stroke-dashoffset", (TRAIL_LENGTHS[i] - u1000).toFixed(2));
      }
    };

    const colorize = (k: number) => {
      const c = cfg.current.colors[k] ?? "";
      if (c !== lastColor) {
        lastColor = c;
        layer.style.setProperty("--car", c);
      }
    };

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(t - last, 64) : 16;
      last = t;
      const c = cfg.current;
      const k = Math.min(3, Math.floor(dist * 4));
      const target = c.failed ? PIT_SPEED : (c.speeds[k] ?? 1);
      // ease towards the target pace over ~400 ms (time constant 133 ms)
      speed += (target - speed) * (1 - Math.exp(-dt / 133));
      dist += (dt / BASE_LAP_MS) * speed;
      if (dist >= 1) {
        dist -= 1;
        laps += 1;
        c.onLap(laps);
      }
      colorize(Math.min(3, Math.floor(dist * 4)));
      place();
    };

    const evaluate = () => {
      const should = !reduced && launched && visible && !document.hidden;
      if (should && !running) {
        running = true;
        last = 0;
        raf = requestAnimationFrame(frame);
        if (el.trail.current) el.trail.current.style.opacity = "1";
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
      if (reduced && el.trail.current) el.trail.current.style.opacity = "0";
    };

    // Park on the grid (the server markup already has this).
    colorize(0);
    place();

    const onMql = () => {
      reduced = mql.matches;
      if (reduced) {
        dist = 0;
        speed = 0;
        place();
      }
      evaluate();
    };
    mql.addEventListener("change", onMql);
    const onVis = () => evaluate();
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? true;
      evaluate();
    });
    io.observe(root);

    // Lights out: only on the first load of the page, never on later checks.
    const lights = el.lights.current;
    const gantry = el.gantry.current;
    if (intro && !reduced) {
      launched = false;
      lights.forEach((l, i) => {
        timers.push(setTimeout(() => l?.setAttribute("opacity", "1"), LIGHT_START + i * LIGHT_STEP));
      });
      const out = LIGHT_START + (lights.length - 1) * LIGHT_STEP + LIGHT_HOLD;
      timers.push(
        setTimeout(() => {
          lights.forEach((l) => l?.setAttribute("opacity", "0.12"));
          launched = true;
          (window as IntroWindow)[INTRO_FLAG] = true;
          evaluate();
        }, out),
      );
      timers.push(
        setTimeout(() => {
          if (gantry) gantry.style.opacity = "0";
        }, out + 1200),
      );
    } else {
      launched = true;
      (window as IntroWindow)[INTRO_FLAG] = true;
    }
    evaluate();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      io.disconnect();
      mql.removeEventListener("change", onMql);
      document.removeEventListener("visibilitychange", onVis);
    };
    // Refs are stable; `intro` is fixed for the life of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Scroll parallax: translates `target` by 0.12x the scroll offset (transform only).
 * Passive listener + rAF; off under reduced motion and while the hero is off-screen.
 */
export function useParallax(
  target: RefObject<HTMLElement | null>,
  root: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const el = target.current;
    const host = root.current;
    if (!el || !host) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let visible = true;
    const apply = () => {
      raf = 0;
      if (mql.matches) {
        el.style.removeProperty("transform");
        return;
      }
      const y = Math.min(window.scrollY, 320) * 0.12;
      el.style.setProperty("transform", `translate3d(0, ${y.toFixed(1)}px, 0)`);
    };
    const onScroll = () => {
      if (!visible || raf) return;
      raf = requestAnimationFrame(apply);
    };
    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? true;
    });
    io.observe(host);
    window.addEventListener("scroll", onScroll, { passive: true });
    apply();
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, root]);
}
