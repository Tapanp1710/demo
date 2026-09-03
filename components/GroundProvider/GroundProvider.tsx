'use client';

import { useEffect } from 'react';
import { ScrollTrigger, MQ } from '@/lib/gsap';

/**
 * Scroll-driven ground inversion.
 *
 * The page alternates between the deep stage and the warm off-white. Rather
 * than each section painting its own background, ONE scalar lives on <html>:
 *
 *     --ground-t: 0  =>  deep stage
 *     --ground-t: 1  =>  warm off-white
 *
 * tokens.css derives every ground / ink / rule / accent colour from it with
 * color-mix, so this component moves a single number and CSS does the colour
 * maths. Nav, progress bar and accent contrast invert with it for free,
 * because they read the same tokens. No component paints its own ground.
 *
 * Sections opt in with `data-ground="light"` or `data-ground="stage"`.
 *
 * HOW IT MOVES. The value is scrubbed against scroll position across each
 * boundary: it begins changing as a section whose ground differs from its
 * predecessor reaches the bottom of the viewport, and finishes 40% of the way
 * into that section. Position in, colour out — there is no timeline of its own
 * to fall out of sync, so a jumped scroll (anchor link, restored position,
 * devtools) lands on exactly the right value.
 *
 * It previously ran a 0.55s tween re-issued on every scroll event with
 * `overwrite: true`. Each event restarted the tween from its current value, so
 * it only ever advanced one frame's worth of easing and never arrived:
 * measured across the whole page, --ground-t wandered between 0 and 0.44 and
 * the body never left the deep stage. The light sections simply never showed.
 */
export default function GroundProvider() {
  useEffect(() => {
    const root = document.documentElement;
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-ground]'));
    if (!sections.length) return;

    const t = (el: HTMLElement) => (el.dataset.ground === 'light' ? 1 : 0);

    /**
     * The ink hands over LATE and fast, not in step with the ground.
     *
     * The ground now passes through a mid grey (tokens.css), and there is a
     * narrow band of ground luminance where neither ink clears 4.5:1 — light
     * ink needs the ground below L=0.157, dark ink needs it above L=0.199.
     * Holding the ink light until the ground is well into its second half and
     * then crossing quickly keeps the pair passing on both sides of that band
     * and makes the crossing as brief as it can be.
     *
     * The handover is deliberately NARROW. A wide crossfade puts the ink at a
     * mid grey at the same moment the ground is one — measured 1.01:1 with a
     * 20%-wide ramp. Over 4% the ink is effectively light or dark, never grey
     * for long enough to matter.
     *
     * smoothstep over t in [0.735, 0.775]: 0 below, 1 above, eased between.
     */
    const inkAt = (v: number) => {
      const x = Math.min(1, Math.max(0, (v - 0.735) / 0.04));
      return x * x * (3 - 2 * x);
    };

    /**
     * The two halves of the three-stop ramp, shaped rather than linear.
     *
     * gm1 (stage -> mid) is linear: that half is entirely safe, every ink pair
     * clears 4.5:1 on every ground in it.
     *
     * gm2 (mid -> page) uses smootherstep, which is slow at both ends and fast
     * through the middle. The middle is the unsafe part — no ground between
     * L=0.042 and L=0.75 clears 4.5:1 for accent text — so crossing it quickly
     * is the only lever there is. Linear spent 40% of the ramp in mid-tones;
     * this spends 23%, and lingers on the mid grey instead, which is also what
     * makes the third stop read as a stop.
     *
     * tokens.css declares linear versions of both as the no-JS fallback; these
     * inline values override them.
     */
    const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
    const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

    const set = (v: number) => {
      const gm1 = clamp01(v * 2);
      const gm2 = smoother(clamp01(v * 2 - 1));
      root.style.setProperty('--ground-t', v.toFixed(4));
      root.style.setProperty('--gm1', `${(gm1 * 100).toFixed(2)}%`);
      root.style.setProperty('--gm2', `${(gm2 * 100).toFixed(2)}%`);
      root.style.setProperty('--ink-t', inkAt(v).toFixed(4));
    };

    const reduced = window.matchMedia(MQ.motionReduced).matches;
    const triggers: ScrollTrigger[] = [];

    // Start on whatever the first section declares, before any boundary runs.
    set(t(sections[0]));

    sections.forEach((el, i) => {
      const to = t(el);
      const from = i === 0 ? to : t(sections[i - 1]);
      if (from === to) return;                    // no boundary here

      /**
       * Reduced motion still needs the flip — the design depends on it — but
       * takes it as a step at the boundary rather than a gradient.
       */
      if (reduced) {
        triggers.push(ScrollTrigger.create({
          trigger: el,
          start: 'top center',
          onEnter: () => set(to),
          onLeaveBack: () => set(from),
        }));
        return;
      }

      triggers.push(ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',      // the section's first pixel appears
        end: 'top+=40% bottom',   // 40% of the way in, fully turned over
        scrub: true,
        onUpdate: (self) => set(from + (to - from) * self.progress),
        /* A jumped scroll can land past this trigger without it ever
           updating, so both edges assert the finished value. */
        onEnter: () => set(from),
        onLeave: () => set(to),
        onEnterBack: () => set(to),
        onLeaveBack: () => set(from),
      }));
    });

    /**
     * Sections are created and destroyed as the page builds (the amenities
     * filter, reduced-motion swaps), and a boundary that appears later needs a
     * trigger. A refresh re-runs starts and ends; re-collecting the list is
     * cheap and keeps the boundaries honest.
     */
    ScrollTrigger.refresh();

    return () => { triggers.forEach((s) => s.kill()); };
  }, []);

  return null;
}
