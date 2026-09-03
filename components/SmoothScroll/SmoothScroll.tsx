'use client';

import { useEffect } from 'react';
import { initSmoothScroll, refreshWhenSettled, scrollToAnchor, exposeTriggerTable } from '@/lib/gsap';

/**
 * Starts Lenis once for the whole page and keeps it on GSAP's ticker.
 * Renders nothing. Mounted high in the tree so every ScrollTrigger below
 * shares one scroll clock — two rAF loops would show up as scrub jitter.
 *
 * Also owns in-page anchor navigation, which Lenis breaks by default: it
 * rewrites the scroll position every frame from its own value, so a native
 * jump is dragged back before it lands. One delegated listener rather than a
 * handler per link, so anchors rendered later are covered too.
 */
export default function SmoothScroll() {
  useEffect(() => {
    let dispose: (() => void) | undefined;
    initSmoothScroll().then((d) => { dispose = d; });
    refreshWhenSettled();
    exposeTriggerTable();

    const onClick = (e: MouseEvent) => {
      // Leave modified clicks alone — they open tabs/windows.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank') return;

      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || !url.hash) return;
      // Same page only: a hash on another route is a normal navigation.
      if (url.pathname.replace(/\/$/, '') !== location.pathname.replace(/\/$/, '')) return;

      const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!el) return;

      // These are next/link, whose own handler preventDefaults and hands the
      // click to the router, which then does its own scroll. Capture phase and
      // stopPropagation take the event before it ever reaches that handler —
      // in the bubble phase this listener only ever saw an already-handled
      // click and bailed, so the tracking scroll below never ran at all.
      e.preventDefault();
      e.stopPropagation();
      history.pushState(null, '', url.hash);
      scrollToAnchor(el);
    };

    document.addEventListener('click', onClick, true);
    return () => { document.removeEventListener('click', onClick, true); dispose?.(); };
  }, []);

  return null;
}
