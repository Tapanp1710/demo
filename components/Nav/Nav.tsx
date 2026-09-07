'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap, MQ, EASE } from '@/lib/gsap';
import { site, anchors } from '@/lib/content';
import ContactDialog from '@/components/ContactDialog/ContactDialog';
import Wordmark from '@/components/Wordmark/Wordmark';
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
/* THREE things in the bar and no more: the wordmark, which is the link home,
   and the two routes that are not part of this page. Both sit to the RIGHT of
   the wordmark; the left track is left empty on purpose, because the two 1fr
   tracks either side are what hold the wordmark on the centre line — the mark
   itself is position: fixed at left: 50%, so anything that moved that centre
   would leave it painting off its own slot.

   The home page's own sections are not here any more. They are a scroll away
   on the page itself, and the footer carries the full index of them — a bar
   that repeated all nine was competing with both. */
/* The four sections asked for, in the LEFT track — which the bar's
   1fr auto 1fr otherwise leaves empty purely to hold the wordmark on the centre
   line. They are in-page anchors rather than routes, so they get their own
   <nav> with its own label: a screen reader announcing "Pages" over a list of
   jumps within this page is wrong about what following one does.

   The hrefs come from `anchors`, never typed out here — those ids are the old
   site's URLs and are load-bearing. The labels are free text because they are
   what was asked for; the destinations are not. */
const NAV_LEFT = [
  { label: 'About', href: `/#${anchors.about}` },
  { label: 'Amenities', href: `/#${anchors.amenities}` },
  { label: 'Master Plan', href: `/#${anchors.masterPlan}` },
  { label: 'Location', href: `/#${anchors.location}` },
];

const NAV_RIGHT = [
  /* `drop` is the part of the label that goes on a very narrow phone, where
     the right track is about 88px and no readable size fits the full pair.
     "Project Status" becomes "Status"; the link and its destination do not
     change. Marked up rather than swapped at a breakpoint in JS so there is
     one DOM for both, and no hydration mismatch. */
  { label: 'Project Status', href: '/project-status/', drop: 'Project ' },
  { label: 'Blog', href: '/blog/' },
] as { label: string; href: string; drop?: string }[];

export default function Nav({ standalone = false }: { standalone?: boolean }) {
  const bar = useRef<HTMLElement>(null);
  const mark = useRef<HTMLAnchorElement>(null);

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
         * X TRAVELS TOO, now that the hero slot is right-aligned and the bar
         * slot is centred. It used to be free — both were centred, so
         * `left: 50%` held x at every size — and leaving it out once the hero
         * moved would have landed the mark in the middle of the hero instead
         * of on its right margin.
         */
        const from = () => {
          const target = document.querySelector<HTMLElement>('[data-hero-wordmark]');
          // Neutralise the tween's own output before measuring the resting box.
          gsap.set(el, { clearProps: 'transform,fontSize' });
          if (!target) return { x: 0, y: 0, fontSize: getComputedStyle(el).fontSize };

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
          return {
            x: (t.left + t.width / 2) - (m.left + m.width / 2),
            y: (t.top + t.height / 2) - (m.top + m.height / 2),
            fontSize,
          };
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
        /* from() is called per property and re-measures each time, so it is
           read once per refresh into a single object — three calls would each
           clear and re-set the mark's own styles while measuring. */
        let start = from();
        tl.fromTo(el,
          { x: () => (start = from()).x, y: () => start.y, fontSize: () => start.fontSize },
          { x: 0, y: 0, fontSize: rest, ease: EASE.scrub }, 0);

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
        {/* Column 1 is deliberately EMPTY and deliberately still there. The
            bar's 1fr auto 1fr is what holds the wordmark on the centre line,
            and the mark itself is fixed at left: 50% — drop the track and the
            hidden slot stops lining up with the mark it is reserving for. */}
        <div className={styles.spacer} aria-hidden="true" />

        {/* Reserves the mark's footprint so the bar's grid does not collapse —
            the mark itself is fixed and sits on top of this box. Same text,
            same type styles, hidden: the column is then exactly as wide as the
            mark at every breakpoint rather than a guessed clamp. */}
        <span className={styles.slot} aria-hidden="true"><Wordmark /></span>

        {/* EVERY link sits to the RIGHT of the wordmark. The two groups stay
            separate <nav> elements inside the one cell rather than being merged
            into a single list: the first four are jumps within this page and
            the last two are routes to other pages, and one label read over both
            would misdescribe half of them. */}
        <div className={styles.linkGroup}>
          <nav className={styles.sections} aria-label="Sections">
            {NAV_LEFT.map(({ href, label }) => (
              <Link key={href} href={href} className={styles.link}>{label}</Link>
            ))}
          </nav>

          <nav className={styles.pages} aria-label="Pages">
            {NAV_RIGHT.map(({ href, label, drop }) => (
              <Link key={href} href={href} className={styles.link}>
                {drop ? <span className={styles.labelWide}>{drop}</span> : null}
                {drop ? label.slice(drop.length) : label}
              </Link>
            ))}
          </nav>
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
        <Wordmark />
      </Link>

      <ContactDialog />
    </>
  );
}
