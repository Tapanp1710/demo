import { testimonials } from '@/lib/content';
import styles from './Testimonials.module.css';

/**
 * Ported from the site's Google/Trustindex widget. Attribution and the star
 * rating stay — removing them is both a trust problem and a likely ToS one.
 * Nothing here is fabricated: only reviews present on the source site appear.
 */
export default function Testimonials() {
  return (
    <section className={styles.section} aria-labelledby="testimonials-heading">
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>{testimonials.heading}</p>
          <p className={styles.source}>Reviews from {testimonials.source}</p>
        </header>

        <ul className={styles.list}>
          {testimonials.items.map((t) => (
            <li key={t.author} className={styles.item}>
              <blockquote className={styles.quote}>{t.body}</blockquote>
              <figcaption className={styles.meta}>
                <picture>
                  <source srcSet={`${t.avatar}.avif`} type="image/avif" />
                  <img
                    className={styles.avatar}
                    src={`${t.avatar}.webp`}
                    alt={`${t.author} profile picture`}
                    width={60}
                    height={60}
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
                <span>
                  <span className={styles.author}>{t.author}</span>
                  <span className={styles.date}>{t.date}</span>
                </span>
                <span className={styles.rating} aria-label={`${t.rating} out of 5 stars on ${testimonials.source}`}>
                  {'★'.repeat(t.rating)}
                </span>
              </figcaption>
            </li>
          ))}
        </ul>
        <h2 id="testimonials-heading" className={styles.srOnly}>{testimonials.heading}</h2>
      </div>
    </section>
  );
}
