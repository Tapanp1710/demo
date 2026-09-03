import { phone, anchors } from '@/lib/content';
import styles from './StickyCTA.module.css';

/**
 * Persistent conversion pair. These convert — so no motion beyond a 3px hover
 * lift, and nothing that could delay a tap.
 */
export default function StickyCTA() {
  return (
    <div className={styles.bar} data-sticky-cta>
      <a className={styles.price} href={`/#${anchors.leadForm}`}>Request Price</a>
      <a className={styles.call} href={phone.primary.telHref}>Call Now</a>
    </div>
  );
}
