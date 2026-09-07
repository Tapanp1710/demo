'use client';

import { useEffect, useRef } from 'react';
import { anchors, views } from '@/lib/content';
import { MQ } from '@/lib/gsap';
import { useNearViewport } from '@/lib/useNearViewport';
import LineReveal from '@/components/LineReveal/LineReveal';
import styles from './Views.module.css';

/**
 * The aerial film, full bleed, directly under the hero.
 *
 * Two rungs are encoded (see scripts/build-video.mjs) and the choice is made
 * HERE in JavaScript rather than with `<source media="…">`: the media attribute
 * is honoured inside `<picture>` only — on `<video>` browsers ignore it, so a
 * phone would silently download the heavier file. Both rungs are 1920x1080 and
 * differ only in compression — the section covers the viewport, and covering a
 * portrait phone scales the footage by its height, so a shorter file would be
 * upscaled about 3.3x. Resolution was the binding constraint there, not CRF.
 *
 * Nothing is fetched until the section is within reach. The `<video>` renders
 * from the first paint so its poster paints with the rest of the page, but it
 * carries no `src` and `preload="none"`, so the section costs one 180 KB still
 * until the reader is a screen and a half away. That matters: the hero video
 * this repo used to ship was deleted for being megabytes on load, and dropping
 * a 12 MB render in its place would have undone that decision twice over.
 *
 * Everything below is set on the element imperatively rather than through
 * state, which is how the rest of this codebase reads media queries — and here
 * it also means the approach, the source choice and the play/pause subscription
 * are one effect with one dependency instead of three renders.
 */
export default function Views() {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const near = useNearViewport(root);

  useEffect(() => {
    const el = video.current;
    if (!near || !el) return;

    el.src = window.matchMedia('(max-width: 767px)').matches
      ? '/videos/views-mobile.mp4'
      : '/videos/views-1080.mp4';
    /* `preload="none"` in the markup is what keeps the file off the initial
       load. Once we are deliberately within a screen and a half of the section,
       buffering is the whole point — otherwise the first frame arrives late and
       the poster visibly jumps. */
    el.preload = 'auto';

    /* Reduced motion gets the poster and real controls instead. An autoplaying
       loop is precisely what that setting asks us not to do, but never offering
       the film at all is not the same as respecting it. */
    if (window.matchMedia(MQ.motionReduced).matches) {
      el.controls = true;
      return;
    }

    /* Playback follows visibility: a loop running behind five other sections is
       battery spent on something nobody is looking at. */
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) void el.play().catch(() => {}); else el.pause(); },
      { threshold: 0.35 },
    );
    io.observe(el);

    const onVisibility = () => { if (document.hidden) el.pause(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [near]);

  return (
    <section
      ref={root}
      id={anchors.views}
      className={styles.section}
      data-ground="stage"
      aria-labelledby="views-heading"
    >
      <video
        ref={video}
        className={styles.video}
        poster="/videos/views-poster.webp"
        aria-label={views.alt}
        muted
        loop
        playsInline
        preload="none"
      />

      {/* Darkens the head and the foot of the frame only, so the middle of the
          shot stays untouched while the type keeps its contrast. */}
      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.copy}>
        {/* <p className={styles.eyebrow}>{views.eyebrow}</p>
        <LineReveal
          as="h2"
          id="views-heading"
          className={styles.heading}
          lines={[...views.lines]}
        />
        <p className={styles.sub}>{views.sub}</p> */}
      </div>
    </section>
  );
}
