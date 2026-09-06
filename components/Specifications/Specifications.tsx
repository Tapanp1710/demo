'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { specifications, anchors } from '@/lib/content';
import specArt from '@/lib/spec-art.json';
import LineReveal from '@/components/LineReveal/LineReveal';
import styles from './Specifications.module.css';

/**
 * All 21 specification groups, as an index of titles. The body of whichever
 * one you are pointing at appears in a popup beside the cursor.
 *
 * A popup rather than a fixed panel below the grid: the panel had to reserve
 * its own height whether or not anything was selected, and that reserved
 * height is what squeezed the index into columns narrow enough to push the
 * fourth one off the right edge.
 *
 * Hover and focus both open it, Escape and mouse-out close it, and a tap opens
 * it with a tap outside to close. The popup is positioned in the viewport and
 * clamped to it, so it never opens off-screen at the edges of the grid.
 */

/** Popup width, in px — fixed, so the horizontal flip needs no measurement. */
const POP_W = 320;
/* A first guess at the height, used only for the frame before the popup has
   been laid out. The real height is measured and the popup re-placed; see
   useLayoutEffect below. The bodies range from one line to eight, so a single
   constant could never be right for all 21. */
const POP_H_GUESS = 380;
const GAP = 16;

/* useLayoutEffect on the server is a React warning and does nothing useful.
   The popup is client-only, but the hook is still called during SSR. */
const useIsoLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** The fixed bar's height in px, from the token, so the two cannot diverge. */
const navPx = () => {
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--nav-h'),
  ) || 0;
  return v <= 10 ? v * 16 : v;
};

/* The drawings are keyed by the same slug the build script derives from the
   title, so the two lists cannot drift apart — see scripts/build-spec-art.mjs. */
type Art = { w: number; h: number; widths: number[] };
const ART = specArt as Record<string, Art>;
const slug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function Specifications() {
  const [open, setOpen] = useState<number | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  /* The point the popup is placed against, kept so it can be re-placed once
     its real height is known without another pointer event. */
  const anchor = useRef({ x: 0, y: 0 });

  /** Place the popup near a point, flipped or clamped to stay on screen. */
  const place = useCallback((clientX: number, clientY: number) => {
    anchor.current = { x: clientX, y: clientY };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    /* MEASURED, not the constant. The bodies are between one and eight lines,
       so a fixed 380 flipped short popups upward far more eagerly than they
       needed and then clamped them against the top of the window. */
    const h = popupRef.current?.offsetHeight || POP_H_GUESS;
    /* The fixed bar is opaque and sits above everything, so the top of the
       window is not the top of the usable area — clamping to GAP alone put
       the illustration behind the bar. */
    const ceiling = navPx() + GAP;

    // Prefer to the right of the cursor; flip left when it would overflow.
    let x = clientX + GAP;
    if (x + POP_W > vw - GAP) x = clientX - GAP - POP_W;
    x = Math.max(GAP, Math.min(x, vw - POP_W - GAP));
    // Prefer below; flip above near the bottom.
    let y = clientY + GAP;
    if (y + h > vh - GAP) y = clientY - GAP - h;
    y = Math.max(ceiling, Math.min(y, vh - h - GAP));
    setPos({ x, y });
  }, []);

  /* Re-place once the popup exists and can be measured. Runs before paint, so
     the corrected position is the first one drawn rather than a jump. It
     cannot loop: it depends on which item is open, not on the position it
     sets. */
  useIsoLayout(() => {
    if (open === null) return;
    place(anchor.current.x, anchor.current.y);
  }, [open, place]);

  const show = (i: number, clientX: number, clientY: number) => {
    place(clientX, clientY);
    setOpen(i);
  };

  /** Focus has no cursor, so anchor the popup to the item's own box. */
  const showFromElement = (i: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    place(r.right, r.bottom);
    setOpen(i);
  };

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    // Tap outside closes it on touch, where there is no mouse-out.
    const onDocPointer = (e: PointerEvent) => {
      if (!sectionRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDocPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDocPointer);
    };
  }, [open]);

  const current = open === null ? null : specifications[open];

  return (
    <section
      ref={sectionRef}
      id={anchors.specifications}
      className={styles.section}
      aria-labelledby="specs-heading"
    >
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>The detail</p>
          <LineReveal
            as="h2"
            id="specs-heading"
            className={styles.heading}
            lines={[{ text: 'General Specifications' }]}
          />
        </header>

        <ul className={styles.list}>
          {specifications.map((spec, i) => (
            <li key={spec.title} className={styles.item}>
              <button
                type="button"
                className={`${styles.trigger} ${open === i ? styles.triggerActive : ''}`}
                aria-describedby={open === i ? 'spec-popup' : undefined}
                aria-expanded={open === i}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') show(i, e.clientX, e.clientY); }}
                onPointerMove={(e) => { if (e.pointerType === 'mouse' && open === i) place(e.clientX, e.clientY); }}
                onPointerLeave={(e) => { if (e.pointerType === 'mouse') setOpen(null); }}
                onClick={(e) => {
                  if (open === i) { setOpen(null); return; }
                  showFromElement(i, e.currentTarget);
                }}
                onFocus={(e) => showFromElement(i, e.currentTarget)}
                onBlur={() => setOpen(null)}
              >
                <span className={`${styles.index} tabular`}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.title}>{spec.title}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Fixed-position, so the clamp above is in viewport coordinates and
            the popup can never be clipped by the section's own overflow. */}
        {current && (
          <div
            id="spec-popup"
            ref={popupRef}
            role="tooltip"
            className={styles.popup}
            style={{ left: `${pos.x}px`, top: `${pos.y}px`, width: `${POP_W}px` }}
          >
            {(() => {
              const art = ART[slug(current.title)];
              if (!art) return null;
              const base = `/images/specs/${slug(current.title)}`;
              return (
                <picture className={styles.popupArt}>
                  <source type="image/avif" sizes="320px"
                    srcSet={art.widths.map((w) => `${base}-${w}.avif ${w}w`).join(', ')} />
                  <source type="image/webp" sizes="320px"
                    srcSet={art.widths.map((w) => `${base}-${w}.webp ${w}w`).join(', ')} />
                  {/* Decorative: the body text beside it says everything the
                      drawing says, so announcing it twice is only noise. */}
                  <img src={`${base}-${art.widths[art.widths.length - 1]}.webp`} alt=""
                    width={art.w} height={art.h} decoding="async" />
                </picture>
              );
            })()}
            <h3 className={styles.popupTitle}>{current.title}</h3>
            <p className={styles.popupBody}>{current.body}</p>
          </div>
        )}

        {/* Without scripting there is no popup to open, so every group prints. */}
        <noscript>
          <dl className={styles.noscript}>
            {specifications.map((spec) => (
              <div key={spec.title}>
                <dt>{spec.title}</dt>
                <dd>{spec.body}</dd>
              </div>
            ))}
          </dl>
        </noscript>
      </div>
    </section>
  );
}
