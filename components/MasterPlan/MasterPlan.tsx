'use client';

import { useEffect, useRef } from 'react';
import { gsap, MQ, EASE } from '@/lib/gsap';
import { masterPlan, anchors, legal, stats } from '@/lib/content';
import { StatList } from '@/components/StatBand/StatBand';
import LineReveal from '@/components/LineReveal/LineReveal';
import { useNearViewport } from '@/lib/useNearViewport';
import styles from './MasterPlan.module.css';

/**
 * Circle → rounded rect → full bleed, scrubbed across a pinned section.
 *
 * clip-path does NOT interpolate between circle() and inset(): they are
 * different shape functions and browsers refuse the transition. Both Chrome
 * and Safari behave this way, so the whole animation runs on inset() only —
 * a large border-radius on a square inset IS a circle, so one shape function
 * covers all three states:
 *
 *   inset(0 34% round 50%)  ->  inset(0% round 24px)  ->  inset(0% round 0)
 *
 * That keeps it to a single interpolatable property and avoids an SVG mask.
 * The image counter-scales 1.15 -> 1 so the subject doesn't appear to zoom
 * while the mask opens.
 *
 * clip-path is the one property allowed outside transform/opacity here; it is
 * composited on both engines and measured in the QA pass.
 */
export default function MasterPlan() {
  const root = useRef<HTMLElement>(null);
  const near = useNearViewport(root);
  const frame = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!near) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(MQ.motionOK, () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            // CSS-reserved track with a sticky inner — no pin spacer, so the
            // document height cannot change when this builds.
            end: 'bottom bottom',
            scrub: 0.6,
            invalidateOnRefresh: true,
            onEnter: () => { if (frame.current) frame.current.style.willChange = 'clip-path'; },
            onLeave: () => { if (frame.current) frame.current.style.willChange = ''; },
            onLeaveBack: () => { if (frame.current) frame.current.style.willChange = ''; },
          },
        });

        /**
         * The mask, as three chained inset() states — never circle().
         *
         * clip-path does not interpolate between DIFFERENT shape functions, so
         * a circle() -> inset() tween simply snaps in both Chromium and WebKit.
         * A square inset with a 50% radius IS a circle, so the whole sequence
         * stays inside one function and every step interpolates:
         *
         *   circle  ->  large rounded rect  ->  the full frame
         *
         * Both insets are measured, not written down: the frame's proportion
         * changes with the viewport, so a fixed percentage is only round at one
         * size. Function-based values re-run on every refresh.
         */
        /**
         * The opening shape is the WIDE CURVED RECTANGLE — not a circle, and
         * not the smaller rectangle it briefly was. A circle showed about a
         * third of the drawing and cropped the legend for most of the scroll;
         * this shows the whole site, legend included, from the first frame and
         * only loses its margins as you scroll.
         *
         * The corner radius is an explicit pixel value. `round 50%` resolves
         * against the inset rectangle and gets clamped, which draws a squircle
         * whose curvature changes with the viewport.
         */

        /** The resting shape: a wide rounded rectangle inset from the frame. */
        const rectMask = () => {
          const el = frame.current;
          if (!el) return 'inset(0% 8% round 24px)';
          const { height } = el.getBoundingClientRect();
          const y = height ? Math.min(12, ((height * 0.12) / height) * 100) : 8;
          return `inset(${y.toFixed(2)}% 8% round 24px)`;
        };

        tl.fromTo(frame.current,
          { clipPath: rectMask },
          { clipPath: 'inset(0% 0% round 0px)', ease: EASE.scrub, duration: 1 }, 0);

        /* A gentler counter-scale than before: the mask now travels a fraction
           of what it did, and 1.15 against that read as the image drifting. */
        tl.fromTo(img.current, { scale: 1.06 }, { scale: 1, ease: EASE.scrub, duration: 1 }, 0);
      });
    }, root);
    return () => ctx.revert();
  }, [near]);

  return (
    <section ref={root} id={anchors.masterPlan} className={styles.section} data-ground="light" aria-labelledby="masterplan-heading">
      <div className={styles.sticky}>
      {/* The six project figures, split evenly either side of the plan. */}
      <div className={`${styles.rail} ${styles.railLeft}`}>
        <StatList items={stats.slice(0, Math.ceil(stats.length / 2))} vertical />
      </div>

      <div className={styles.head}>
        <p className={styles.eyebrow}>The site</p>
        <LineReveal as="h2" id="masterplan-heading" className={styles.heading} lines={[{ text: 'Master Plan' }]} />
      </div>

      <div ref={frame} className={styles.frame}>
        <picture>
          <source type="image/avif" sizes="100vw"
            srcSet={`${masterPlan.image}-900.avif 900w, ${masterPlan.image}-1400.avif 1400w, ${masterPlan.image}-2048.avif 2048w`} />
          <source type="image/webp" sizes="100vw"
            srcSet={`${masterPlan.image}-900.webp 900w, ${masterPlan.image}-1400.webp 1400w, ${masterPlan.image}-2048.webp 2048w`} />
          <img
            ref={img}
            src={`${masterPlan.image}-1400.webp`}
            alt={masterPlan.alt}
            width={2048}
            height={1252}
            loading="lazy"
            decoding="async"
          />
        </picture>
      </div>

      <div className={`${styles.rail} ${styles.railRight}`}>
        <StatList items={stats.slice(Math.ceil(stats.length / 2))} vertical />
      </div>

      <p className={styles.disclaimer}>{legal.imageDisclaimer}</p>
      </div>

      {/* Reduced motion / no-JS: the plan simply renders, full width. */}
      <noscript>
        <img src={`${masterPlan.image}-1400.webp`} alt={masterPlan.alt} width={1400} height={856} />
      </noscript>
    </section>
  );
}
