'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, MQ, EASE } from '@/lib/gsap';
import { nav, sectionIndex, phone, site, anchors } from '@/lib/content';
import ContactDialog, { OPEN as CONTACT_OPEN } from '@/components/ContactDialog/ContactDialog';
import styles from './Nav.module.css';

/**
 * Pinned bar, and the wordmark that flies into it.
 *
 * The mark is owned by the NAV, not the hero, and is `position: fixed` — so it
 * is one element that is always present and never scrolls away. Its RESTING
 * state is the small mark in the bar; on load a transform scales it up and
 * drops it onto the hero, and scrolling unwinds that transform back to
 * identity. Inverse FLIP: the finished state needs no transform, so it lands
 * exactly in the bar every time regardless of viewport or font loading.
 *
 * (The hero used to own it. Two bugs followed: a `gsap.context()` scoped to the
 * hero cannot resolve a selector for the bar outside it, so the bar never faded
 * in; and once the hero scrolled away it took the mark with it, leaving the bar
 * empty.)
 */
export default function Nav({ standalone = false }: { standalone?: boolean }) {
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLElement>(null);
  const mark = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    // No hero to fly out of, so nothing morphs — but the sticky CTA still has
    // to appear, since its only reveal on the home page is the timeline below.
    if (standalone) {
      gsap.set('[data-sticky-cta]', { autoAlpha: 1 });
      return;
    }
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(MQ.motionOK, () => {
        const el = mark.current;
        const barEl = bar.current;
        if (!el || !barEl) return;

        /**
         * Measure the hero placeholder against the mark's resting box.
         * Function-based values re-run on every ScrollTrigger refresh, so a
         * resize or a late font load re-measures rather than drifting.
         *
         * Size travels as font-size, NOT scale. Scaling the 22px bar mark up to
         * the hero's 182px rasterises it once at 22px and stretches the bitmap
         * — the hero wordmark came out visibly blurred. font-size re-renders
         * the glyphs at every frame, and on one `position: fixed` element with
         * nothing in flow beneath it the extra layout is free.
         *
         * Only `y` travels: both the hero slot and the bar slot are centred, so
         * `left: 50%` already holds x at every size.
         */
        const from = () => {
          const target = document.querySelector<HTMLElement>('[data-hero-wordmark]');
          // Neutralise the tween's own output before measuring the resting box.
          gsap.set(el, { clearProps: 'transform,fontSize' });
          if (!target) return { y: 0, fontSize: getComputedStyle(el).fontSize };

          /* Measure the mark AT the hero size, not at its resting size. The box
             grows downward from `top` as font-size grows, so an offset computed
             from the 31px box lands the 262px one ~115px too low. */
          const fontSize = getComputedStyle(target).fontSize;
          gsap.set(el, { fontSize });
          const m = el.getBoundingClientRect();
          gsap.set(el, { clearProps: 'fontSize' });

          /* Centres, not tops. The slot sets line-height 0.9 and the mark 1.4,
             so their boxes differ in height at the same glyph size; only the
             centres line up with what the eye reads as the same position. */
          const t = target.getBoundingClientRect();
          return { y: (t.top + t.height / 2) - (m.top + m.height / 2), fontSize };
        };

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: document.documentElement,
            start: 0,
            end: () => window.innerHeight * 0.9,
            scrub: 0.4,
            invalidateOnRefresh: true,
          },
        });

        /* The bar's resting size, read off the hidden slot rather than off the
           mark — the mark carries the tween's own inline font-size, so reading
           it here would feed the tween its current value as its destination. */
        const rest = () => {
          const s = document.querySelector<HTMLElement>(`.${styles.slot}`);
          return s ? getComputedStyle(s).fontSize : '1.25rem';
        };

        // Unwind from the hero state to identity — the bar slot.
        tl.fromTo(el,
          { y: () => from().y, fontSize: () => from().fontSize },
          { y: 0, fontSize: rest, ease: EASE.scrub }, 0);

        // The bar itself arrives underneath as the mark settles, and the sticky
        // conversion pair with it — it stands in for the hero's own CTAs, so it
        // appears exactly as those leave rather than sitting on top of them.
        tl.fromTo([barEl, '[data-sticky-cta]'],
          { autoAlpha: 0 }, { autoAlpha: 1, ease: EASE.scrub, duration: 0.45 }, 0.55);

        /* No ScrollTrigger.refresh() here. Refreshing from inside a trigger's
           own setup recomputes every other trigger's start/end at an arbitrary
           moment — including while one is mid-scrub — which can teleport the
           scroll position. refreshWhenSettled() owns refresh timing. */
      });

      // Reduced motion: the bar, its mark and the CTA are simply always there.
      mm.add(MQ.motionReduced, () => {
        gsap.set([bar.current, '[data-sticky-cta]'], { autoAlpha: 1 });
        gsap.set(mark.current, { clearProps: 'transform,fontSize' });
      });
    });

    return () => ctx.revert();
  }, [standalone]);

  return (
    <>
      <header
        ref={bar}
        data-nav-bar
        className={`${styles.bar} ${standalone ? styles.standalone : ''}`}
      >
        {/* Plain labels, no numbering. */}
        <nav className={styles.links} aria-label="Sections">
          {sectionIndex.map((item) => (
            <Link key={item.href} href={item.href} className={styles.link}>{item.label}</Link>
          ))}
        </nav>

        {/* Reserves the mark's footprint so the bar's grid does not collapse —
            the mark itself is fixed and sits on top of this box. Same text,
            same type styles, hidden: the column is then exactly as wide as the
            mark at every breakpoint rather than a guessed clamp. */}
        <span className={styles.slot} aria-hidden="true">{site.name}</span>

        {/* The centre line carries the wordmark and NOTHING else. The RERA
            number moved to the footer, where it already appeared; the phone
            moved into the Menu panel. Both used to sit on this line and the
            three collided at every width under 1600px. */}
        <div className={styles.right}>
          {/* The lead form is no longer a section of the page — this is how it
              is reached. ContactDialog also intercepts every remaining link to
              the old anchors, so the sticky CTA and the footer still work. */}
          <button
            type="button"
            className={styles.contactButton}
            onClick={() => window.dispatchEvent(new Event(CONTACT_OPEN))}
          >
            Contact us
          </button>

          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls="nav-overlay"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </header>

      {/* One element, fixed, always present: large over the hero at the top of
          the page, small in the bar once scrolled. */}
      <Link
        ref={mark}
        href="/"
        data-nav-mark
        className={`${styles.mark} ${standalone ? styles.markStandalone : ''}`}
        aria-label={`${site.name} — home`}
      >
        {site.name}
      </Link>

      <div
        id="nav-overlay"
        className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}
        hidden={!open}
      >
        <nav className={styles.overlayNav} aria-label="All pages">
          {sectionIndex.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.overlayLink}
              style={{ ['--i' as string]: String(i) }}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          {/* The pages that are not sections of this one. */}
          <span className={styles.overlayRule} aria-hidden="true" />
          {nav.filter((item) => !item.href.includes('#')).map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.overlayLink} ${styles.overlayLinkSmall}`}
              style={{ ['--i' as string]: String(sectionIndex.length + i) }}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link href={`/#${anchors.leadForm}`} className={styles.overlayCta} onClick={() => setOpen(false)}>
            Request Price
          </Link>

          {/* The phone, displaced from the bar's centre line. */}
          <a className={styles.overlayPhone} href={phone.primary.telHref}>{phone.primary.display}</a>
        </nav>
      </div>

      <ContactDialog />
    </>
  );
}
