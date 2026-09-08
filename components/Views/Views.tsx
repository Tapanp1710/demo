'use client';

import { useEffect, useRef } from 'react';
import { anchors, views } from '@/lib/content';
import { MQ } from '@/lib/gsap';
import { useNearViewport } from '@/lib/useNearViewport';
import styles from './Views.module.css';

/**
 * The aerial film, full bleed, directly under the hero.
 *
 * Two encodes, picked by viewport — 19 MB at crf 24 on a pointer device, 2.9 MB
 * at crf 31 on a phone, both 1920x1080. scripts/build-video.mjs has always
 * written both; only the heavy one was ever loaded, at every size.
 *
 * That was once deliberate: the section cropped the film to a portrait 62svh on
 * a phone, which upscales it, and the bitrate paid for the upscale. The crop is
 * gone — a phone now gets the whole 16:9 frame in a band — so the only thing
 * the heavy file buys on mobile data is a longer wait before anything moves.
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
  const visible = useRef(false);

  useEffect(() => {
    const el = video.current;
    if (!near || !el) return;

    /* THE MOBILE RUNG, on a phone. Both encodes are 1920x1080 and differ only
       in CRF — 24 against 31 — so this is 2.9 MB where the desktop file is 19,
       at the same pixel count. See scripts/build-video.mjs, which has always
       produced both; nothing was ever loading this one.
       Keeping the heavy file everywhere was a REASONED choice once: the section
       used to crop the film to a portrait 62svh on a phone, upscaling it, and
       the extra bitrate paid for that. It does not crop any more — the phone
       shows the whole 16:9 frame in a ~219px band — so 19 MB over mobile data
       now buys nothing and costs the one thing that matters, which is whether
       it ever buffers enough to start at all. */
    el.src = window.matchMedia(MQ.mobile).matches
      ? '/videos/views-mobile.mp4'
      : '/videos/views-1080.mp4';
    /* `preload="none"` in the markup is what keeps the file off the initial
       load. Once we are deliberately within a screen and a half of the section,
       buffering is the whole point — otherwise the first frame arrives late and
       the poster visibly jumps. */
    el.preload = 'auto';
    el.load();

    /* Reduced motion gets the poster and real controls instead. An autoplaying
       loop is precisely what that setting asks us not to do, but never offering
       the film at all is not the same as respecting it. */
    if (window.matchMedia(MQ.motionReduced).matches) {
      el.controls = true;
      return;
    }

    /* REFUSED is not the same as failed. iOS in Low Power Mode blocks autoplay
       outright however muted the film is, and so do the data-saver modes — the
       promise rejects, and the rejection used to be swallowed into an empty
       catch, which left the reader looking at a poster with no way to ask for
       the film. Handing the element its own controls turns a dead frame into a
       tappable one, which is the same fallback the reduced-motion branch above
       already gives. */
    const attempt = () => { void el.play().catch(() => { el.controls = true; }); };

    /* Playback follows visibility: a loop running behind five other sections is
       battery spent on something nobody is looking at. */
    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = e.isIntersecting;
        if (e.isIntersecting) attempt();
        else el.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(el);

    const onCanPlay = () => {
      if (visible.current) attempt();
    };
    el.addEventListener('canplay', onCanPlay);

    const onVisibility = () => { if (document.hidden) el.pause(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      io.disconnect();
      el.removeEventListener('canplay', onCanPlay);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [near]);

  return (
    <section
      ref={root}
      id={anchors.views}
      className={styles.section}
      data-ground="stage"
      aria-label={views.alt}
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

    </section>
  );
}
