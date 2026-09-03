'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, MQ, EASE, DUR } from '@/lib/gsap';
import { amenities, amenityCategories, legal, anchors, type AmenityCategory } from '@/lib/content';
import { useNearViewport } from '@/lib/useNearViewport';
import LineReveal from '@/components/LineReveal/LineReveal';
import amenityImages from '@/lib/amenity-images.json';
import styles from './AmenityCube.module.css';

/**
 * Amenities: the old site's overlaid name grid, driven by a rotating cube.
 *
 * The names are the navigation and the cube is the single display surface —
 * hover or focus a name and the cube turns a quarter to reveal that amenity.
 *
 * Nineteen amenities on a four-sided solid: the cube only ever needs the face
 * currently front and the one about to arrive. Each step paints the incoming
 * image onto the face that is 90° away, then rotates. The rotation counter is
 * unbounded, so it turns forever in either direction with no reset, and the
 * two faces the viewer never sees hold whatever they last showed.
 *
 * Every name is a real link to its amenity page; hover is a preview, the click
 * still navigates.
 */

/** What the pipeline actually emitted per slug — see scripts/build-amenity-images.mjs. */
const images: Record<string, { w: number; h: number; widths: number[] }> = amenityImages;
const FACES = 4;
const QUARTER = 90;

/** srcSet from the widths that exist. Four amenities top out at 900px, and
 *  hardcoding 1400 for those requests a file that was never written. */
const srcSet = (base: string, slug: string, ext: string) =>
  (images[slug]?.widths ?? [560]).map((w) => `${base}-${w}.${ext} ${w}w`).join(', ');
/* The face is max(100vw,100svh)*1.3 wide, so on a portrait phone its width is
   driven by the VIEWPORT HEIGHT, not the width — ~250vw at a 412x823 phone.
   Describing it as 130vw there picked the 560px file for a 1070px face. */
const SIZES = '(max-width: 767px) 250vw, 130vw';

const largest = (slug: string) => images[slug]?.widths.at(-1) ?? 560;

type Filter = 'All' | AmenityCategory;

export default function AmenityCube() {
  const root = useRef<HTMLElement>(null);
  const cube = useRef<HTMLDivElement>(null);
  const near = useNearViewport(root);

  const [filter, setFilter] = useState<Filter>('All');
  const list = useMemo(
    () => (filter === 'All' ? amenities : amenities.filter((a) => a.category === filter)),
    [filter],
  );

  const [active, setActive] = useState(0);
  /** Which amenity is painted on each of the four faces. */
  const [faces, setFaces] = useState<(typeof amenities[number] | null)[]>(
    () => [amenities[0], null, null, null],
  );

  const turn = useRef(0);            // unbounded quarter-turn counter
  const activeRef = useRef(0);

  /** Show `next`: paint it on the incoming face, then rotate a quarter. */
  const show = (nextIndex: number) => {
    const item = list[nextIndex];
    if (!item || item.slug === list[activeRef.current]?.slug) return;
    activeRef.current = nextIndex;
    setActive(nextIndex);

    const incoming = ((turn.current + 1) % FACES + FACES) % FACES;
    setFaces((prev) => {
      const copy = [...prev];
      copy[incoming] = item;
      return copy;
    });

    turn.current += 1;
    const el = cube.current;
    if (!el) return;

    if (window.matchMedia(MQ.motionReduced).matches) {
      el.style.transform = `translateZ(calc(var(--cube) / -2)) rotateY(${-turn.current * QUARTER}deg)`;
      return;
    }
    gsap.to(el, {
      // rotateY only — the incoming face is already painted, so the turn
      // reveals it. overwrite:true means fast hovering retargets rather than
      // queueing a spin per name passed over.
      rotateY: -turn.current * QUARTER,
      duration: DUR.deck,
      ease: EASE.deck,
      overwrite: true,
    });
  };

  /**
   * Switching category resets to the first of the new list and repaints the
   * face currently in front — done here rather than in an effect on `list`,
   * since the filter click is the actual cause and an effect would just be a
   * second render reacting to state we already have.
   */
  const changeFilter = (next: Filter) => {
    setFilter(next);
    const first = (next === 'All' ? amenities : amenities.filter((a) => a.category === next))[0];
    if (!first) return;
    activeRef.current = 0;
    setActive(0);
    const front = ((turn.current % FACES) + FACES) % FACES;
    setFaces((prev) => {
      const copy = [...prev];
      copy[front] = first;
      return copy;
    });
  };

  // Idle drift: with no pointer, step through the amenities slowly so the
  // section is alive rather than static. Stops the moment anyone interacts.
  useEffect(() => {
    if (!near) return;
    if (window.matchMedia(MQ.motionReduced).matches) return;
    let stopped = false;
    const id = window.setInterval(() => {
      if (stopped) return;
      show((activeRef.current + 1) % list.length);
    }, 3200);
    const stop = () => { stopped = true; window.clearInterval(id); };
    const el = root.current;
    el?.addEventListener('pointerenter', stop, { once: true });
    el?.addEventListener('focusin', stop, { once: true });
    return () => { window.clearInterval(id); el?.removeEventListener('pointerenter', stop); el?.removeEventListener('focusin', stop); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, list]);

  const current = list[active] ?? list[0];

  return (
    <section
      ref={root}
      id={anchors.amenities}
      className={styles.section}
      data-ground="stage"
      aria-labelledby="amenities-heading"
    >
      <span id={anchors.amenitiesAlt} className={styles.anchor} aria-hidden="true" />

      {/* The display surface, behind the names. */}
      <div className={styles.stage} aria-hidden="true">
        <div ref={cube} className={styles.cube}>
          {faces.map((face, i) => (
            <div key={i} className={styles.face} style={{ ['--face' as string]: `${i * QUARTER}deg` }}>
              {face && (
                <picture>
                  <source
                    srcSet={srcSet(face.image, face.slug, 'avif')}
                    sizes={SIZES}
                    type="image/avif"
                  />
                  <img
                    src={`${face.image}-${largest(face.slug)}.webp`}
                    srcSet={srcSet(face.image, face.slug, 'webp')}
                    sizes={SIZES}
                    alt=""
                    width={images[face.slug]?.w ?? 560}
                    height={images[face.slug]?.h ?? 315}
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
              )}
            </div>
          ))}
        </div>
        <div className={styles.scrim} />
      </div>

      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>{amenities.length} amenities · Club House</p>
          <LineReveal as="h2" id="amenities-heading" className={styles.heading} lines={[{ text: 'The Clubhouse' }]} />
        </header>

        <div className={styles.filters} role="group" aria-label="Filter amenities by category">
          {(['All', ...amenityCategories] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`${styles.pill} ${filter === f ? styles.pillActive : ''}`}
              aria-pressed={filter === f}
              onClick={() => changeFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* The names ARE the navigation, as on the old site. */}
        <ul className={styles.grid}>
          {list.map((a, i) => (
            <li key={a.slug}>
              <Link
                href={`/portfolio-item/${a.slug}/`}
                className={`${styles.name} ${i === active ? styles.nameActive : ''}`}
                onPointerEnter={() => show(i)}
                onFocus={() => show(i)}
              >
                {a.title}
              </Link>
            </li>
          ))}
        </ul>

        <p className={styles.current} aria-live="polite">
          <span className={styles.currentTitle}>{current?.title}</span>
          {current?.descriptor && <span className={styles.currentDesc}>{current.descriptor}</span>}
        </p>

        <p className={styles.disclaimer}>{legal.imageDisclaimer}</p>
      </div>
    </section>
  );
}
