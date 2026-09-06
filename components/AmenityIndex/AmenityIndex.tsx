'use client';

import { useEffect, useRef, useState } from 'react';
import { amenities, legal, anchors } from '@/lib/content';
import amenityImages from '@/lib/amenity-images.json';
import styles from './AmenityIndex.module.css';

type ImageMeta = { w: number; h: number; widths: number[] };
const IMAGES = amenityImages as Record<string, ImageMeta>;

/**
 * The brochure's amenities spread: the names down the left, AMENITIES set
 * vertically beside them, and the photograph filling the whole section behind
 * both. It changes as you move down the list.
 *
 * Every photograph is MOUNTED, and hovering crossfades opacity between them.
 * Swapping the src of one <img> instead would put a network fetch in the
 * middle of a hover — the first pass over each name would flash the empty
 * frame. Nineteen stacked images cost one paint each; only the first is
 * eager, the rest come in as the section approaches.
 *
 * Hover is not the only way in: each name is a button, so focus moves the
 * photograph too and the list works from the keyboard alone.
 *
 * THE WORD IS A HOLE, NOT A FILL — and that is the whole design.
 *
 * Two earlier versions tried to PAINT the photograph into the letters: an SVG
 * <pattern>, once cropped to the word's column and once squeezed whole into
 * it. Both were approximations of a continuation, and neither ever lined up,
 * because the letters were being painted from one box while the picture beside
 * them was painted from another.
 *
 * So the picture is not two boxes any more. It spans the ENTIRE section,
 * underneath everything; the panel is an opaque sheet laid over its left end;
 * and the word is cut out of that sheet with a mask. The letters are therefore
 * showing the actual pixels of the actual photograph that sit at exactly that
 * point — not a crop of it, not a copy of it, it. A continuation cannot be
 * more exact than being the same object.
 *
 * The one thing a hole cannot do is guarantee its own contrast: where the
 * photograph happens to be as pale as the panel, the letter edge disappears.
 * A drop-shadow on the masked sheet solves it — with no offset, the shadow
 * bleeds off every edge of the sheet's silhouette, and the inside of each
 * letter is an edge, so each one gets a soft dark rim from the panel it was
 * cut out of. It defines the shape without tinting the picture inside it.
 */
export default function AmenityIndex() {
  const [active, setActive] = useState(0);
  const current = amenities[active];

  /* The word's own box, measured — the mask rectangle and the glyph size are
     both derived from it, so neither needs a per-breakpoint guess. */
  const word = useRef<SVGSVGElement>(null);
  const names = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 180, h: 900, top: 56 });
  /* How tall this face's capitals actually are, as a share of its font-size.
     MEASURED, not assumed: the word is rotated a quarter turn, so its cap
     height runs ACROSS the column and is what decides whether the glyphs fit
     the column's width. The number differs per typeface — Cormorant's caps
     are about 0.66em, Poiret One's about 0.73 — so a hardcoded font-size
     factor is only ever right for the face it was tuned against, and silently
     starts shaving the letters when the face changes. It did: the S was being
     sliced flat down one side after the switch. */
  const [capRatio, setCapRatio] = useState(0.7);

  useEffect(() => {
    const el = word.current;
    const host = el?.closest('section') as HTMLElement | null;
    if (!el || !host) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      /* top is 0 now. The word used to be pushed down by the nav's height
         because the section ran underneath the bar; the section pads itself
         clear of it instead, so this column already starts below the bar and
         the run can centre in the whole of it. */
      if (r.width && r.height) {
        setBox({ w: Math.round(r.width), h: Math.round(r.height), top: 0 });
      }

      /* Where the photograph has to START.
         It only needs to reach the WORD, not the section's left edge — the
         names column is opaque and nothing shows through it. Covering the
         whole width meant scaling a 1.78:1 photograph to fill a 2.26:1 box at
         a short viewport, which threw away a quarter of its height and
         magnified what was left. Starting at the word column drops the box to
         about 1.85:1, so almost nothing is cropped and almost nothing is
         enlarged. Measured, not derived: the panel is a clamp inside a
         minmax() track and the arithmetic would go stale at the next
         breakpoint change. */
      const nb = names.current?.getBoundingClientRect();
      if (nb?.width) host.style.setProperty('--stage-left', `${Math.round(nb.width)}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    /* Canvas reports the INK box of real glyphs, which is the thing that gets
       clipped — unlike SVG's getBBox, which returns the em box (ascender to
       descender) and so reported clearance while the letters were visibly
       being cut. Waits for the webfont: measured against the fallback the
       ratio would be wrong by exactly the amount that matters. */
    let cancelled = false;
    void (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (cancelled) return;
      const txt = el.querySelector('text');
      if (!txt) return;
      const cs = getComputedStyle(txt);
      const ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) return;
      const REF = 200;
      ctx.font = `${cs.fontWeight} ${REF}px ${cs.fontFamily}`;
      const m = ctx.measureText('AMENITIES');
      const ink = m.actualBoundingBoxAscent + Math.max(0, m.actualBoundingBoxDescent);
      if (ink > 0) setCapRatio(ink / REF);
    });

    return () => { cancelled = true; ro.disconnect(); };
  }, []);

  const midY = box.top + (box.h - box.top) / 2;

  return (
    <section
      id={anchors.amenities}
      className={styles.section}
      data-ground="light"
      aria-labelledby="amenities-heading"
    >
      <span id={anchors.amenitiesAlt} className={styles.anchor} aria-hidden="true" />

      {/* FIRST in the DOM and absolutely positioned: the photograph is the
          section's floor, and everything else is laid on top of it. */}
      <div className={styles.stage}>
        {amenities.map((a, i) => {
          const meta = IMAGES[a.slug];
          const widths = meta?.widths ?? [900];
          return (
            <picture
              key={a.slug}
              className={`${styles.shot} ${i === active ? styles.shotActive : ''}`}
            >
              <source
                type="image/avif"
                sizes="(max-width: 991px) 100vw, 82vw"
                srcSet={widths.map((w) => `${a.image}-${w}.avif ${w}w`).join(', ')}
              />
              <source
                type="image/webp"
                sizes="(max-width: 991px) 100vw, 82vw"
                srcSet={widths.map((w) => `${a.image}-${w}.webp ${w}w`).join(', ')}
              />
              <img
                src={`${a.image}-${widths[widths.length - 1]}.webp`}
                alt={i === active ? a.alt : ''}
                width={meta?.w ?? 900}
                height={meta?.h ?? 525}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </picture>
          );
        })}

        {/* Names the photograph for anyone who cannot see the swap. */}
        <p className={styles.caption} role="status" aria-live="polite">{current.title}</p>
      </div>

      <div className={styles.panel}>
        <div ref={names} className={styles.names}>
          <p className={styles.eyebrow}>{amenities.length} amenities</p>
          <h2 id="amenities-heading" className={styles.srOnly}>The Clubhouse</h2>

          <ul className={styles.list}>
            {amenities.map((a, i) => (
              <li key={a.slug}>
                <button
                  type="button"
                  className={`${styles.name} ${i === active ? styles.nameActive : ''}`}
                  aria-pressed={i === active}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                >
                  {a.title}
                </button>
              </li>
            ))}
          </ul>

          <p className={styles.disclaimer}>{legal.imageDisclaimer}</p>
        </div>

        {/* The right end of the panel sheet, with AMENITIES cut out of it.
            The <rect> IS the panel here — the .names column paints its own
            matching ground and the two meet with no seam.

            White and black in the mask are not colours, they are the mask's
            alpha channel: white keeps the sheet, black cuts through it. They
            are the only two values a luminance mask can take, so they are not
            a palette decision and do not belong in tokens.

            textLength pins the word to the column height whatever the face's
            metrics are, so it always spans the section. */}
        <svg
          ref={word}
          className={styles.vertical}
          viewBox={`0 0 ${box.w} ${box.h}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <mask id="amenity-knockout" maskUnits="userSpaceOnUse" x="0" y="0" width={box.w} height={box.h}>
              <rect x="0" y="0" width={box.w} height={box.h} fill="white" />
              {/* Baseline on the word's right edge, so the bottoms of the
                  letters land where the panel ends and the open picture
                  begins. */}
              <text
                x={box.w}
                y={midY}
                transform={`rotate(-90 ${box.w} ${midY})`}
                textAnchor="middle"
                textLength={(box.h - box.top) * 0.94}
                lengthAdjust="spacingAndGlyphs"
                /* 1.38, not 0.94. Cormorant's cap height is ~0.66em and
                   AMENITIES is all caps with no descender, so the visible
                   letters are only ~0.66 of whatever font-size is set. Sizing
                   the EM box to the column left a third of it blank beside
                   the word; 0.66 x 1.38 = 0.91 puts the caps across it. */
                /* Sized so the INK spans 92% of the column, whatever face is
                   in use: font-size = target ink / cap ratio. */
                fontSize={(box.w * 0.92) / capRatio}
                fill="black"
              >
                AMENITIES
              </text>
            </mask>
          </defs>
          {/* The filter is on the GROUP and the mask on the rect inside it —
              never both on one element. SVG applies filter BEFORE mask, so a
              drop-shadow on the masked rect itself would be computed from the
              solid rectangle and then cut away with everything else: no rim
              inside the letters at all, which is the one thing it is here to
              do. On the group it sees the already-cut shape. */}
          <g className={styles.sheet}>
            <rect x="0" y="0" width={box.w} height={box.h} mask="url(#amenity-knockout)" />
          </g>
        </svg>
      </div>
    </section>
  );
}
