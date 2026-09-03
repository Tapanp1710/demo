'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * True once the element comes within `margin` of the viewport.
 *
 * Every animated section building its ScrollTriggers on mount put ~8.7s of work
 * on the main thread before the page was usable. Gating the GSAP setup on this
 * spreads that cost across the scroll instead, while the markup itself is still
 * server-rendered — so nothing is hidden from crawlers or from a reader with
 * JavaScript disabled.
 *
 * Returns true immediately when IntersectionObserver is unavailable, so the
 * motion still initialises rather than silently never running.
 */
export function useNearViewport<T extends HTMLElement>(
  ref: RefObject<T | null>,
  margin = '150% 0px',
): boolean {
  const [near, setNear] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      done.current = true;
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          done.current = true;
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);

  return near;
}
