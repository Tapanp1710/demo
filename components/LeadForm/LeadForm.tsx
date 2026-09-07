'use client';

import { useState } from 'react';
import { leadForm, priceOptions, legal, anchors, phone, contact } from '@/lib/content';
import LineReveal from '@/components/LineReveal/LineReveal';
import styles from './LeadForm.module.css';

/**
 * The most important element on the page.
 *
 * Deliberately un-animated: nothing here may delay a tap or a submit. Floating
 * labels, generous field height, inline validation, visible focus rings, and
 * the consent text verbatim — it is legal copy.
 *
 * Posts to /api/lead, which validates again server-side and hands off to the
 * configured adapter.
 */
type Errors = Partial<Record<'name' | 'email' | 'phone' | 'preference' | 'consent' | 'form', string>>;

/** Material Symbols paths, 24x24 viewBox. */
const ICONS = {
  call: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
  mail: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z',
  place: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z',
} as const;

/** Decorative: the <dt> beside it already names the row. */
function Icon({ path }: { path: string }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={path} fill="currentColor" />
    </svg>
  );
}

export default function LeadForm({ modal = false }: { modal?: boolean } = {}) {
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const payload = { ...data, consent: form.consent.checked };

    setState('sending');
    setErrors({});
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrors(json.errors ?? { form: leadForm.errorMessage });
        setState('idle');
        return;
      }
      setState('sent');
      form.reset();
    } catch {
      setErrors({ form: leadForm.errorMessage });
      setState('idle');
    }
  }

  return (
    <section
      id={anchors.contact}
      className={`${styles.section} ${modal ? styles.modal : ''}`}
      aria-labelledby="lead-heading"
    >
      {/* Both legacy anchors resolve here. */}
      <span id={anchors.leadForm} className={styles.anchor} aria-hidden="true" />
      <span id={anchors.registerInterest} className={styles.anchor} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>{contact.heading}</p>
          <LineReveal
            as="h2"
            id="lead-heading"
            className={styles.heading}
            lines={[{ text: 'Register your interest' }]}
          />
          <p className={styles.sub}>{leadForm.sub}</p>

          {/* Google's Material Symbols, as inline paths rather than the icon font.
              The font is ~100 KB of glyphs to draw three of them, and it would
              have to come from gstatic — which this site deliberately does not
              touch, since next/font self-hosts everything else (see the note in
              app/layout.tsx). Inline SVG costs no request and cannot arrive
              late on the panel someone opened to make contact. */}
          <dl className={styles.details}>
            <div className={styles.detail}>
              <Icon path={ICONS.call} />
              <div>
                <dt>Call</dt>
                <dd>
                  <a href={phone.primary.telHref}>{phone.primary.display}</a>
                  <br />
                  <a href={phone.secondary.telHref}>{phone.secondary.display}</a>
                </dd>
              </div>
            </div>
            <div className={styles.detail}>
              <Icon path={ICONS.mail} />
              <div>
                <dt>Email</dt>
                <dd><a href={`mailto:${contact.email}`}>{contact.email}</a></dd>
              </div>
            </div>
            <div className={styles.detail}>
              <Icon path={ICONS.place} />
              <div>
                <dt>Site office</dt>
                <dd>{contact.address}</dd>
              </div>
            </div>
          </dl>
        </div>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <div className={styles.field}>
            <input id="lf-name" name="name" type="text" className={styles.input} placeholder=" "
              autoComplete="name" required aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'lf-name-err' : undefined} />
            <label htmlFor="lf-name" className={styles.label}>Name</label>
            {errors.name && <p id="lf-name-err" className={styles.error} role="alert">{errors.name}</p>}
          </div>

          <div className={styles.field}>
            <input id="lf-email" name="email" type="email" className={styles.input} placeholder=" "
              autoComplete="email" required aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'lf-email-err' : undefined} />
            <label htmlFor="lf-email" className={styles.label}>Email</label>
            {errors.email && <p id="lf-email-err" className={styles.error} role="alert">{errors.email}</p>}
          </div>

          <div className={styles.field}>
            <input id="lf-phone" name="phone" type="tel" className={styles.input} placeholder=" "
              autoComplete="tel" inputMode="tel" required aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'lf-phone-err' : undefined} />
            <label htmlFor="lf-phone" className={styles.label}>Phone number</label>
            {errors.phone && <p id="lf-phone-err" className={styles.error} role="alert">{errors.phone}</p>}
          </div>

          <div className={styles.field}>
            <select id="lf-pref" name="preference" className={styles.input} defaultValue="" required
              aria-invalid={!!errors.preference}
              aria-describedby={errors.preference ? 'lf-pref-err' : undefined}>
              <option value="" disabled>{leadForm.preferencePlaceholder}</option>
              {priceOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <label htmlFor="lf-pref" className={styles.labelStatic}>Your preference</label>
            {errors.preference && <p id="lf-pref-err" className={styles.error} role="alert">{errors.preference}</p>}
          </div>

          <label className={styles.consent}>
            <input type="checkbox" name="consent" required aria-invalid={!!errors.consent} />
            <span>{legal.formConsent}</span>
          </label>
          {errors.consent && <p className={styles.error} role="alert">{errors.consent}</p>}

          <button type="submit" className={styles.submit} disabled={state === 'sending'}>
            {state === 'sending' ? leadForm.submittingLabel : leadForm.submitLabel}
          </button>

          <p className={styles.status} role="status" aria-live="polite">
            {state === 'sent' ? leadForm.successMessage : errors.form ?? ''}
          </p>
        </form>
      </div>
    </section>
  );
}
