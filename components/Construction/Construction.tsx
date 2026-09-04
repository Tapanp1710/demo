'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { construction, anchors, site } from '@/lib/content';
import LineReveal from '@/components/LineReveal/LineReveal';
import VideoFacade from '@/components/VideoFacade/VideoFacade';
import styles from './Construction.module.css';

/**
 * Horizontal timeline of every construction update, newest first.
 *
 * The rail used to be dragged by SCROLL: a tall CSS track held the section
 * sticky and a ScrollTrigger scrubbed the rail's x. Two problems with that.
 * The reader had no way to go back along the timeline without scrolling the
 * page backwards, and the section had to hold the head, the rail and the video
 * inside one viewport for its whole track — on a short window the rail was the
 * box that lost the fight and the dates under the dots were clipped.
 *
 * It is now an ordinary one-screen section with a rail you move yourself:
 * drag it, flick it on a trackpad, or tab to it and use the arrow keys. That
 * is a native scroll container, so every one of those comes free and the
 * section no longer needs a scroll track at all.
 */
type Shot = { stem: string; widths: number[]; w: number; h: number };
export type StatusEntry = { date: string; slug: string; video: string | null; images: Shot[] };

export default function Construction({ entries }: { entries: StatusEntry[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);

  /* Which update the foot is showing. Opens on the newest, which is the one
     with the film; picking any other stop swaps the film for that month's
     photographs. */
  const [active, setActive] = useState(0);
  const shown = entries[active] ?? entries[0];

  /* Pointer drag panning. Wheel, touch and keyboard are the container's own. */
  const onPointerDown = (e: React.PointerEvent) => {
    const el = wrap.current;
    if (!el || e.button !== 0) return;
    drag.current = { x: e.clientX, left: el.scrollLeft };
    el.setPointerCapture(e.pointerId);
    el.classList.add(styles.dragging);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = wrap.current;
    if (!el || !drag.current) return;
    el.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
  };

  const endDrag = (e: React.PointerEvent) => {
    const el = wrap.current;
    if (!el || !drag.current) return;
    drag.current = null;
    el.releasePointerCapture(e.pointerId);
    el.classList.remove(styles.dragging);
  };

  return (
    <section id={anchors.construction} className={styles.section} data-ground="stage" aria-labelledby="construction-heading">
      <div className={styles.sticky}>
      <div className={styles.head}>
        <p className={styles.eyebrow}>{construction.eyebrow}</p>
        <LineReveal
          as="h2"
          id="construction-heading"
          className={styles.heading}
          lines={[{ text: `${construction.heading[0]} ${construction.heading[1]}` }]}
        />
      </div>

      <div
        ref={wrap}
        className={styles.railWrap}
        /* Focusable so the arrow keys reach it; named so that focus means
           something when it lands here. */
        tabIndex={0}
        role="group"
        aria-label="Construction timeline — drag or use the arrow keys"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <ol className={styles.rail}>
          {entries.map(({ date, images }, i) => (
            <li key={date} className={styles.stop}>
              {/* The stop IS the control: picking it shows that month below. */}
              <button
                type="button"
                className={`${styles.stopBtn} ${i === active ? styles.stopActive : ''} ${date === construction.current ? styles.current : ''}`}
                aria-pressed={i === active}
                onClick={() => setActive(i)}
              >
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.date}>{date}</span>
                <span className={styles.count}>
                  {images.length ? `${images.length} photos` : 'Update'}
                </span>
              </button>
              {date === construction.current && <span className={styles.badge}>Latest</span>}
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.foot}>
        {shown.images.length > 0 ? (
          /* That month's photographs, in the same box the film uses. Keyed on
             the slug so React swaps the node rather than patching it, which is
             what restarts the entry animation. */
          <div key={shown.slug} className={styles.shots} aria-label={`${shown.date} — construction photographs`}>
            {shown.images.map((img, i) => (
              <picture key={img.stem}>
                <source srcSet={`${img.stem}-${img.widths[0]}.avif`} type="image/avif" />
                <img
                  src={`${img.stem}-${img.widths[0]}.webp`}
                  alt={`${site.name} construction progress, ${shown.date} — photograph ${i + 1}`}
                  width={img.w}
                  height={img.h}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            ))}
          </div>
        ) : (
          /* No photographs that month — it was a film update. Three of the
             twenty are: the site published a video and nothing else, which is
             why they looked empty before the manifest carried the id. */
          <VideoFacade
            key={shown.slug}
            id={shown.video ?? construction.videoId}
            title={`${site.name} construction update — ${shown.date}`}
            className={styles.video}
          />
        )}
        <Link href={construction.ctaHref} className={styles.cta}>{construction.ctaLabel}</Link>
      </div>
      </div>
    </section>
  );
}
