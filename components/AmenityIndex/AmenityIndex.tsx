'use client';

import { useEffect, useRef, useState } from 'react';
import { amenities, anchors } from '@/lib/content';
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

    /* The cap-height measurement that used to live here is gone with the live
       text: artwork has no font metrics to wait on and no fallback face to be
       wrong about, so the box alone sizes it now. */
    return () => ro.disconnect();
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
              {/* THE ARTWORK, not a typeface. /logos/amenities-wordmark.png is
                  the supplied lettering reduced to the two values a luminance
                  mask can read — black letters cut the sheet, the white field
                  around them keeps it. It is built from the source PNG's ALPHA
                  channel, negated: the artwork ships as white letterforms on
                  transparency, which as a mask would have kept the letters and
                  cut everything else, exactly inverted.

                  Laid out unrotated as a horizontal strip and turned a quarter
                  turn about the column's centre, so it reads bottom to top like
                  the text it replaces. WIDTH is the run down the column and
                  HEIGHT is the ink across it — they swap under the rotation.
                  preserveAspectRatio="none" because the strip is 6.06:1 and the
                  column is nearer 5:1: it stretches to span, which is what
                  textLength + lengthAdjust="spacingAndGlyphs" was already doing
                  to the glyphs.

                  The y term is what keeps the promise the old baseline made —
                  the bottoms of the letters landing where the panel ends and
                  the open picture begins. After the rotation the strip's far
                  edge sits at x = box.w. */}
              <image
                href="/logos/amenities-wordmark.png"
                x={box.w / 2 - ((box.h - box.top) * 0.94) / 2}
                y={midY + box.w / 2 - box.w * 0.92}
                width={(box.h - box.top) * 0.94}
                height={box.w * 0.92}
                preserveAspectRatio="none"
                transform={`rotate(-90 ${box.w / 2} ${midY})`}
              />
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
