'use client';

import { useEffect, useRef } from 'react';
import { gsap, MQ, EASE } from '@/lib/gsap';
import { droneFaces } from '@/lib/content';
import { useNearViewport } from '@/lib/useNearViewport';
import styles from './DroneCube.module.css';

/**
 * A real CSS 3D cube — four aerial faces at rotateY(0/90/180/270) translateZ(50%),
 * plus dimmed top and bottom faces so it reads as a solid, not four planes.
 *
 * Scroll scrubs one full revolution. Captions are driven by the LIVE rotation
 * value, not by timeline position: a face's caption is visible only while that
 * face is within ±35° of camera-facing, so the text can never desync from the
 * geometry if the scrub is dragged, resized, or refreshed mid-flight.
 */

const FACE_COUNT = 4;
const CAPTION_ARC = 35; // degrees either side of camera-facing

/** Shortest signed angular distance from `a` to `b`, in degrees. */
function angleDelta(a: number, b: number) {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

export default function DroneCube() {
  const root = useRef<HTMLElement>(null);
  const near = useNearViewport(root);
  const cube = useRef<HTMLDivElement>(null);
  const captions = useRef<HTMLElement[]>([]);

  useEffect(() => {
    if (!near) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        { wide: '(min-width: 768px)', narrow: '(max-width: 767px)', motion: MQ.motionOK },
        (context) => {
          const { wide, motion } = context.conditions as Record<string, boolean>;
          if (!motion || !cube.current) return;

          const state = { ry: 0, rx: 0 };
          const setCube = gsap.quickSetter(cube.current, 'css');

          // Recomputed every frame from the live rotation.
          const paint = () => {
            setCube({
              transform: `translateZ(-14vmin) rotateX(${state.rx}deg) rotateY(${state.ry}deg)`,
            });
            for (let i = 0; i < FACE_COUNT; i++) {
              const faceAngle = i * 90;
              // A face is camera-facing when cube rotation cancels its own offset.
              const off = Math.abs(angleDelta(-state.ry, faceAngle));
              const el = captions.current[i];
              if (!el) continue;
              const t = 1 - Math.min(off / CAPTION_ARC, 1);
              el.style.opacity = String(t);
              el.style.transform = `translateY(${(1 - t) * 14}px)`;
              el.style.visibility = t <= 0.001 ? 'hidden' : 'visible';
            }
          };

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              // The section is a CSS-reserved track with a sticky inner, so no
              // pin spacer is ever inserted and the document height is fixed.
              end: 'bottom bottom',
              scrub: 1,
              invalidateOnRefresh: true,
              onEnter: () => { if (cube.current) cube.current.style.willChange = 'transform'; },
              onLeave: () => { if (cube.current) cube.current.style.willChange = ''; },
              onLeaveBack: () => { if (cube.current) cube.current.style.willChange = ''; },
            },
            onUpdate: paint,
          });

          tl.to(state, { ry: 360, ease: EASE.scrub }, 0);
          tl.to(state, { rx: wide ? 20 : 0, ease: EASE.scrub }, 0);
          tl.fromTo(
            `.${styles.stage}`,
            { scale: 0.8 },
            { keyframes: [{ scale: 1.05, duration: 0.6 }, { scale: 0.9, duration: 0.4 }], ease: EASE.scrub },
            0,
          );

          paint();
        },
      );
    }, root);

    return () => ctx.revert();
  }, [near]);

  return (
    <section ref={root} className={styles.section} data-ground="stage" aria-labelledby="cube-heading">
      <div className={styles.sticky}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>The outlook</p>
          <h2 id="cube-heading" className={styles.heading}>
            Immerse yourself
            <br />
            in the city views
          </h2>
        </header>

        <div className={styles.stage}>
          <div ref={cube} className={styles.cube}>
            {droneFaces.map((face, i) => (
              <div
                key={face.image}
                className={styles.face}
                style={{ ['--face-angle' as string]: `${i * 90}deg` }}
              >
                <picture>
                  <source type="image/avif" sizes="(max-width: 767px) 60vmin, 48vmin"
                    srcSet={`${face.image}-600.avif 600w, ${face.image}-1000.avif 1000w`} />
                  <source type="image/webp" sizes="(max-width: 767px) 60vmin, 48vmin"
                    srcSet={`${face.image}-600.webp 600w, ${face.image}-1000.webp 1000w`} />
                  <img src={`${face.image}-600.webp`} alt={face.alt} width={1000} height={750} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
                </picture>
              </div>
            ))}
            {/* Top and bottom close the solid. Decorative — the four side faces
                already carry the alt text. */}
            <div className={`${styles.face} ${styles.faceTop}`} aria-hidden="true">
              <picture>
                <source srcSet={`${droneFaces[0].image}-600.avif`} type="image/avif" />
                <img src={`${droneFaces[0].image}-600.webp`} alt="" width={600} height={450} loading="lazy" decoding="async" />
              </picture>
            </div>
            <div className={`${styles.face} ${styles.faceBottom}`} aria-hidden="true" />
          </div>
        </div>

        {/* One caption layer; only the camera-facing one is visible at a time. */}
        <div className={styles.captions}>
          {droneFaces.map((face, i) => (
            <p
              key={face.caption}
              className={styles.caption}
              ref={(el) => { if (el) captions.current[i] = el; }}
            >
              {face.caption}
            </p>
          ))}
        </div>
      </div>
      </div>

      {/* Reduced motion / no-JS: the four views as a plain readable row. */}
      <ul className={styles.fallbackRow}>
        {droneFaces.map((face) => (
          <li key={face.image} className={styles.fallbackItem}>
            <picture>
              <source srcSet={`${face.image}-600.avif`} type="image/avif" />
              <img src={`${face.image}-600.webp`} alt={face.alt} width={600} height={450} loading="lazy" decoding="async" />
            </picture>
            <span className={styles.fallbackCaption}>{face.caption}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
