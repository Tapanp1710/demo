'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap, MQ, EASE } from '@/lib/gsap';
import { site, hero as heroCopy, heroPlate } from '@/lib/content';
import plate from '@/lib/hero-plate.json';
import heroSlides from '@/lib/hero-slides.json';
import Wordmark from '@/components/Wordmark/Wordmark';
import styles from './Hero.module.css';

/**
 * Hero: the media shrinks upward on scroll, revealing the stage ground beneath.
 *
 * The wordmark that flies into the nav bar is NOT owned here — see Nav.tsx. The
 * hero only lays out an invisible target box (`[data-hero-wordmark]`) marking
 * where that mark should sit while the hero is on screen. Owning it here meant
 * it scrolled away with the hero and left the bar empty.
 */
/**
 * How long each still is held, in ms.
 *
 * Must stay longer than the crossfade in Hero.module.css or a slide starts
 * leaving before it has finished arriving and the strip reads as a blur.
 */
const SLIDE_MS = 5000;

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const wordmark = useRef<HTMLSpanElement>(null);
  /* Five stills, crossfading. The 4.6 MB video is gone — this is 3.31 MB for
     ALL of them across three widths, and only the first is fetched eagerly.

     The interval does not run under prefers-reduced-motion: an auto-advancing
     carousel is exactly the kind of unrequested movement that setting asks to
     be spared, so those visitors get the first slide and nothing moves. */
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (window.matchMedia(MQ.motionReduced).matches) return;
    const id = window.setInterval(
      () => setSlide((n) => (n + 1) % heroSlides.length),
      SLIDE_MS,
    );
    return () => window.clearInterval(id);
  }, []);

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

        /* The media used to shrink upward and slide up, uncovering the
           section's navy ground around it. That reveal is what put a hard
           rectangle of photograph inside a navy window at every scroll
           position between the two sections — there was no blend, just an
           edge. It only DIMS now: the picture stays full-bleed to all four
           margins and darkens as you leave, so the hero hands over to the next
           section by fading rather than by shrinking away from it.

           fromTo, not to: the start filter must be stated explicitly or GSAP
           substitutes zero for each function and the hero renders black. */
        tl.fromTo(media.current,
          { filter: 'brightness(1) blur(0px)' },
          {
            filter: desktop ? 'brightness(0.5) blur(4px)' : 'brightness(0.6) blur(0px)',
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
          {/* All four are mounted and opacity picks the visible one — the same
              reason the amenities photographs are: swapping a src mid-fade puts
              a network fetch inside the transition. Only the first is eager and
              carries fetchPriority, so it is still the LCP candidate and the
              other three arrive at their leisure. */}
          {heroSlides.map((s, i) => (
            <picture
              key={s.slug}
              className={`${styles.slide} ${i === slide ? styles.slideOn : ''}`}
            >
              <source type="image/avif" sizes="100vw"
                srcSet={s.widths.map((w) => `/images/hero/${s.slug}-${w}.avif ${w}w`).join(', ')} />
              <source type="image/webp" sizes="100vw"
                srcSet={s.widths.map((w) => `/images/hero/${s.slug}-${w}.webp ${w}w`).join(', ')} />
              <img
                src={`/images/hero/${s.slug}-${s.widths[s.widths.length - 1]}.webp`}
                alt={i === 0 ? s.alt : ''}
                width={s.w}
                height={s.h}
                fetchPriority={i === 0 ? 'high' : undefined}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </picture>
          ))}
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

      {/* The supplied marketing plate, over the left of the frame.
          Deliberately a sibling of .frame rather than a child of .media: the
          media tweens brightness and a 4px blur on scroll, and blurring a
          banner whose whole content is small type would make it unreadable at
          exactly the moment it is still on screen. The photograph recedes; this
          stays sharp. */}
      {/* The banner opens the enquiry dialog. ContactDialog intercepts any
          click on a #leadform link in the capture phase, so this needs no
          handler of its own and works identically to the sticky button.

          The WHOLE banner is the target, not a hotspot over the two BOX PRICE
          pills. Pinning boxes to pixel positions in the artwork would break the
          next time it is re-exported — it has already changed from 1080x1080
          square to 1145x2056 portrait, with the pills landing somewhere new
          each time — and the price is the reason anyone taps a price banner, so
          a larger target is the right one anyway. */}
      <a
        href="/#leadform"
        className={styles.plateLink}
        aria-label="Request the price for Bricks Marvella"
      >
        <picture className={styles.plate}>
          <source type="image/avif"
            srcSet={plate.widths.map((w) => `${plate.src}-${w}.avif ${w}w`).join(', ')} />
          <source type="image/webp"
            srcSet={plate.widths.map((w) => `${plate.src}-${w}.webp ${w}w`).join(', ')} />
          <img src={`${plate.src}-${plate.widths[plate.widths.length - 1]}.webp`}
            alt={heroPlate.alt} width={plate.w} height={plate.h} decoding="async" />
        </picture>
      </a>

      {/* Where the wordmark sits while the hero is on screen. The mark itself
          belongs to the Nav (fixed, so it never scrolls away); this only marks
          the target box for it to measure against. Text is present but
          invisible so the box has the mark's true width at this font size. */}
      <span ref={wordmark} className={styles.wordmarkSlot} data-hero-wordmark aria-hidden="true">
        <Wordmark />
      </span>

      </div>
    </section>
  );
}
