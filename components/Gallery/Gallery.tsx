'use client';

import { useEffect, useRef } from 'react';
import { gsap, MQ, EASE } from '@/lib/gsap';
import { anchors } from '@/lib/content';
import gallerySlides from '@/lib/gallery-slides.json';
import { useNearViewport } from '@/lib/useNearViewport';
import LineReveal from '@/components/LineReveal/LineReveal';
import styles from './Gallery.module.css';

/**
 * The hero's stills again, but laid out as a strip you travel ALONG: scrolling
 * down moves the row sideways, so the vertical gesture reads as a horizontal
 * pan across the project.
 *
 * It has its OWN manifest, lib/gallery-slides.json. It used to share the
 * hero's, so that replacing the hero's photographs replaced these too — which
 * stopped being what was wanted the moment the two sections were given
 * different pictures. The hero carries the newer renders; this strip keeps the
 * four originals.
 *
 * No `pin`. The section is a tall track with a sticky inner (see the CSS), so
 * the scroll length is reserved from first paint and the document never
 * changes height when the trigger builds.
 */
export default function Gallery() {
  const root = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const near = useNearViewport(root);

  useEffect(() => {
    if (!near) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motionOK, () => {
        const strip = rail.current;
        const port = viewport.current;
        if (!strip || !port) return;

        /* Functional value, re-read on every refresh: the travel is the
           overhang, which depends on the viewport width and on how the images
           finally lay out. Measuring it once at build time is how a strip ends
           up stopping short of its last frame on one breakpoint. */
        gsap.to(strip, {
          x: () => -Math.max(0, strip.scrollWidth - port.clientWidth),
          ease: EASE.scrub,
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        });
      });
    }, root);
    return () => ctx.revert();
  }, [near]);

  return (
    <section
      ref={root}
      id={anchors.gallery}
      className={styles.section}
      data-ground="stage"
      aria-labelledby="gallery-heading"
    >
      <div className={styles.sticky}>
        <div className={styles.head}>
          <LineReveal
            as="h2"
            id="gallery-heading"
            className={styles.heading}
            lines={[{ text: 'Experience the luxury' }]}
            // 360° views
          />
        </div>

        {/* The window. The rail is wider than it is and slides underneath. */}
        <div ref={viewport} className={styles.viewport}>
          <div ref={rail} className={styles.rail}>
            {gallerySlides.map((s, i) => (
              <figure key={s.slug} className={styles.frame}>
                <picture>
                  <source
                    type="image/avif"
                    sizes="(max-width: 767px) 86vw, 62vw"
                    srcSet={s.widths.map((w) => `/images/gallery/${s.slug}-${w}.avif ${w}w`).join(', ')}
                  />
                  <source
                    type="image/webp"
                    sizes="(max-width: 767px) 86vw, 62vw"
                    srcSet={s.widths.map((w) => `/images/gallery/${s.slug}-${w}.webp ${w}w`).join(', ')}
                  />
                  <img
                    src={`/images/gallery/${s.slug}-${s.widths[s.widths.length - 1]}.webp`}
                    alt={s.alt}
                    width={s.w}
                    height={s.h}
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
                <figcaption className={styles.caption}>
                  <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
                  {s.alt}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
