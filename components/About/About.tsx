'use client';

import { useEffect, useRef } from 'react';
import { gsap, MQ, EASE, DUR } from '@/lib/gsap';
import { about, anchors } from '@/lib/content';
import LineReveal from '@/components/LineReveal/LineReveal';
import VideoFacade from '@/components/VideoFacade/VideoFacade';
import { useNearViewport } from '@/lib/useNearViewport';
import styles from './About.module.css';

/**
 * Two-column editorial: a large serif pull-quote against the body copy, with
 * the project film behind a facade. Body text fades up a word at a time —
 * a light touch, entry-triggered once, never scrubbed.
 */
export default function About() {
  const root = useRef<HTMLElement>(null);
  const near = useNearViewport(root);

  useEffect(() => {
    if (!near) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motionOK, () => {
        /**
         * Transform only — never opacity on body copy. A `from` tween sets its
         * start state immediately, so fading words up from opacity 0.15 left
         * the paragraph sitting unreadable until it was scrolled into view,
         * which axe correctly flags as a contrast failure (and which anyone
         * landing mid-page would actually experience).
         */
        gsap.from(`.${styles.word}`, {
          yPercent: 40,
          duration: DUR.entrance,
          ease: EASE.entrance,
          stagger: 0.012,
          scrollTrigger: { trigger: `.${styles.body}`, start: 'top 82%', once: true },
        });
      });
    }, root);
    return () => ctx.revert();
  }, [near]);

  return (
    <section ref={root} id={anchors.about} className={styles.section} aria-labelledby="about-heading">
      <div className={styles.inner}>
        <div className={styles.left}>
          <p className={styles.eyebrow}>{about.heading}</p>
          <LineReveal
            as="h2"
            id="about-heading"
            className={styles.quote}
            lines={[{ text: 'A home that checks all the boxes' }]}
          />
        </div>

        <div className={styles.right}>
          {/* The space MUST sit outside the span: `display: inline-block`
              collapses an element's own trailing whitespace, which ran every
              word together into one unreadable string. */}
          <p className={styles.body}>
            {about.body.split(' ').map((w, i) => (
              <span key={`${w}-${i}`}>
                <span className={styles.word}>{w}</span>{' '}
              </span>
            ))}
          </p>
        </div>

        {/* Across the foot of both columns: stacked under the body it was the
            item that ran past the bottom of the section and got clipped. */}
        <VideoFacade id={about.videoId} title={about.videoTitle} className={styles.video} />
      </div>
    </section>
  );
}
