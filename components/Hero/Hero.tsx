'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap, MQ, EASE, shouldLoadHeroVideo } from '@/lib/gsap';
import { site, legal, hero as heroCopy } from '@/lib/content';
import styles from './Hero.module.css';

/**
 * Hero: the media shrinks upward on scroll, revealing the stage ground beneath.
 *
 * The wordmark that flies into the nav bar is NOT owned here — see Nav.tsx. The
 * hero only lays out an invisible target box (`[data-hero-wordmark]`) marking
 * where that mark should sit while the hero is on screen. Owning it here meant
 * it scrolled away with the hero and left the bar empty.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const wordmark = useRef<HTMLSpanElement>(null);
  const [showVideo, setShowVideo] = useState(false);

  // The poster IS the hero for most visitors. The 4.6 MB video is a desktop-only
  // enhancement — see shouldLoadHeroVideo for why the CPU gate alone is not enough.
  useEffect(() => {
    if (!shouldLoadHeroVideo()) return;
    const id = window.setTimeout(() => setShowVideo(true), 900);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (showVideo) void document.querySelector('video')?.play?.().catch(() => {});
  }, [showVideo]);

  useEffect(() => {
    /**
     * The hero's scrub is built AFTER first paint, not during hydration.
     *
     * The poster is the LCP element. Building the timeline immediately made
     * GSAP write inline styles while the main thread was still busy, which
     * re-triggered the LCP candidate and pushed the reported LCP to 6.4s —
     * even though the filmstrip showed the hero fully painted at ~2.4s.
     * Deferring to idle leaves the first paint alone.
     */
    let idle = 0;
    let ctx: gsap.Context | undefined;

    const build = () => {
      ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add({ desktop: '(min-width: 768px)', small: '(max-width: 767px)', motion: MQ.motionOK }, (context) => {
        const { desktop, motion } = context.conditions as Record<string, boolean>;
        if (!motion || !media.current) return;


        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            // CSS-reserved track with a sticky inner: no pin spacer, so the
            // document height is final at first paint.
            end: 'bottom bottom',
            scrub: 0.6,
            invalidateOnRefresh: true,
            onEnter: () => { if (media.current) media.current.style.willChange = 'transform, filter'; },
            onLeave: () => { if (media.current) media.current.style.willChange = ''; },
            onLeaveBack: () => { if (media.current) media.current.style.willChange = ''; },
          },
        });

        // Media shrinks upward, revealing the ground beneath. No zoom-in.
        // fromTo, not to: the start filter must be stated explicitly or GSAP
        // substitutes zero for each function and the hero renders black.
        tl.fromTo(media.current,
          { filter: 'brightness(1) blur(0px)' },
          {
            scale: desktop ? 0.88 : 0.94,
            yPercent: desktop ? -6 : -3,
            filter: desktop ? 'brightness(0.55) blur(3px)' : 'brightness(0.62) blur(0px)',
            ease: EASE.scrub,
          }, 0);

      });
      }, root);
    };

    // requestIdleCallback where available, with a timeout so the motion always
    // arrives; a short timer elsewhere (older Safari has no rIC).
    const hasRic = typeof window.requestIdleCallback === 'function';
    idle = hasRic
      ? window.requestIdleCallback(build, { timeout: 2000 })
      : window.setTimeout(build, 600);

    return () => {
      if (hasRic) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      ctx?.revert();
    };
  }, []);

  return (
    <section ref={root} className={styles.hero} data-ground="stage" aria-label={site.name}>
      <div className={styles.sticky}>
      <div className={styles.frame}>
        <div ref={media} className={styles.media}>
          <img
            className={styles.poster}
            src="/videos/hero-poster.webp"
            alt="Bricks Marvella's twin towers reflected in the lake at Tellapur, Hyderabad"
            width={1920}
            height={1080}
            fetchPriority="high"
            decoding="async"
          />
          {showVideo && (
            <video className={styles.video} muted loop playsInline preload="none"
              poster="/videos/hero-poster.webp" aria-hidden="true" tabIndex={-1}>
              <source src="/videos/hero.webm" type="video/webm" />
              <source src="/videos/hero.mp4" type="video/mp4" />
            </video>
          )}
          <div className={styles.scrim} aria-hidden="true" />
        </div>

        {/* The headline, sub-heading and the two CTAs are gone from the hero.
            The <h1> stays in the document but unpainted: this is the home page
            and every other section heading is an h2, so removing it outright
            would leave the page with no first-level heading at all. */}
        <h1 className={styles.srOnly}>
          {heroCopy.headlineLines.map((line) => line.text).join(' ')}
        </h1>
      </div>

      {/* Where the wordmark sits while the hero is on screen. The mark itself
          belongs to the Nav (fixed, so it never scrolls away); this only marks
          the target box for it to measure against. Text is present but
          invisible so the box has the mark's true width at this font size. */}
      <span ref={wordmark} className={styles.wordmarkSlot} data-hero-wordmark aria-hidden="true">
        {heroCopy.wordmark}
      </span>

      <p className={styles.disclaimer}>{legal.imageDisclaimer}</p>
      </div>
    </section>
  );
}
