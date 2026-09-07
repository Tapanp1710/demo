import { masterPlan, anchors, legal, stats } from '@/lib/content';
import { StatList } from '@/components/StatBand/StatBand';
import LineReveal from '@/components/LineReveal/LineReveal';
import styles from './MasterPlan.module.css';

/**
 * The site plan, shown whole and still.
 *
 * It used to open across a 180svh scroll track: a clip-path inset travelling
 * from a wide rounded rectangle out to full bleed, with the image
 * counter-scaling 1.06 -> 1 so the drawing did not appear to zoom. That is
 * gone. The drawing is a dense technical document — two towers, a numbered
 * legend of twenty-two items — and anything that masks it is hiding the
 * content someone came to this section to read. It now sits at its full size
 * from the moment it is on screen.
 *
 * The section is a plain 100svh as a result: no scroll length to reserve,
 * nothing pins, and with no state or effects left it is a server component
 * again — the 'use client' directive went with the timeline.
 */
export default function MasterPlan() {
  return (
    <section id={anchors.masterPlan} className={styles.section} data-ground="stage" aria-labelledby="masterplan-heading">
      <div className={styles.sticky}>
      {/* The six project figures, split evenly either side of the plan. */}
      <div className={`${styles.rail} ${styles.railLeft}`}>
        <StatList items={stats.slice(0, Math.ceil(stats.length / 2))} vertical />
      </div>

      <div className={styles.head}>
        <p className={styles.eyebrow}>The site</p>
        <LineReveal as="h2" id="masterplan-heading" className={styles.heading} lines={[{ text: 'Master Plan' }]} />
      </div>

      <div className={styles.frame}>
        <picture>
          <source type="image/avif" sizes="100vw"
            srcSet={`${masterPlan.image}-900.avif 900w, ${masterPlan.image}-1400.avif 1400w, ${masterPlan.image}-2048.avif 2048w`} />
          <source type="image/webp" sizes="100vw"
            srcSet={`${masterPlan.image}-900.webp 900w, ${masterPlan.image}-1400.webp 1400w, ${masterPlan.image}-2048.webp 2048w`} />
          <img
            src={`${masterPlan.image}-1400.webp`}
            alt={masterPlan.alt}
            width={2048}
            height={1252}
            loading="lazy"
            decoding="async"
          />
        </picture>
      </div>

      <div className={`${styles.rail} ${styles.railRight}`}>
        <StatList items={stats.slice(Math.ceil(stats.length / 2))} vertical />
      </div>

      <p className={styles.disclaimer}>{legal.imageDisclaimer}</p>
      </div>

      {/* Reduced motion / no-JS: the plan simply renders, full width. */}
      <noscript>
        <img src={`${masterPlan.image}-1400.webp`} alt={masterPlan.alt} width={1400} height={856} />
      </noscript>
    </section>
  );
}
