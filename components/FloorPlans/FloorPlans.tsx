'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap, MQ, EASE, DUR } from '@/lib/gsap';
import { floorPlans, anchors, legal } from '@/lib/content';
import LineReveal from '@/components/LineReveal/LineReveal';
import { useNearViewport } from '@/lib/useNearViewport';
import styles from './FloorPlans.module.css';

/**
 * Tower A / Tower B card decks. Cards are offset in translateZ and translateY
 * and fanned with a slight rotateZ; scroll deals the top card away to reveal
 * the next — a vertical ascent tied to the "32 floors" stat.
 *
 * The tower toggle flips between decks. Every card keeps a link to the
 * full-size plan, and each deck renders as a plain list under reduced motion.
 */
export default function FloorPlans() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const near = useNearViewport(root);
  const [tower, setTower] = useState<'A' | 'B'>('A');
  const deck = floorPlans.filter((p) => p.tower === tower);
  const firstRender = useRef(true);

  /**
   * Swapping towers is a transition, not a jump.
   *
   * The tween is on the STAGE, never on the cards: the scrub timeline owns the
   * cards' transforms, and animating the same properties from here would have
   * the two fighting over them mid-scroll.
   */
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (!stage.current || window.matchMedia(MQ.motionReduced).matches) return;
    gsap.fromTo(stage.current,
      { xPercent: tower === 'B' ? 6 : -6, opacity: 0.4 },
      { xPercent: 0, opacity: 1, ease: EASE.deck, duration: DUR.deck, overwrite: true });
  }, [tower]);

  useEffect(() => {
    if (!near) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motionOK, () => {
        const cards = gsap.utils.toArray<HTMLElement>(`.${styles.card}`);
        if (!cards.length) return;

        /**
         * No `pin`. The section is a tall track with a sticky inner (see the
         * CSS), so the scroll length is reserved from first paint.
         *
         * ScrollTrigger's own pin inserts a .pin-spacer when the trigger builds,
         * and these triggers build lazily — so a fast scroll that outran the
         * build had the spacer appear ABOVE the reader, pushing all content
         * below it down. Measured: 4,179px of backward slip in one flick.
         * A CSS-reserved track cannot do that, because the document height
         * never changes.
         */
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        });

        // Deal each card away in turn, last card stays. power3.out so a card
        // decelerates as it leaves rather than sliding at a constant rate.
        cards.slice(0, -1).forEach((card, i) => {
          tl.to(card, {
            xPercent: -120,
            rotateY: -25,
            opacity: 0,
            ease: EASE.deck,
            duration: 1,
          }, i);
        });
      });
    }, root);
    return () => ctx.revert();
  }, [tower, near]);

  return (
    <section
      ref={root}
      id={anchors.floorPlan}
      className={styles.section}
      data-ground="light"
      aria-labelledby="plans-heading"
      /* The scroll length is reserved in the document, not added later by a
         pin spacer. One deck-length per card, matching the timeline below. */
      style={{ ['--scroll-len' as string]: `${deck.length * 70}svh` }}
    >
      <div className={styles.sticky}>
      <div className={styles.head}>
        <p className={styles.eyebrow}>Residences</p>
        <LineReveal as="h2" id="plans-heading" className={styles.heading} lines={[{ text: 'Floor Plans' }]} />

      </div>

      {/* The deck is presentational: the cards sit on top of one another, so as
          interactive elements they were overlapping touch targets that failed
          WCAG target-size. The real, reachable links are the row beneath. */}
      {/* The tower choice sits with the unit links in the left rail, not under
          the centred heading — the two controls belong together and the
          heading row is shorter without it, which the drawing takes. */}
      <div className={styles.toggle} role="tablist" aria-label="Choose a tower">
        {(['A', 'B'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tower === t}
            className={`${styles.toggleBtn} ${tower === t ? styles.toggleActive : ''}`}
            onClick={() => setTower(t)}
          >
            Tower {t}
          </button>
        ))}
      </div>

      <div ref={stage} className={styles.stage} aria-hidden="true">
        {deck.map((plan, i) => (
          <span
            key={plan.id}
            className={styles.card}
            style={{ ['--i' as string]: String(i), zIndex: String(deck.length - i) }}
          >
            <picture>
              {/* 72vw, not min(62rem, …). That 62rem was the deck's old
                  max-width, removed when the drawings were made full size —
                  the stale value had the browser picking the 1000px file for a
                  1353px box, a 1.35x upscale on the one image whose room
                  labels are the point of the section. */}
              <source type="image/avif" sizes="(max-width: 991px) 92vw, 72vw"
                srcSet={`${plan.image}-1000.avif 1000w, ${plan.image}-1600.avif 1600w, ${plan.image}-2560.avif 2560w`} />
              <source type="image/webp" sizes="(max-width: 991px) 92vw, 72vw"
                srcSet={`${plan.image}-1000.webp 1000w, ${plan.image}-1600.webp 1600w, ${plan.image}-2560.webp 2560w`} />
              <img src={`${plan.image}-1000.webp`} alt={plan.alt} width={1600} height={978} loading="lazy" decoding="async" />
            </picture>
            <span className={styles.cardLabel}>{plan.label}</span>
          </span>
        ))}
      </div>

      {/* The unit pills are OFF the layout but not out of the document. The
          deck itself is aria-hidden presentational — its cards overlap, which
          made them failing touch targets — so these links are the only way to
          reach a full-size plan without a mouse. They are visually hidden and
          come back on focus, the skip-link pattern, rather than deleted. */}
      <ul className={styles.planLinks}>
        {deck.map((plan) => (
          <li key={plan.id}>
            <a href={`${plan.image}-2560.webp`} target="_blank" rel="noreferrer">
              <span className="tabular">Units {plan.units}</span>
            </a>
          </li>
        ))}
      </ul>

      <p className={styles.disclaimer}>{legal.imageDisclaimer}</p>
      </div>

      {/* Reduced motion: every plan of both towers, as a plain list. */}
      <ul className={styles.fallback}>
        {floorPlans.map((plan) => (
          <li key={plan.id}>
            <a href={`${plan.image}-2560.webp`} target="_blank" rel="noreferrer">
              <picture>
                <source srcSet={`${plan.image}-1000.avif`} type="image/avif" />
                <img src={`${plan.image}-1000.webp`} alt={plan.alt} width={1000} height={611} loading="lazy" decoding="async" />
              </picture>
              <span>{plan.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
