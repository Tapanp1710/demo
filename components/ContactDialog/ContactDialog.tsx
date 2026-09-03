'use client';

import { useEffect, useRef, useState } from 'react';
import LeadForm from '@/components/LeadForm/LeadForm';
import styles from './ContactDialog.module.css';

/** Every href that used to scroll to the lead form section. */
const LINKS = 'a[href*="#contact"], a[href*="#leadform"], a[href*="#registeryourinterest"]';

/** Anything may ask for the form: `window.dispatchEvent(new Event(OPEN))`. */
export const OPEN = 'contact:open';

/**
 * The lead form as a modal.
 *
 * It used to be a full section at the foot of the home page. As a dialog it is
 * reachable from anywhere — including the pages that are not the home page,
 * whose "Contact" links previously navigated home and scrolled.
 *
 * A native <dialog> with showModal(), so the focus trap, the inert background,
 * Escape and the backdrop are the platform's rather than ours. The form is not
 * built until the first open: it is a dozen fields and a select that nobody
 * has asked for yet.
 *
 * Links to the old anchors are intercepted here rather than rewritten at every
 * call site — the sticky CTA, the hero, the nav overlay and the footer all
 * point at them, and one delegated listener is a smaller thing to keep right
 * than five edits.
 */
export default function ContactDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [built, setBuilt] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const open = () => {
      setBuilt(true);
      if (!el.open) el.showModal();
      document.body.style.overflow = 'hidden';
    };

    /* CAPTURE phase. next/link's own click handler bails out when the event is
       already default-prevented, so intercepting on the way DOWN stops the
       navigation while every other handler on the link — the nav overlay
       closing itself, for one — still runs on the way up. */
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(LINKS)) return;
      e.preventDefault();
      open();
    };

    window.addEventListener(OPEN, open);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener(OPEN, open);
      document.removeEventListener('click', onClick, true);
      document.body.style.overflow = '';
    };
  }, []);

  const close = () => { ref.current?.close(); };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label="Register your interest"
      onClose={() => { document.body.style.overflow = ''; }}
      /* The backdrop is the dialog's own box outside the panel, so a click that
         lands on the element itself — never on a child — is a click outside. */
      onClick={(e) => { if (e.target === ref.current) close(); }}
    >
      <div className={styles.panel}>
        <button type="button" className={styles.close} onClick={close} aria-label="Close">
          <span aria-hidden="true">×</span>
        </button>
        {built && <LeadForm modal />}
      </div>
    </dialog>
  );
}
