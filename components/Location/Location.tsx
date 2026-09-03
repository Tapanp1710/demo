'use client';

import { useState } from 'react';
import { tellapur, locationCards, contact, anchors, legal } from '@/lib/content';
import LineReveal from '@/components/LineReveal/LineReveal';
import styles from './Location.module.css';

/**
 * Tellapur: the proximity argument is a primary sales point and the old site
 * dumped it as a flat list.
 *
 * RESTORED to the earlier layout: the category names run down the LEFT as a
 * vertical list, and picking one shows that category's image plus its full
 * list of places on the RIGHT. The accordion that briefly replaced it stacked
 * every category header vertically, which ran the titles into each other and
 * pushed the open list past the bottom of the section.
 *
 * ARIA tabs, with the tabs as direct children of the tablist and roving
 * tabindex — a vertical tablist is exactly what this is.
 *
 * No drive times are invented: the source states one, on Offices, and that is
 * the only one shown.
 */
export default function Location() {
  const [active, setActive] = useState(0);

  const onKey = (e: React.KeyboardEvent) => {
    const delta = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (active + delta + rows) % rows;
    setActive(next);
    document.getElementById(`loc-tab-${next}`)?.focus();
  };

  /** The map is a fifth row in the same list — see the note above. */
  const MAP = locationCards.length;
  const rows = locationCards.length + 1;

  return (
    <section id={anchors.location} className={styles.section} aria-labelledby="location-heading">
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>Location</p>
          <LineReveal
            as="h2"
            id="location-heading"
            className={styles.heading}
            lines={[{ text: 'Tellapur, the future is here' }]}
          />
          <p className={styles.tagline}>{tellapur.tagline}</p>
          <p className={styles.intro}>{tellapur.body}</p>
        </header>

        <div className={styles.split}>
          {/* Category names, down the left. */}
          <div
            className={styles.tabs}
            role="tablist"
            aria-orientation="vertical"
            aria-label="What's nearby"
            onKeyDown={onKey}
          >
            {locationCards.map((c, i) => (
              <button
                key={c.title}
                id={`loc-tab-${i}`}
                role="tab"
                type="button"
                aria-selected={active === i}
                aria-controls={`loc-panel-${i}`}
                tabIndex={active === i ? 0 : -1}
                className={`${styles.tab} ${active === i ? styles.tabActive : ''}`}
                onClick={() => setActive(i)}
              >
                <span className={styles.tabTitle}>{c.title}</span>
                {c.time && <span className={`${styles.tabTime} tabular`}>{c.time}</span>}
              </button>
            ))}

            <button
              id={`loc-tab-${MAP}`}
              role="tab"
              type="button"
              aria-selected={active === MAP}
              aria-controls={`loc-panel-${MAP}`}
              tabIndex={active === MAP ? 0 : -1}
              className={`${styles.tab} ${active === MAP ? styles.tabActive : ''}`}
              onClick={() => setActive(MAP)}
            >
              <span className={styles.tabTitle}>On the map</span>
            </button>
          </div>

          {/* The selected category: its image, and every place in it. */}
          {locationCards.map((c, i) => (
            <div
              key={c.title}
              id={`loc-panel-${i}`}
              role="tabpanel"
              aria-labelledby={`loc-tab-${i}`}
              hidden={active !== i}
              className={styles.panel}
            >
              <picture>
                <source srcSet={`${c.image}-900.avif`} type="image/avif" />
                <img src={`${c.image}-900.webp`} alt={c.alt} width={900} height={600} loading="lazy" decoding="async" />
              </picture>
              <ul className={styles.list}>
                {c.items.map((item, n) => (
                  <li key={item} style={{ ['--i' as string]: String(n) }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}

          {/* Only mounted while open: an iframe nobody is looking at is still a
              third-party document being fetched and framed. */}
          <div
            id={`loc-panel-${MAP}`}
            role="tabpanel"
            aria-labelledby={`loc-tab-${MAP}`}
            hidden={active !== MAP}
            className={styles.panel}
          >
            {active === MAP && (
              <iframe
                className={styles.map}
                src={contact.mapEmbed}
                title="Bricks Marvella Map"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </div>
        </div>

        <p className={styles.disclaimer}>{legal.imageDisclaimer}</p>
      </div>
    </section>
  );
}
