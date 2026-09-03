'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, MQ, EASE } from '@/lib/gsap';
import { amenities, amenityCategories, legal, anchors, type AmenityCategory } from '@/lib/content';
import LineReveal from '@/components/LineReveal/LineReveal';
import amenityImages from '@/lib/amenity-images.json';
import styles from './ArcCarousel.module.css';

/** What the pipeline actually emitted per slug — see scripts/build-amenity-images.mjs. */
const images: Record<string, { w: number; h: number; widths: number[] }> = amenityImages;

/** srcSet from the widths that exist: four amenities top out at 900px, and
 *  naming a width the pipeline never wrote serves a 404. */
const srcSet = (base: string, slug: string, ext: string, max = 900) =>
  (images[slug]?.widths ?? [560])
    .filter((w) => w <= max)
    .map((w) => `${base}-${w}.${ext} ${w}w`)
    .join(', ');

/**
 * The card's second line. Only two amenities carry a descriptor on the source
 * site, so the rest fall back to their category — factual, and not marketing
 * copy invented on the client's behalf.
 */
const tagline = (a: (typeof import('@/lib/content'))['amenities'][number]) =>
  a.descriptor ?? a.category;

/**
 * The amenities arc — CONCAVE.
 *
 * Panels sit on the INNER surface of a cylinder, so the band cups toward the
 * viewer: the centre panel is furthest back and the edge panels rotate forward.
 *
 *   panel:     rotateY(-off · STEP) translateZ(-R)
 *   container: translateZ(+R)
 *
 * Composing those puts the centre panel at z = 0 and any panel at offset k at
 *   x = +R·sin(k·STEP)      (positive k to the right)
 *   z = +R·(1 - cos(k·STEP)) > 0   — i.e. nearer the camera than the centre.
 * That forward lean is what makes it concave. Pushing translateZ the other way
 * (panel +R, container −R) gives the convex band this replaced.
 *
 * INFINITE: `pos` is an unbounded float and each panel's offset is wrapped into
 * [−n/2, n/2) with modular arithmetic, so panel 0 follows panel 18 with no seam
 * and no cloned DOM. Panels outside the visible span are simply not painted.
 *
 * INPUT: arrows and keyboard only. No drag, no scroll-scrub, no pinning — the
 * page scrolls past this section normally.
 */

/* 30°, not 22°. At 22 the outer panels read as near-flat — the foreshortening
   is there in the numbers but not to the eye. A wider step with a SHORTER
   radius (2.0 panel widths, see the CSS) swings them further forward and
   turns them further, which is what makes the cup visible. */
const STEP_DEG = 30;
/**
 * Offsets beyond this are not painted. 2.2 gives three FULLY visible panels
 * (offsets −1, 0, +1) plus a sliver bleeding in at each edge (±2). The ±2
 * panels sit a full panel-width nearer the camera, so perspective throws them
 * mostly off the sides — which is exactly the bleed. Anything past ±2 is real
 * cost for nothing on screen.
 */
const VISIBLE_SPAN = 2.2;

/**
 * Panel proportion, width ÷ height. Near-square, NOT the 4:5 portrait this
 * used to be: at 4:5 a panel tall enough to fill the section was too narrow to
 * read as a picture, and three of them left the section looking mostly empty.
 * At 0.92 the centre panel is about a third of the viewport's width.
 */
const ASPECT = 0.92;

/** Radius in panel WIDTHS. R·Δθ ≈ 1.05·W, so the panels sit a 5% gap apart. */
const RADIUS_K = 2.0;

/** Camera distance. Shallower exaggerates the turn; too shallow and the ±1
 *  panels magnify so much they stop fitting. 1600 is the balance point. */
const PERSPECTIVE = 1600;

/** Share of the track height the tallest (nearest) panel edge may occupy. */
const FILL = 0.99;

/** Share of the viewport width the three full panels may span, leaving the
 *  rest for the ±2 slivers to bleed into. */
const SPAN = 0.90;
const STEP_SECONDS = 0.6;

type Filter = 'All' | AmenityCategory;

/** Shortest signed offset from `raw` once the ring is taken into account. */
function wrapOffset(raw: number, n: number): number {
  if (n <= 1) return 0;
  const half = n / 2;
  return ((((raw + half) % n) + n) % n) - half;
}

/** Positive modulo, for the wrapping counter. */
const mod = (v: number, n: number) => ((v % n) + n) % n;

export default function ArcCarousel() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const panels = useRef<HTMLAnchorElement[]>([]);

  /**
   * Panel size comes from the space actually left over, not a vh fraction.
   *
   * The heading, pills, readout, arrows and disclaimer are all type — their
   * height depends on font metrics and how many rows the pills wrap onto, and
   * that residue cannot be written as a constant. So measure the track.
   *
   * Two limits, whichever binds first:
   *
   *  - HEIGHT. The panel fills the track, less a little for the arc's forward
   *    swing at the edges.
   *  - WIDTH. Three panels span 3.02 x panelWidth across the arc — the centre
   *    plus 2 x R·sin(22°) — and the outer two sit R·(1−cos22°) nearer the
   *    camera, which perspective magnifies by about 7%. So the whole group is
   *    ~3.23 panel widths, and at 0.8 width-to-height that is 2.59 panel
   *    heights. Solving against the usable width is what stops the outer two
   *    running off the sides on a narrow window.
   */
  useEffect(() => {
    const el = track.current;
    const host = root.current;
    if (!el || !host || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      const h = el.clientHeight;
      const w = el.clientWidth;
      if (h <= 0 || w <= 0) return;

      /**
       * Solve for the largest panel that fits, from the arc's real geometry
       * rather than a tuned divisor.
       *
       * With step S, radius R = k·PANEL_W and perspective P, the ±1 panel —
       * the outermost FULLY visible one — has its NEAR edge at
       *   x = (k·sinS + 0.5·cosS)·W        z = (k·(1-cosS) + 0.5·sinS)·W
       * and perspective magnifies whatever sits at z by P/(P-z). Both limits
       * below are that same near edge, once against the height and once
       * against the width, so the panel ends up as large as the arc allows
       * instead of as large as a guess allows.
       */
      const S = (STEP_DEG * Math.PI) / 180;
      const nearX = (RADIUS_K * Math.sin(S) + 0.5 * Math.cos(S)) * ASPECT;   // per unit HEIGHT
      const nearZ = (RADIUS_K * (1 - Math.cos(S)) + 0.5 * Math.sin(S)) * ASPECT;

      /* Height: the ±1 panel's near edge is the tallest thing drawn, since it
         is nearest the camera. Fill the track, less a thin band. */
      const byHeight = (H: number) => (H * 0.5 * (PERSPECTIVE / (PERSPECTIVE - nearZ * H))) - h * 0.5 * FILL;
      /* Width: that same near edge must land inside the viewport, with a
         margin left for the ±2 sliver to bleed into. */
      const byWidth = (H: number) => (nearX * H * (PERSPECTIVE / (PERSPECTIVE - nearZ * H))) - w * 0.5 * SPAN;

      /* Both are monotonic in H, so bisect. Cheaper and more honest than
         inverting the perspective term by hand. */
      const solve = (f: (H: number) => number) => {
        let lo = 40, hi = 4000;
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2;
          if (nearZ * mid >= PERSPECTIVE * 0.9 || f(mid) > 0) hi = mid; else lo = mid;
        }
        return lo;
      };

      const panelH = Math.max(80, Math.min(solve(byHeight), solve(byWidth)));
      host.style.setProperty('--panel-h', `${Math.round(panelH)}px`);
      host.style.setProperty('--panel-w', `${Math.round(panelH * ASPECT)}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [filter, setFilter] = useState<Filter>('All');
  const visible = useMemo(
    () => (filter === 'All' ? amenities : amenities.filter((a) => a.category === filter)),
    [filter],
  );
  const n = visible.length;

  /** Continuous, unbounded position. Not state — it changes every frame. */
  const pos = useRef(0);
  /** Where the current tween is heading; rapid presses add to this. */
  const target = useRef(0);
  const paintRef = useRef<() => void>(() => {});
  const stepRef = useRef<(dir: number) => void>(() => {});

  const [centre, setCentre] = useState(0);
  const [loaded, setLoaded] = useState<Set<string>>(
    () => new Set(amenities.slice(0, 4).map((a) => a.slug)),
  );

  useEffect(() => {
    panels.current.length = n;
    pos.current = 0;
    target.current = 0;

    const ctx = gsap.context(() => {
      /**
       * Repaint every panel from the current position. Per-frame, never
       * class-toggled. Written straight to style — the transforms contain
       * calc(var(--radius)), which GSAP's CSS plugin would try to parse.
       */
      const paint = () => {
        const p = pos.current;

        for (let i = 0; i < n; i++) {
          const el = panels.current[i];
          if (!el) continue;

          const off = wrapOffset(i - p, n);
          const ad = Math.abs(off);

          // Beyond the visible span a panel would be behind the camera on the
          // far side of the ring — don't paint it at all.
          if (ad > VISIBLE_SPAN) {
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            continue;
          }
          el.style.visibility = 'visible';

          const opacity = 1 - 0.6 * Math.min(ad / 2.2, 1);
          const blur = Math.min(ad, 2.5) * 1.6;
          // Colour is never removed: the floor is 60% saturation, never grey.
          const sat = 1 - 0.4 * Math.min(ad / 2.2, 1);
          const bright = 1 - 0.35 * Math.min(ad / 2.2, 1);

          // Concave: negative rotation + negative Z. The container's +R brings
          // the centre back to z = 0 and lets the edges swing forward.
          el.style.transform =
            `rotateY(${(-off * STEP_DEG).toFixed(3)}deg) translateZ(calc(var(--radius) * -1))`;
          el.style.opacity = opacity.toFixed(3);
          el.style.filter = ad < 0.35
            ? 'none'                                   // dead centre: untouched
            : `blur(${blur.toFixed(2)}px) saturate(${sat.toFixed(3)}) brightness(${bright.toFixed(3)})`;
          el.style.zIndex = String(100 - Math.round(ad * 10));
        }

        const c = mod(Math.round(p), n);
        setCentre((prev) => (prev === c ? prev : c));
      };
      paintRef.current = paint;

      /** Keep the four nearest panels eager, following the ring. */
      const ensureLoaded = (c: number) => {
        setLoaded((prev) => {
          let next: Set<string> | null = null;
          for (let k = -2; k <= 2; k++) {
            const item = visible[mod(c + k, n)];
            if (item && !prev.has(item.slug)) { next ??= new Set(prev); next.add(item.slug); }
          }
          return next ?? prev;
        });
      };

      /**
       * One panel per press. `target` accumulates so rapid presses queue rather
       * than fight; overwrite:true retargets the in-flight tween instead of
       * stacking a second one, so the position can never desync.
       */
      const step = (dir: number) => {
        target.current += dir;
        const reduced = window.matchMedia(MQ.motionReduced).matches;
        gsap.to(pos, {
          current: target.current,
          duration: reduced ? 0 : STEP_SECONDS,
          ease: EASE.ui,
          overwrite: true,
          onUpdate: paint,
          onComplete: () => ensureLoaded(mod(Math.round(pos.current), n)),
        });
      };
      stepRef.current = step;

      paint();
    }, root);

    return () => ctx.revert();
  }, [n, visible]);

  const active = visible[Math.min(centre, Math.max(0, n - 1))];

  /** Reset to the first panel whenever the filter changes the set. */
  const setFilterAndReset = (f: Filter) => {
    pos.current = 0;
    target.current = 0;
    setCentre(0);
    setFilter(f);
  };

  return (
    <section
      ref={root}
      id={anchors.amenities}
      className={styles.section}
      aria-labelledby="amenities-heading"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); stepRef.current(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); stepRef.current(-1); }
      }}
    >
      <span id={anchors.amenitiesAlt} className={styles.anchor} aria-hidden="true" />

      <div className={styles.head}>
        <p className={styles.eyebrow}>{amenities.length} amenities</p>
        <LineReveal as="h2" id="amenities-heading" className={styles.heading} lines={[{ text: 'The Clubhouse' }]} />
      </div>

      <div className={styles.filters} role="group" aria-label="Filter amenities by category">
        {(['All', ...amenityCategories] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`${styles.pill} ${filter === f ? styles.pillActive : ''}`}
            aria-pressed={filter === f}
            onClick={() => setFilterAndReset(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div ref={track} className={styles.track}>
        {/* The concave surface the panels are inset into, INSIDE the track so
            it is positioned against the arc rather than the whole section —
            anchored to the section it overlapped the category pills. Its top
            edge sags in the middle and rises at the ends, and its bottom edge
            does the reverse, so the band is deepest where the arc swings
            toward the viewer. */}
        <svg className={styles.band} viewBox="0 0 1600 620" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,60 Q800,250 1600,60 L1600,560 Q800,370 0,560 Z" className={styles.bandFill} />
          <path d="M0,60 Q800,250 1600,60" className={styles.bandEdge} />
          <path d="M0,560 Q800,370 1600,560" className={styles.bandEdge} />
        </svg>

        <div className={styles.arc}>
          {visible.map((a, i) => (
            <Link
              key={a.slug}
              href={`/portfolio-item/${a.slug}/`}
              className={styles.panel}
              ref={(el) => { if (el) panels.current[i] = el; }}
              /* No aria-label. The caption below IS the visible label, and any
                 hand-written name has to CONTAIN that text verbatim or it is a
                 label/content mismatch — the em-dash alone was enough to fail
                 it. Letting the content name the link makes that impossible. */
              onFocus={() => {
                // Focusing a panel brings it to the front, the short way round.
                const off = wrapOffset(i - pos.current, n);
                if (Math.abs(off) > 0.01) stepRef.current(off);
              }}
              draggable={false}
            >
              <picture>
                <source
                  type="image/avif"
                  sizes="(max-width: 767px) 62vw, 26vw"
                  srcSet={srcSet(a.image, a.slug, 'avif')}
                />
                <source
                  type="image/webp"
                  sizes="(max-width: 767px) 62vw, 26vw"
                  srcSet={srcSet(a.image, a.slug, 'webp')}
                />
                {/* Real intrinsic dimensions per image, from the emitted files
                    (they are not all 16:9 — the sources range 1.33 to 1.78).
                    A single declared ratio for all of them was wrong for most
                    and Lighthouse flagged it. Layout is unaffected either way:
                    the panel's box is fixed in CSS and the image covers it. */}
                <img
                  src={`${a.image}-560.webp`}
                  alt={a.alt}
                  width={images[a.slug]?.w ?? 560}
                  height={images[a.slug]?.h ?? 315}
                  loading={loaded.has(a.slug) ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                />
              </picture>

              {/* Title AND tagline on the card itself, not only in the readout. */}
              <span className={styles.caption}>
                <span className={styles.captionTitle}>{a.title}</span>
                <span className={styles.captionTag}>{tagline(a)}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Counter BETWEEN the arrows, on one row. Stacked above them it was a
          second block of chrome in a section that has exactly one screen, and
          that height is worth more to the panels. The centre panel carries the
          name and tagline; the live region announces it. */}
      <div className={styles.controls}>
        <button type="button" className={styles.arrow} onClick={() => stepRef.current(-1)} aria-label="Previous amenity">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>

        <p className={styles.counter}>
          <span className="tabular">{String(mod(centre, n) + 1).padStart(2, '0')}</span>
          <span className={styles.counterSep}>/</span>
          <span className="tabular">{n}</span>
        </p>

        <button type="button" className={styles.arrow} onClick={() => stepRef.current(1)} aria-label="Next amenity">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>

        <p className={styles.srOnly} aria-live="polite">
          {active ? `${active.title} — ${tagline(active)}` : ''}
        </p>
      </div>

      <p className={styles.disclaimer}>{legal.imageDisclaimer}</p>

      {/* Reduced motion: all 19, as a plain linkable grid. */}
      <ul className={styles.fallbackGrid}>
        {amenities.map((a) => (
          <li key={a.slug}>
            <Link href={`/portfolio-item/${a.slug}/`} className={styles.fallbackItem}>
              <picture>
                <source srcSet={srcSet(a.image, a.slug, 'avif', 560)} type="image/avif" />
                <img
                  src={`${a.image}-560.webp`}
                  alt={a.alt}
                  width={images[a.slug]?.w ?? 560}
                  height={images[a.slug]?.h ?? 315}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <span className={styles.fallbackTitle}>{a.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
