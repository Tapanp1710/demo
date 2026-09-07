'use client';

import { useEffect, useRef, useState } from 'react';
import { MQ } from '@/lib/gsap';
import styles from './VideoFacade.module.css';

/**
 * YouTube, loaded late. The player is ~1 MB and must never be in the critical
 * path, so until it is wanted this is a thumbnail and a button. The box is
 * reserved by aspect-ratio, so swapping in the iframe shifts nothing.
 *
 * `autoStart` gives it two behaviours, and they are separate things:
 *
 *   MOUNT, once, on approach. Putting the iframe in eagerly would drop that
 *   megabyte in front of the hero and undo the whole point of the facade, so
 *   an observer with a 200px margin swaps it in just before it is needed and
 *   then stops watching. A visitor who never scrolls this far loads nothing.
 *
 *   PLAY and PAUSE, repeatedly, on entering and leaving the section. That
 *   cannot be done by mounting and unmounting — remounting refetches the
 *   player and restarts from zero — so the iframe stays put and is driven
 *   through YouTube's postMessage API instead, which needs `enablejsapi=1`
 *   on the embed URL. Leaving pauses; coming back resumes where it stopped.
 *
 * It starts MUTED, and that is not a preference: every current browser blocks
 * autoplay with sound, and an unmuted autoplay request is simply refused —
 * the video would sit there on its first frame. Muted it plays, and the
 * player's own control gives the sound back in one click.
 *
 * prefers-reduced-motion opts out of BOTH: no auto-mount, no auto-play, and
 * the click-to-play facade stays. A video starting by itself is exactly the
 * unrequested movement that setting exists to prevent.
 */
export default function VideoFacade({
  id,
  title,
  className,
  autoStart = false,
}: {
  id: string;
  title: string;
  className?: string;
  autoStart?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [auto, setAuto] = useState(false);
  const host = useRef<HTMLButtonElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  /* The player cannot be spoken to until it exists. Until the iframe has
     loaded, its contentWindow is still about:blank, so a postMessage aimed at
     youtube-nocookie.com is refused outright — "the target origin does not
     match the recipient window's origin" — and the command is simply lost.
     The wanted state is held here and sent as soon as the player is there. */
  const ready = useRef(false);
  const wanted = useRef<string | null>(null);

  /* 1. Mount on approach, then stop watching. */
  useEffect(() => {
    if (!autoStart || playing) return;
    if (window.matchMedia(MQ.motionReduced).matches) return;
    const el = host.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setAuto(true);
          setPlaying(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoStart, playing]);

  /* 2. Play on entry, pause on exit — for as long as the page is open.
        A third of the player has to be on screen to count as "in the
        section": a threshold of 0 would fire on the first pixel, so the video
        would start while it was still a sliver at the edge of the window. */
  useEffect(() => {
    if (!auto || !playing) return;
    const el = frame.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const send = (func: string) => {
      wanted.current = func;
      if (!ready.current) return;
      el.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args: [] }),
        'https://www.youtube-nocookie.com',
      );
    };

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => send(e.isIntersecting ? 'playVideo' : 'pauseVideo')),
      { threshold: 0.35 },
    );
    io.observe(el);

    /* A backgrounded tab is "left" too — otherwise the audio, once someone
       unmutes it, follows them to whatever they switched to. */
    const onVisibility = () => { if (document.hidden) send('pauseVideo'); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [auto, playing]);

  if (playing) {
    /* enablejsapi is what makes the postMessage commands above work at all,
       and origin is the pair to it: without it the player accepts commands
       from any frame, which is precisely what the targeted postMessage above
       is avoiding. */
    const params = new URLSearchParams({
      autoplay: '1',
      playsinline: '1',
      rel: '0',
      /* modestbranding drops the wordmark from the control bar, rel=0 keeps
         the end screen to this channel, and iv_load_policy=3 turns off the
         annotation layer. None of them hide the controls — hover still gets a
         full player — they just stop it advertising itself while it runs. */
      modestbranding: '1',
      iv_load_policy: '3',
      ...(auto ? { mute: '1', enablejsapi: '1', origin: window.location.origin } : {}),
    });
    return (
      /* The iframe is wrapped rather than styled directly, because what makes
         the YouTube furniture appear is the POINTER being over the player —
         its title bar, controls, "More videos" and logo are all reactions to
         mouse movement. The wrapper takes those events away until you hover
         it, so at rest this reads as a piece of film on the page rather than
         as an embed. Hovering hands them straight back, controls and all. */
      <div className={[styles.shell, className].filter(Boolean).join(' ')}>
        <iframe
          ref={frame}
          onLoad={() => {
            ready.current = true;
            /* Catch up: if it scrolled out of view while the player was still
               loading, the pause that was dropped is applied now. */
            const f = wanted.current;
            if (f) {
              frame.current?.contentWindow?.postMessage(
                JSON.stringify({ event: 'command', func: f, args: [] }),
                'https://www.youtube-nocookie.com',
              );
            }
          }}
          className={styles.frame}
          src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      ref={host}
      type="button"
      className={[styles.facade, className].filter(Boolean).join(' ')}
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${title}`}
      style={{ backgroundImage: `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)` }}
    >
      <span className={styles.play} aria-hidden="true" />
      <span className={styles.caption}>{title}</span>
    </button>
  );
}
