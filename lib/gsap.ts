/**
 * GSAP registration, Lenis wiring, and the shared motion vocabulary.
 * Import from here — never register plugins ad hoc in a component, or the
 * ticker gets attached more than once and scrub pacing drifts.
 */
'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Observer } from 'gsap/Observer';
import type Lenis from 'lenis';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, Observer);
}

/**
 * One UI ease, one entrance ease, one deck ease, linear for scrubs — mirrors
 * tokens.css. `scrub: 'none'` is linear on purpose: inside a scrubbed timeline
 * the ScrollTrigger's own numeric scrub supplies the smoothing, and easing the
 * tween as well double-eases it. `deck` is for cards and panels changing
 * places under their own power, where the deceleration has to be felt.
 */
export const EASE = {
  ui: 'power2.out',
  entrance: 'power3.out',
  deck: 'power3.out',
  /** Value crossfades that both start and finish while you are watching. */
  crossfade: 'power2.inOut',
  scrub: 'none',
} as const;

export const DUR = {
  micro: 0.2,
  entrance: 0.4,
  deck: 0.6,
  emphasis: 0.7,
} as const;

export const STAGGER = 0.06;

/** Breakpoints for gsap.matchMedia — the single source for responsive motion. */
export const MQ = {
  desktop: '(min-width: 1200px)',
  laptop: '(min-width: 992px) and (max-width: 1199px)',
  tablet: '(min-width: 768px) and (max-width: 991px)',
  mobile: '(max-width: 767px)',
  motionOK: '(prefers-reduced-motion: no-preference)',
  motionReduced: '(prefers-reduced-motion: reduce)',
} as const;

/**
 * True when this device should not be asked to run the heavy 3D work.
 * Drives module degradation and whether the hero video loads at all.
 */
export function isLowPowerDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (conn?.saveData) return true;
  if (conn?.effectiveType && /(^|-)([23]g|slow-2g)$/.test(conn.effectiveType)) return true;
  if ((navigator.hardwareConcurrency ?? 8) <= 4) return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Should the hero background video load at all?
 *
 * Beyond isLowPowerDevice, this refuses on small viewports outright. The file
 * is 4.6 MB — a third of the page's weight — and phone users are the ones most
 * likely to be on a metered connection. The poster is 207 KB and carries the
 * hero perfectly well on its own, so the video is desktop-only enhancement.
 *
 * (hardwareConcurrency alone is not enough of a signal: an emulated phone in
 * a lab still reports the host machine's core count, so the CPU gate never
 * trips there and the video downloads on a "mobile" run.)
 */
export function shouldLoadHeroVideo(): boolean {
  if (typeof window === 'undefined') return false;
  if (isLowPowerDevice()) return false;
  return window.matchMedia('(min-width: 768px)').matches;
}

let lenis: Lenis | null = null;

/**
 * Start Lenis and drive it from GSAP's ticker, so scroll position and
 * ScrollTrigger stay on one clock. Two rAF loops = scrub jitter.
 * Returns a disposer; safe to call twice (second call is a no-op).
 */
export async function initSmoothScroll(): Promise<() => void> {
  if (typeof window === 'undefined') return () => {};
  if (window.matchMedia(MQ.motionReduced).matches) return () => {};
  if (lenis) return () => {};

  const { default: LenisCtor } = await import('lenis');
  lenis = new LenisCtor({
    duration: 1.05,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6,
    /* Anchors are handled by scrollToAnchor below, not by Lenis's own option —
       a single jump lands in the wrong place here. See that function. */
  });

  const onScroll = () => ScrollTrigger.update();
  lenis.on('scroll', onScroll);

  const raf = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  return () => {
    lenis?.off('scroll', onScroll);
    gsap.ticker.remove(raf);
    lenis?.destroy();
    lenis = null;
  };
}

export function stopScroll() { lenis?.stop(); }
export function startScroll() { lenis?.start(); }

/**
 * Zero, deliberately.
 *
 * Every section is now 100svh and pads its OWN content clear of the fixed nav.
 * Offsetting the scroll as well double-counts that clearance and pushes the
 * bottom of the section below the fold — on the amenities section it put the
 * carousel arrows off-screen on arrival. Landing flush with the section top is
 * what makes a full-height section fully visible.
 */
const ANCHOR_OFFSET = 0;

/**
 * Scroll to an in-page target, tracking it in case it moves.
 *
 * Scroll lengths are reserved in CSS now, so the document no longer changes
 * height mid-flight and a single scrollTo would usually land. It stays a
 * tracking loop because late layout still shifts targets — a font swap, an
 * image resolving, a resize — and a single scrollTo cannot survive that: its
 * onComplete does not even fire when the scroll is cut short. Re-aiming every
 * frame is a damped approach that follows the target and stops when it stops.
 *
 * (Before the tracks were reserved, a lazily-built pin inserted its spacer
 * mid-jump: a click on Amenities aimed at 5535px and the section had moved to
 * 7335px by the time it arrived.)
 */
export function scrollToAnchor(target: string | HTMLElement): void {
  const el = typeof target === 'string'
    ? document.querySelector<HTMLElement>(target)
    : target;
  if (!el) return;
  if (!lenis) { el.scrollIntoView(); return; }        // reduced motion, no Lenis

  const start = performance.now();
  let cancelled = false;
  const abort = () => { cancelled = true; };
  // Anything the visitor does outright wins — never scroll against them.
  const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
  events.forEach((t) => window.addEventListener(t, abort, { once: true, passive: true }));

  const track = () => {
    if (cancelled || !lenis) return done();

    /* Aim at an absolute position rather than passing the element and an
       offset: re-targeting by element every frame asymptotes exactly
       |ANCHOR_OFFSET| short. Computing the number here means the value aimed
       at and the value tested for arrival are the same quantity. */
    const wanted = el.getBoundingClientRect().top + window.scrollY + ANCHOR_OFFSET;
    lenis.scrollTo(wanted, { duration: 0.6, force: true });

    const settled = Math.abs(window.scrollY - wanted) < 2;
    // The 2.5s cap is a stop, not a schedule: it only matters if a layout
    // never settles, in which case looping forever would be worse than landing
    // slightly off.
    if (settled || performance.now() - start > 2500) return done();
    requestAnimationFrame(track);
  };
  const done = () => events.forEach((t) => window.removeEventListener(t, abort));

  requestAnimationFrame(track);
}

/**
 * will-change belongs on an element only while its trigger is active —
 * left on globally it costs memory and can force needless layer promotion.
 */
export function manageWillChange(el: HTMLElement) {
  return {
    onEnter: () => { el.style.willChange = 'transform'; },
    onEnterBack: () => { el.style.willChange = 'transform'; },
    onLeave: () => { el.style.willChange = ''; },
    onLeaveBack: () => { el.style.willChange = ''; },
  };
}

/**
 * Refresh exactly once, after everything that changes layout has resolved.
 *
 * A refresh recomputes every trigger's start/end, and doing that while one is
 * mid-scrub can teleport the scroll position. So: wait for fonts AND the load
 * event (which is images), then refresh a single time — and only while the
 * page is at rest. If the visitor is mid-scroll when both resolve, it waits
 * for scrolling to stop rather than yanking the page under them.
 */
export function refreshWhenSettled() {
  if (typeof document === 'undefined') return;

  const loaded = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise<void>((r) => window.addEventListener('load', () => r(), { once: true }));

  void Promise.all([document.fonts?.ready ?? Promise.resolve(), loaded]).then(() => {
    let lastY = window.scrollY;
    let still = 0;
    const whenIdle = () => {
      const y = window.scrollY;
      still = y === lastY ? still + 1 : 0;
      lastY = y;
      // ~4 consecutive still frames: not mid-gesture, not mid-scrub.
      if (still >= 4) ScrollTrigger.refresh();
      else requestAnimationFrame(whenIdle);
    };
    requestAnimationFrame(whenIdle);
  });
}

/**
 * Expose the computed pin/scrub table for auditing, behind `?st-debug=1`.
 *
 * Overlapping pin ranges throw scroll position backwards, and the only way to
 * see one is to print every trigger's resolved start/end together. Gated on a
 * query flag so it costs nothing in the normal case.
 */
export function exposeTriggerTable() {
  if (typeof window === 'undefined') return;
  if (!new URLSearchParams(window.location.search).has('st-debug')) return;
  (window as unknown as Record<string, unknown>).__stTable = () =>
    ScrollTrigger.getAll().map((t) => {
      const el = t.trigger as HTMLElement | undefined;
      return {
        id: el?.id || el?.className?.toString().split(' ')[0] || el?.tagName || '?',
        start: Math.round(t.start),
        end: Math.round(t.end),
        pin: !!t.pin,
        pinSpacing: (t.vars as { pinSpacing?: unknown }).pinSpacing ?? 'default',
        scrub: (t.vars as { scrub?: unknown }).scrub ?? false,
      };
    });
}

export { gsap, ScrollTrigger, Observer };
