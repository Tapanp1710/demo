import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { amenities, site, legal, phone, contact, anchors } from '@/lib/content';
import amenityImages from '@/lib/amenity-images.json';
import styles from './amenity.module.css';

/** What the pipeline actually emitted per slug — see scripts/build-amenity-images.mjs. */
const images: Record<string, { w: number; h: number; widths: number[] }> = amenityImages;
const srcSet = (base: string, slug: string, ext: string) =>
  (images[slug]?.widths ?? [560]).map((w) => `${base}-${w}.${ext} ${w}w`).join(', ');
const largest = (slug: string) => images[slug]?.widths.at(-1) ?? 560;
const SIZES = '(max-width: 767px) 100vw, min(72rem, 92vw)';

/**
 * The 19 amenity pages. Their URLs are preserved exactly — they carry SEO value —
 * and the layout matches what exists today: title, image, shared boilerplate.
 *
 * The old pages contain NO per-amenity copy. When the client supplies it, adding
 * `description` to the amenity in lib/content.ts renders it here; no component
 * change is needed.
 */

export function generateStaticParams() {
  return amenities.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const amenity = amenities.find((a) => a.slug === slug);
  if (!amenity) return {};
  const title = `${amenity.title} — ${site.name}`;
  const description =
    amenity.description ??
    `${amenity.title} at ${site.name}, Tellapur, Hyderabad — one of ${amenities.length} amenities in the 42,000 sft clubhouse.`;
  return {
    title,
    description,
    alternates: { canonical: `/portfolio-item/${amenity.slug}/` },
    openGraph: { title, description, url: `/portfolio-item/${amenity.slug}/`, type: 'article' },
  };
}

export default async function AmenityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const amenity = amenities.find((a) => a.slug === slug);
  if (!amenity) notFound();

  const index = amenities.findIndex((a) => a.slug === slug);
  const prev = amenities[(index - 1 + amenities.length) % amenities.length];
  const next = amenities[(index + 1) % amenities.length];

  return (
    <main id="main" className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">{site.name}</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/#${anchors.amenities}`}>Amenities</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{amenity.title}</span>
      </nav>

      <header className={styles.head}>
        <p className={styles.eyebrow}>
          Amenity <span className="tabular">{String(index + 1).padStart(2, '0')}</span> of{' '}
          <span className="tabular">{amenities.length}</span>
        </p>
        <h1 className={styles.title}>{amenity.title}</h1>
        {amenity.descriptor && <p className={styles.descriptor}>{amenity.descriptor}</p>}
      </header>

      <figure className={styles.figure}>
        <picture>
          <source srcSet={srcSet(amenity.image, slug, 'avif')} sizes={SIZES} type="image/avif" />
          <img
            src={`${amenity.image}-${largest(slug)}.webp`}
            srcSet={srcSet(amenity.image, slug, 'webp')}
            sizes={SIZES}
            alt={amenity.alt}
            /* Real intrinsic size of the largest emitted file. A hardcoded
               1400x788 both 404s for the four amenities that top out at 900px
               and states the wrong aspect for images that are not 16:9. */
            width={images[slug]?.w ?? 560}
            height={images[slug]?.h ?? 315}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      </figure>

      {/* Renders only once the client supplies copy — nothing invented here. */}
      {amenity.description && (
        <div className={styles.body}>
          <p>{amenity.description}</p>
        </div>
      )}

      <section className={styles.boilerplate} aria-label="About the developer">
        <p className={styles.lede}>
          Bricks Infra Group is a respected name in the real estate sector in Hyderabad and is
          well known for providing superior quality homes.
        </p>
        <dl className={styles.facts}>
          <div>
            <dt>{legal.reraLabel}</dt>
            <dd className="tabular">{legal.rera}</dd>
          </div>
          <div>
            <dt>{legal.buildingPermissionLabel}</dt>
            <dd className="tabular">{legal.buildingPermission}</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>{contact.address}</dd>
          </div>
          <div>
            <dt>Enquiries</dt>
            <dd>
              <a href={phone.primary.telHref}>{phone.primary.display}</a>
              <br />
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </dd>
          </div>
        </dl>
      </section>

      <nav className={styles.pager} aria-label="More amenities">
        <Link href={`/portfolio-item/${prev.slug}/`} className={styles.pagerLink}>
          <span className={styles.pagerLabel}>Previous</span>
          <span className={styles.pagerTitle}>{prev.title}</span>
        </Link>
        <Link href={`/portfolio-item/${next.slug}/`} className={`${styles.pagerLink} ${styles.pagerNext}`}>
          <span className={styles.pagerLabel}>Next</span>
          <span className={styles.pagerTitle}>{next.title}</span>
        </Link>
      </nav>
    </main>
  );
}
