'use client';

import { useEffect, useRef } from 'react';
import { gsap, MQ, EASE, DUR, STAGGER } from '@/lib/gsap';
import { stats, statsHeading } from '@/lib/content';
import LineReveal from '@/components/LineReveal/LineReveal';
import { useNearViewport } from '@/lib/useNearViewport';
import styles from './StatBand.module.css';

/**
 * A single stat's value split into the parts a count-up needs.
 *
 * Returns null when the value is not a single quantity — "2, 2.5, 3 & 4 BHK"
 * and "1385 - 3570 sft" are a list and a range, and counting either one up
 * produces a number the project does not claim. Those keep the line reveal.
 */
function countable(value: string): { target: number; decimals: number; prefix: string; suffix: string } | null {
  const m = value.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const [, prefix, digits, suffix] = m;
  // A range or a list has more numbers after the first — leave it alone.
  if (/\d/.test(suffix)) return null;
  const target = Number(digits.replace(/,/g, ''));
  if (!Number.isFinite(target)) return null;
  return { target, decimals: (digits.split('.')[1] ?? '').length, prefix, suffix };
}

const format = (n: number, decimals: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * The strongest content on the old page and the weakest visually: hairline-
 * divided row, serif numerals, cards arriving from translateZ(-400px).
 *
 * Numeric stats count up from zero as the band enters — acres, towers, floors,
 * clubhouse square feet. The two that are a list and a range are left as they
 * are, for the reason in `countable`. A residences count would belong here too,
 * but no such figure is published on bricksmarvella.in and this file does not
 * invent numbers about a real development.
 */
/**
 * The stats themselves, with their entrance and count-up.
 *
 * Split out of the band so the Master Plan section can show the same six as
 * two vertical rails either side of the plan — same markup, same animation,
 * one definition.
 */
export function StatList({ items, vertical = false }: { items: typeof stats; vertical?: boolean }) {
  const root = useRef<HTMLDListElement>(null);
  const near = useNearViewport(root);

  useEffect(() => {
    if (!near) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motionOK, () => {
        gsap.from(`.${styles.stat}`, {
          z: -400,
          opacity: 0,
          duration: DUR.emphasis,
          ease: EASE.entrance,
          stagger: STAGGER,
          scrollTrigger: { trigger: root.current, start: 'top 80%', once: true },
        });

        /* Count each numeric stat up from zero, once, on entry. The DOM node
           holds the final string for SSR and no-JS; this only takes it over
           after the trigger fires, so the real value is never absent. */
        gsap.utils.toArray<HTMLElement>(`.${styles.value}`).forEach((el) => {
          const spec = countable(el.dataset.value ?? '');
          if (!spec) return;
          const box = { n: 0 };
          gsap.to(box, {
            n: spec.target,
            duration: 1.1,
            ease: EASE.crossfade,
            scrollTrigger: { trigger: root.current, start: 'top 80%', once: true },
            onStart: () => { el.textContent = `${spec.prefix}${format(0, spec.decimals)}${spec.suffix}`; },
            onUpdate: () => {
              el.textContent = `${spec.prefix}${format(box.n, spec.decimals)}${spec.suffix}`;
            },
            onComplete: () => { el.textContent = el.dataset.value ?? ''; },
          });
        });
      });
    }, root);
    return () => ctx.revert();
  }, [near]);

  return (
    <dl ref={root} className={`${styles.grid} ${vertical ? styles.vertical : ''}`}>
      {items.map((s) => (
        <div key={s.label} className={styles.stat}>
          <dt className={styles.label}>{s.label}</dt>
          <dd className={`${styles.value} tabular`} data-value={s.value}>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function StatBand() {
  return (
    <section className={styles.section} data-ground="light" aria-labelledby="stats-heading">
      <div className={styles.inner}>
        <LineReveal
          as="h2"
          id="stats-heading"
          className={styles.heading}
          lines={[{ text: 'All ingredients for a perfect lifestyle' }]}
        />
        <p className={styles.srOnly}>{statsHeading}</p>
        <StatList items={stats} />
      </div>
    </section>
  );
}
