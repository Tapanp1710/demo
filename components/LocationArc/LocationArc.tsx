'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap, MQ, EASE } from '@/lib/gsap';
import { tellapur, locationCards, contact, anchors, legal } from '@/lib/content';
import LineReveal from '@/components/LineReveal/LineReveal';
import locationImages from '@/lib/location-images.json';
import styles from './LocationArc.module.css';

/**
 * Tellapur's neighbourhood on TWO concave arcs that turn against each other.
 *
 * The left ring carries each category's heading and its places; the right ring
 * carries that category's photograph. Both hold the same index, so what you are
 * reading is always one category — but their rotations are mirrored, so a step
 * sends the text ring one way and the picture ring the other. The
 * counter-rotation is the point: two rings turning the same way read as one
 * wide belt, and you stop seeing them as two.
 *
 * The mirroring is a sign and nothing more. A panel sits on the OUTER surface
 * of a cylinder:
 *   panel      rotateY(±off · STEP) translateZ(+R)
 *   container  translateZ(-R)
 * which puts the centre panel at z = 0, square to the reader, and lets its
 * neighbours fall away behind it. Negating the angle mirrors the ring about
 * its centre — still convex, still readable, travelling the other way.
 *
 * Movement is TWEENED, not snapped. `pos` is a plain number GSAP animates and
 * paint() reads, so a step is a visible three quarters of a second of rotation
 * rather than a cut between two states. Under prefers-reduced-motion the same
 * path sets the value directly and paints once.
 *
 * Each ring is anchored to the edge it shares with the other, so the panel
 * behind the centre one on the INNER side falls outside the ring box and the
 * ring's overflow removes it. What is left is the centre panel plus part of
 * one neighbour, running outward toward the window edge — and the two centre
 * panels meet in the middle with nothing between them.
 *
 * The two arrows are the only control now. The row of category pills that sat
 * under the arcs is gone, and the height it was taking is where the bigger
 * panels came from.
 */
/**
 * STEP and RADIUS are not free of each other. Adjacent panel centres are
 * 2·R·sin(STEP/2) apart around the ring, and if that is less than a panel is
 * wide the panels intersect — on a convex ring the neighbour then wraps ACROSS
 * the centre panel instead of behind it, and the whole thing reads as a stack
 * of translucent sheets. So RADIUS_K must stay above 1/(2·sin(STEP/2)), which
 * at 24° is 2.41.
 *
 * The step is DELIBERATELY shallow. A large angle turns the ring into a
 * visible polygon — five flat cards meeting at hard corners, which is what it
 * looked like at 42° — because you see each facet's whole width and the break
 * between them. At 24° over a radius two and a half panels deep the neighbour
 * is barely canted, and the path it sits on reads as a circle instead. Neither
 * number costs panel size any more: the size is solved against the centre
 * panel alone.
 */
const STEP_DEG = 24;
const VISIBLE_SPAN = 1.6;
const ASPECT = 0.92;      // panel width as a share of its height
const RADIUS_K = 2.6;     // radius in panel widths — see above, floor is 2.41
/* The perspective itself lives in the CSS (.ring). Nothing here needs it any
   more: the size is solved against the centre panel, which sits at z = 0 and
   is therefore unprojected. */
const TURN = 0.72;        // seconds for one category step

const MAP = locationCards.length;
const CATEGORIES = locationCards.length + 1;

/** The widths that actually exist on disk for a location photograph. */
const imgWidths = (image: string) =>
  (locationImages as Record<string, number[]>)[image.split('/').pop() ?? ''] ?? [560];
const topWidth = (image: string) => { const w = imgWidths(image); return w[w.length - 1]; };

const mod = (a: number, n: number) => ((a % n) + n) % n;
/** Shortest signed distance around the ring. */
const wrapOffset = (d: number, n: number) => mod(d + n / 2, n) - n / 2;

export default function LocationArc() {
  const root = useRef<HTMLElement>(null);
  const ringBox = useRef<HTMLDivElement>(null);
  const textPanels = useRef<(HTMLDivElement | null)[]>([]);
  const shotPanels = useRef<(HTMLDivElement | null)[]>([]);
  /* An object, not a bare ref value: GSAP tweens object properties, and
     paint() reads this same object on every frame of the turn. */
  const pos = useRef({ v: 0 });
  const [active, setActive] = useState(0);

  /* Panel size solved from ONE ring's box, not guessed per breakpoint — the
     two rings are the same size, so measuring either gives both. */
  useEffect(() => {
    const host = root.current;
    const el = ringBox.current;
    if (!host || !el) return;
    const size = () => {
      const { width: w, height: h } = el.getBoundingClientRect();
      if (!w || !h) return;

      /* Only the CENTRE panel is solved against, in both directions.
         It sits at z = 0, so it is drawn at exactly its layout size, and on a
         convex ring every neighbour is behind it and therefore smaller — the
         centre is the largest thing on screen in both axes.
         The neighbours are allowed to run off the sides and the ring clips
         them (see .ring overflow). Solving against the first neighbour's outer
         edge instead is what was holding the panels down to 390px in a 940px
         ring: it reserved room for a panel that is mostly turned away and
         faded to a third of its opacity. */
      const byHeight = (H: number) => H - h * 0.99;
      const byWidth = (H: number) => ASPECT * H - w * 0.98;
      const solve = (f: (H: number) => number) => {
        /* A receding edge's projection is bounded — it can approach the
           vanishing point and never reach the wall — so f may never turn
           positive. hi is then returned unchanged and the other limit wins,
           which is the correct answer, not a failure. */
        let lo = 60, hi = 4000;
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2;
          if (f(mid) > 0) hi = mid; else lo = mid;
        }
        return lo;
      };
      const ph = Math.max(140, Math.min(solve(byHeight), solve(byWidth)));
      host.style.setProperty('--panel-h', `${Math.round(ph)}px`);
      host.style.setProperty('--panel-w', `${Math.round(ph * ASPECT)}px`);
      host.style.setProperty('--radius', `${Math.round(ph * ASPECT * RADIUS_K)}px`);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Repaint both rings from the current position. `dir` mirrors the ring. */
  const paint = useCallback(() => {
    const p = pos.current.v;
    const ring = (els: (HTMLDivElement | null)[], dir: number) => {
      for (let i = 0; i < CATEGORIES; i++) {
        const el = els[i];
        if (!el) continue;
        const off = wrapOffset(i - p, CATEGORIES);
        const ad = Math.abs(off);
        if (ad > VISIBLE_SPAN) {
          el.style.visibility = 'hidden';
          continue;
        }
        el.style.visibility = 'visible';
        const t = Math.min(ad / VISIBLE_SPAN, 1);
        el.style.transform =
          `rotateY(${(dir * off * STEP_DEG).toFixed(3)}deg) translateZ(var(--radius))`;
        el.style.opacity = (1 - 0.62 * t).toFixed(3);
        /* Exactly none once settled — a filter forces its own rasterisation
           even when every function in it is a no-op. Mid-turn the formula is
           doing real work, so it stays. */
        el.style.filter = ad < 0.02
          ? 'none'
          : `blur(${(t * 3.4).toFixed(2)}px) saturate(${(1 - 0.35 * t).toFixed(3)}) brightness(${(1 - 0.3 * t).toFixed(3)})`;
        el.style.zIndex = String(100 - Math.round(ad * 10));
      }
    };
    /* These two signs ARE the counter-rotation. */
    ring(textPanels.current, -1);
    ring(shotPanels.current, 1);
  }, []);

  useEffect(() => { paint(); }, [paint]);

  /** Turn to a category, animating the rotation rather than cutting to it. */
  const goTo = useCallback((c: number) => {
    setActive(c);
    /* Aim at the SHORTEST way round from wherever the turn currently is, so
       stepping off the last category onto the first moves one place forward
       instead of unwinding the whole ring. */
    const target = pos.current.v + wrapOffset(c - pos.current.v, CATEGORIES);
    gsap.killTweensOf(pos.current);
    if (window.matchMedia(MQ.motionReduced).matches) {
      pos.current.v = target;
      paint();
      return;
    }
    gsap.to(pos.current, {
      v: target,
      duration: TURN,
      ease: EASE.deck,
      onUpdate: paint,
    });
  }, [paint]);

  const step = useCallback((dir: number) => {
    setActive((c) => {
      const next = mod(c + dir, CATEGORIES);
      goTo(next);
      return next;
    });
  }, [goTo]);

  useEffect(() => {
    const p = pos.current;
    return () => { gsap.killTweensOf(p); };
  }, []);

  const label = (c: number) => (c === MAP ? 'On the map' : locationCards[c].title);

  /** The left ring's panel body: the category's heading and its places. */
  const places = (c: number) => {
    const card = c === MAP ? null : locationCards[c];
    return (
      <div className={styles.places}>
        <p className={styles.placesTitle}>{label(c)}</p>
        {card?.time && <p className={styles.time}>{card.time}</p>}
        <ul className={styles.list}>
          {(card ? card.items : ['Osman Sagar Lake', 'Financial District', 'HITEC City', 'Gachibowli'])
            .map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    );
  };

  /** The right ring's panel body: the photograph, or the map on the last one. */
  const shot = (c: number, on: boolean) => {
    if (c === MAP) {
      return on
        ? (
          <iframe className={styles.map} src={contact.mapEmbed}
            title="Bricks Marvella Map" loading="lazy"
            referrerPolicy="no-referrer-when-downgrade" />
        )
        : <div className={styles.mapStub} aria-hidden="true" />;
    }
    const card = locationCards[c];
    return (
      <picture>
        {/* Widths from the manifest, never hardcoded: recreation only ever got
            a 560 and an 865, so a hardcoded -900 asked for a file that does
            not exist and rendered broken. */}
        <source type="image/avif" sizes="(max-width: 767px) 92vw, 40vw"
          srcSet={imgWidths(card.image).map((n) => `${card.image}-${n}.avif ${n}w`).join(', ')} />
        <source type="image/webp" sizes="(max-width: 767px) 92vw, 40vw"
          srcSet={imgWidths(card.image).map((n) => `${card.image}-${n}.webp ${n}w`).join(', ')} />
        <img src={`${card.image}-${topWidth(card.image)}.webp`} alt={on ? card.alt : ''}
          width={topWidth(card.image)} height={Math.round(topWidth(card.image) * 0.667)}
          loading="lazy" decoding="async" />
      </picture>
    );
  };

  return (
    <section
      ref={root}
      id={anchors.location}
      className={styles.section}
      aria-labelledby="location-heading"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      }}
    >
      <div className={styles.head}>
        <p className={styles.eyebrow}>Location</p>
        <LineReveal as="h2" id="location-heading" className={styles.heading}
          lines={[{ text: 'Tellapur, the future is here' }]} />
        <p className={styles.tagline}>{tellapur.tagline}</p>
      </div>

      <div className={styles.track}>
        {/* The arrows live INSIDE the track so they centre on the arcs rather
            than on the section, which the heading makes top-heavy. */}
        <button type="button" className={`${styles.arrow} ${styles.arrowLeft}`}
          onClick={() => step(-1)} aria-label="Previous category">
          <span aria-hidden="true">‹</span>
        </button>

        {/* LEFT — headings and places. Turns one way. */}
        <div ref={ringBox} className={`${styles.ring} ${styles.ringLeft}`}>
          <div className={styles.stage}>
            {Array.from({ length: CATEGORIES }, (_, c) => {
              const on = c === active;
              return (
                <div
                  key={c}
                  ref={(el) => { textPanels.current[c] = el; }}
                  className={`${styles.panel} ${styles.panelPlaces} ${on ? styles.panelOn : ''}`}
                  aria-hidden={on ? undefined : true}
                  {...(on ? {} : { inert: '' as unknown as boolean })}
                >
                  {places(c)}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — the photograph. Turns the other. */}
        <div className={`${styles.ring} ${styles.ringRight}`}>
          <div className={styles.stage}>
            {Array.from({ length: CATEGORIES }, (_, c) => {
              const on = c === active;
              return (
                <div
                  key={c}
                  ref={(el) => { shotPanels.current[c] = el; }}
                  className={`${styles.panel} ${styles.panelShot} ${on ? styles.panelOn : ''}`}
                  aria-hidden={on ? undefined : true}
                  {...(on ? {} : { inert: '' as unknown as boolean })}
                >
                  {shot(c, on)}
                </div>
              );
            })}
          </div>
        </div>

        <button type="button" className={`${styles.arrow} ${styles.arrowRight}`}
          onClick={() => step(1)} aria-label="Next category">
          <span aria-hidden="true">›</span>
        </button>
      </div>

      {/* The pills named the category as well as selecting it. With them gone
          this is what tells a screen reader the arc has turned; the heading
          inside the left panel is the visible equivalent. */}
      <p className={styles.srOnly} role="status" aria-live="polite">{label(active)}</p>

      <p className={styles.disclaimer}>{legal.imageDisclaimer}</p>
    </section>
  );
}
