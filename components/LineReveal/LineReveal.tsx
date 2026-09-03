'use client';

import { useEffect, useRef, type ElementType, type ReactNode } from 'react';
import { gsap, MQ, EASE, DUR, STAGGER } from '@/lib/gsap';
import styles from './LineReveal.module.css';

/**
 * Line-mask text reveal: each line sits in an overflow-hidden box and rises
 * from y:110%, so glyphs emerge from behind a baseline rather than fading in.
 *
 * Triggered ONCE on entry, never scrubbed — scrubbed text reveals feel
 * unstable because the reader can hold a line half-emerged.
 *
 * Lines are authored, not measured: the caller passes the breaks it wants, so
 * there is no re-splitting on resize and no layout thrash. Pass `italic: true`
 * on a line to set it in Cormorant's true italic (never a synthesised oblique).
 */

export interface RevealLine {
  text: string;
  italic?: boolean;
}

interface Props {
  lines: (string | RevealLine)[];
  as?: ElementType;
  className?: string;
  /** Delay before the first line, in seconds. */
  delay?: number;
  id?: string;
  children?: ReactNode;
}

export default function LineReveal({ lines, as: Tag = 'h2', className, delay = 0, id }: Props) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motionOK, () => {
        gsap.from(`.${styles.line}`, {
          yPercent: 110,
          duration: DUR.emphasis,
          ease: EASE.entrance,
          stagger: STAGGER,
          delay,
          scrollTrigger: {
            trigger: root.current,
            start: 'top 88%',
            once: true,        // entry-triggered, never scrubbed
          },
        });
      });
    }, root);
    return () => ctx.revert();
  }, [delay]);

  const normalised: RevealLine[] = lines.map((l) => (typeof l === 'string' ? { text: l } : l));

  return (
    <Tag ref={root} className={[styles.root, className].filter(Boolean).join(' ')} id={id}>
      {normalised.map((line, i) => (
        <span key={`${line.text}-${i}`} className={styles.mask}>
          <span className={`${styles.line} ${line.italic ? styles.italic : ''}`}>{line.text}</span>
        </span>
      ))}
    </Tag>
  );
}
