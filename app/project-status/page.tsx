import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav/Nav';
import Construction from '@/components/Construction/Construction';
import Footer from '@/components/Footer/Footer';
import StickyCTA from '@/components/StickyCTA/StickyCTA';
import GroundProvider from '@/components/GroundProvider/GroundProvider';
import { site, legal, construction } from '@/lib/content';
import statusManifest from '@/lib/status-manifest.json';
import styles from './status.module.css';

/**
 * /project-status/ — 20 date sections, newest first, with every construction
 * photo from the source page (128 in total). The old page was 20 identical
 * unlabelled rows; here each date is a real section with a stable id so it can
 * be linked to directly.
 */

export const metadata: Metadata = {
  title: `Construction Status — ${site.name}`,
  description:
    'Monthly construction progress at Bricks Marvella, Tellapur — photographs from October 2023 to July 2026.',
  alternates: { canonical: '/project-status/' },
  openGraph: {
    title: `Construction Status — ${site.name}`,
    description: 'Monthly construction progress at Bricks Marvella, Tellapur.',
    url: '/project-status/',
  },
};

export default function ProjectStatusPage() {
  const withPhotos = statusManifest.filter((s) => s.images.length > 0);

  return (
    <>
      <GroundProvider />
      <Nav standalone />

      {/* The timeline that used to sit on the home page. This is its subject,
          so this is where it belongs — and it doubles as the jump control for
          the archive below. */}
      <Construction entries={statusManifest} />

      <main id="main" className={styles.page} data-ground="stage">
        <header className={styles.head}>
          <p className={styles.eyebrow}>{construction.eyebrow}</p>
          <h1 className={styles.title}>Construction Status</h1>
          <p className={styles.sub}>
            Progress at {site.name}, Tellapur — {withPhotos.length} photographed updates from{' '}
            {statusManifest[statusManifest.length - 1].date} to {statusManifest[0].date}.
          </p>
          <nav className={styles.jump} aria-label="Jump to a month">
            {statusManifest.map((s) => (
              <a key={s.slug} href={`#${s.slug}`} className={styles.jumpLink}>{s.date}</a>
            ))}
          </nav>
        </header>

        <ol className={styles.timeline}>
          {statusManifest.map((section) => (
            <li key={section.slug} id={section.slug} className={styles.entry}>
              <div className={styles.entryHead}>
                <h2 className={styles.date}>{section.date}</h2>
                <span className={styles.count}>
                  {section.images.length
                    ? `${section.images.length} ${section.images.length === 1 ? 'photo' : 'photos'}`
                    : 'No photos published'}
                </span>
              </div>

              {section.images.length > 0 && (
                <ul className={styles.grid}>
                  {section.images.map((img, i) => (
                    <li key={img.stem}>
                      <picture>
                        <source srcSet={`${img.stem}-${img.widths[0]}.avif`} type="image/avif" />
                        <img
                          src={`${img.stem}-${img.widths[0]}.webp`}
                          alt={`Bricks Marvella construction progress, ${section.date} — photograph ${i + 1}`}
                          width={img.w}
                          height={img.h}
                          loading="lazy"
                          decoding="async"
                        />
                      </picture>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>

        <p className={styles.disclaimer}>{legal.imageDisclaimer}</p>
        <p className={styles.back}><Link href="/">← Back to {site.name}</Link></p>
      </main>

      <Footer />
      <StickyCTA />
    </>
  );
}
