'use client';

import { useEffect, useRef } from 'react';
import { gsap, MQ, EASE } from '@/lib/gsap';
import { useNearViewport } from '@/lib/useNearViewport';
import styles from './ParallaxOpener.module.css';

/**
 * Section opener: a giant word with images drifting past it at different rates.
 *
 * The detail that sells the depth — and the one most easily lost — is the
 * z-sandwich: roughly half the images pass IN FRONT of the word and half
 * BEHIND it. Each image declares `front: true/false` and gets a z-index either
 * side of the word's.
 *
 * Pure translateY, no rotation. Restraint matters more than movement here.
 */

export interface OpenerImage {
  /**
   * FULL /public stem including the width suffix, e.g.
   * `/images/amenities/gym-560` or `/images/drone/dji_0210-600`.
   * Not every set is emitted at the same widths — the drone images have no
   * 560 — so the caller names the exact file rather than the component
   * assuming one and 404-ing silently.
   */
  src: string;
  alt: string;
  /** Intrinsic size of that file. Sources are not all 16:9. */
  dim?: [number, number];
  /** % of the opener's width/height, and its rendered width in vw. */
  x: number;
  y: number;
  w: number;
  /** in front of the word, or behind it */
  front: boolean;
  /** parallax rate: 1 = scrolls with the page, <1 lags, >1 leads */
  rate: number;
  /** dropped below 768px to keep the composition legible */
  mobile?: boolean;
}

export default function ParallaxOpener({
  word,
  images,
  ground = 'stage',
  id,
}: {
  word: string;
  images: OpenerImage[];
  ground?: 'stage' | 'light';
  id?: string;
}) {
  const root = useRef<HTMLElement>(null);
  const near = useNearViewport(root);

  useEffect(() => {
    if (!near) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add({ wide: '(min-width: 768px)', narrow: '(max-width: 767px)', motion: MQ.motionOK }, (context) => {
        const { wide, motion } = context.conditions as Record<string, boolean>;
        if (!motion) return;
        const range = wide ? 1 : 0.5;   // half the travel on mobile

        gsap.utils.toArray<HTMLElement>(`.${styles.image}`).forEach((el) => {
          const rate = Number(el.dataset.rate ?? 1);
          gsap.fromTo(el,
            { yPercent: 0 },
            {
              // rate 1 means "moves with the page", so only the delta travels
              yPercent: (rate - 1) * 100 * range,
              ease: EASE.scrub,
              scrollTrigger: {
                trigger: root.current,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.8,
              },
            });
        });
      });
    }, root);
    return () => ctx.revert();
  }, [near]);

  return (
    <section ref={root} id={id} className={styles.opener} data-ground={ground} aria-label={word}>
      <div className={styles.stage}>
        {images.map((img) => (
          <div
            key={img.src}
            className={`${styles.image} ${img.front ? styles.front : styles.behind} ${img.mobile === false ? styles.hideMobile : ''}`}
            data-rate={img.rate}
            style={{
              ['--x' as string]: `${img.x}%`,
              ['--y' as string]: `${img.y}%`,
              ['--w' as string]: `${img.w}vw`,
            }}
          >
            <picture>
              <source srcSet={`${img.src}.avif`} type="image/avif" />
              <img
                src={`${img.src}.webp`}
                alt={img.alt}
                width={img.dim?.[0] ?? 560}
                height={img.dim?.[1] ?? 315}
                loading="lazy"
                decoding="async"
              />
            </picture>
          </div>
        ))}

        <h2 className={styles.word} aria-hidden="true">{word}</h2>
      </div>
    </section>
  );
}
