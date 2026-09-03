'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { specifications, anchors } from '@/lib/content';
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

/** Popup box, in px. Fixed so the flip/clamp can be computed before paint. */
const POP_W = 320;
const POP_H = 190;
const GAP = 16;

export default function Specifications() {
  const [open, setOpen] = useState<number | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLElement>(null);

  /** Place the popup near a point, flipped or clamped to stay on screen. */
  const place = useCallback((clientX: number, clientY: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Prefer to the right of the cursor; flip left when it would overflow.
    let x = clientX + GAP;
    if (x + POP_W > vw - GAP) x = clientX - GAP - POP_W;
    x = Math.max(GAP, Math.min(x, vw - POP_W - GAP));
    // Prefer below; flip above near the bottom.
    let y = clientY + GAP;
    if (y + POP_H > vh - GAP) y = clientY - GAP - POP_H;
    y = Math.max(GAP, Math.min(y, vh - POP_H - GAP));
    setPos({ x, y });
  }, []);

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
            role="tooltip"
            className={styles.popup}
            style={{ left: `${pos.x}px`, top: `${pos.y}px`, width: `${POP_W}px` }}
          >
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
