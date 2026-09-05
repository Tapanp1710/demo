import Link from 'next/link';
import { site, legal, contact, phone, nav } from '@/lib/content';
import styles from './Footer.module.css';

/**
 * Restrained, hairline-divided. Carries the legal strings verbatim — RERA
 * number, building permission number and the representation disclaimer are
 * required on every page, not decoration.
 */
export default function Footer() {
  return (
    <footer className={styles.footer} data-ground="stage">
      <div className={styles.inner}>
        <div className={styles.brand}>
          <p className={styles.mark}>{site.name}</p>
          <p className={styles.by}>by {site.developer}</p>
          <picture>
            <source srcSet="/logos/bricks-ramabhupal-300.avif" type="image/avif" />
            <img
              className={styles.logo}
              src="/logos/bricks-ramabhupal-300.webp"
              alt={`${site.developer} logo`}
              width={300}
              height={105}
              loading="lazy"
              decoding="async"
            />
          </picture>
        </div>

        <nav className={styles.links} aria-label="Footer">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={styles.link}>{item.label}</Link>
          ))}
          <Link href="/privacy-policy/" className={styles.link}>Privacy Policy</Link>
        </nav>

        <address className={styles.contact}>
          <a href={phone.primary.telHref}>{phone.primary.display}</a>
          <a href={phone.secondary.telHref}>{phone.secondary.display}</a>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
          <span>{contact.address}</span>
        </address>
      </div>

      <div className={styles.legal}>
        <p>
          <strong>{legal.reraLabel}:</strong>{' '}
          <a href={legal.reraUrl} target="_blank" rel="noreferrer" className="tabular">{legal.rera}</a>
        </p>
        <p>
          <strong>{legal.buildingPermissionLabel}:</strong>{' '}
          <span className="tabular">{legal.buildingPermission}</span>
        </p>
        <p className={styles.disclaimer}>{legal.imageDisclaimer}</p>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} {site.developer}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
