import { phone, anchors } from '@/lib/content';
import styles from './StickyCTA.module.css';

/**
 * Persistent conversion pair. These convert — so no motion beyond a 3px hover
 * lift, and nothing that could delay a tap.
 *
 * Two circles, stacked. The labels used to be the buttons' only accessible
 * name; with the text gone each carries an aria-label instead, and `title` so a
 * pointer user gets the same words on hover. An icon-only control with neither
 * is a button that only says "link" to a screen reader.
 *
 * Icons are inline SVG on currentColor rather than a font or an <img>: they
 * inherit each circle's own colour, cost no extra request, and cannot arrive
 * late on the one control the whole page is built to reach.
 */
export default function StickyCTA() {
  return (
    <div className={styles.bar} data-sticky-cta>
      <a
        className={styles.price}
        href={`/#${anchors.leadForm}`}
        aria-label="Request price"
        title="Request price"
      >
        {/* A price tag. */}
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M20.6 12.4 12.4 20.6a2 2 0 0 1-2.8 0l-6.2-6.2a2 2 0 0 1-.6-1.4V4.8A1.8 1.8 0 0 1 4.8 3h8.2a2 2 0 0 1 1.4.6l6.2 6.2a2 2 0 0 1 0 2.6Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <circle cx="8.2" cy="8.2" r="1.5" fill="currentColor" />
        </svg>
      </a>

      <a
        className={styles.call}
        href={phone.primary.telHref}
        aria-label={`Call ${phone.primary.display}`}
        title={`Call ${phone.primary.display}`}
      >
        {/* A handset. */}
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M21 16.9v2.7a1.8 1.8 0 0 1-2 1.8 17.8 17.8 0 0 1-7.7-2.8 17.5 17.5 0 0 1-5.4-5.4A17.8 17.8 0 0 1 3.1 5.5a1.8 1.8 0 0 1 1.8-2h2.7a1.8 1.8 0 0 1 1.8 1.5c.1.9.3 1.7.6 2.5a1.8 1.8 0 0 1-.4 1.9l-1.1 1.1a14.4 14.4 0 0 0 5.4 5.4l1.1-1.1a1.8 1.8 0 0 1 1.9-.4c.8.3 1.6.5 2.5.6a1.8 1.8 0 0 1 1.6 1.9Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </div>
  );
}
