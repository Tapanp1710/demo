import type { Metadata } from 'next';
import { legal, priceOptions, stats } from '@/lib/content';
import styles from './styleguide.module.css';

export const metadata: Metadata = {
  title: 'Design system — Bricks Marvella',
  robots: { index: false, follow: false },
};

const NEUTRALS = ['900', '800', '700', '600', '500', '400', '300', '200', '100', '50'];
const ACCENTS = [
  { token: '--c-accent-400', note: 'hover / lift' },
  { token: '--c-accent-500', note: 'THE accent' },
  { token: '--c-accent-600', note: "site's second gold" },
  { token: '--c-accent-700', note: 'accent text on light' },
];
const SPACE = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const TYPE = [
  { token: '--t-display-1', label: 'Display 1', sample: 'Marvella', font: 'display' },
  { token: '--t-display-2', label: 'Display 2', sample: 'A life above', font: 'display' },
  { token: '--t-display-3', label: 'Display 3 · section heads', sample: 'The Amenities', font: 'display' },
  { token: '--t-heading', label: 'Heading', sample: 'Tower A — units 4, 5 and 6', font: 'display' },
  { token: '--t-subhead', label: 'Subhead', sample: 'Lakeside living in Tellapur', font: 'text' },
  { token: '--t-body', label: 'Body', sample: 'Two towers rising thirty-two floors over four and a half acres.', font: 'text' },
  { token: '--t-small', label: 'Small', sample: 'Starting from ₹1.55 Cr', font: 'text' },
  { token: '--t-caption', label: 'Caption', sample: legal.imageDisclaimer, font: 'text' },
];

export default function StyleguidePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Design system · sign-off</p>
        <h1 className={styles.title}>Bricks Marvella</h1>
        <p className={styles.lede}>
          Every colour, size, and duration on the site resolves to a token in{' '}
          <code>styles/tokens.css</code>. This page renders them all. The brief in one line:
          the product is priced at ₹1.5–2.9 crore and the interface has to match.
        </p>
      </header>

      {/* ---------------- COLOUR ---------------- */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Colour</h2>
        <p className={styles.note}>
          One accent, used only for primary CTAs, scroll progress, active states, the drum arc,
          stat emphasis and hairline rules. The neutral ramp is warm-biased toward the accent —
          a pure grey next to a warm gold reads as unconsidered.
        </p>

        <h3 className={styles.h3}>Accent</h3>
        <div className={styles.swatchRow}>
          {ACCENTS.map(a => (
            <div key={a.token} className={styles.swatch}>
              <div className={styles.chip} style={{ background: `var(${a.token})` }} />
              <code className={styles.mono}>{a.token}</code>
              <span className={styles.swatchNote}>{a.note}</span>
            </div>
          ))}
        </div>

        <h3 className={styles.h3}>Warm neutral ramp</h3>
        <div className={styles.rampRow}>
          {NEUTRALS.map(n => (
            <div key={n} className={styles.rampCell}>
              <div className={styles.rampChip} style={{ background: `var(--c-n-${n})` }} />
              <code className={styles.monoSmall}>{n}</code>
            </div>
          ))}
        </div>

        <h3 className={styles.h3}>The two grounds</h3>
        <div className={styles.groundGrid}>
          <div className={styles.groundStage}>
            <p className={styles.groundLabel}>Stage — 3D and immersive sections</p>
            <p className={styles.groundBody}>
              Depth cues vanish on light backgrounds, so every 3D stage sits on the deep base.
            </p>
            <p className={styles.groundMuted}>Muted text on stage</p>
            <span className={styles.accentText}>Accent on stage</span>
          </div>
          <div className={styles.groundPage}>
            <p className={styles.groundLabelDark}>Page — reading sections</p>
            <p className={styles.groundBodyDark}>
              Warm off-white rather than pure white, which reads cheap at this price point.
            </p>
            <p className={styles.groundMutedDark}>Muted text on page</p>
            <span className={styles.accentTextOnLight}>Accent text on light (--accent-on-light)</span>
          </div>
        </div>
        <h3 className={styles.h3}>Measured contrast</h3>
        <p className={styles.note}>
          Computed, not eyeballed — run <code>node scripts/check-contrast.mjs</code> to re-verify
          after any token change. Two values were corrected because measuring failed them: the faint
          ink on the light ground (was 3.39:1) and the accent-as-text step (was 3.86:1).
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Pair</th><th className={styles.num}>Ratio</th><th>Verdict</th></tr>
            </thead>
            <tbody>
              {[
                ['Body on stage', '16.75', 'AA'],
                ['Muted on stage', '8.43', 'AA'],
                ['Faint on stage', '4.94', 'AA'],
                ['Accent on stage', '7.43', 'AA'],
                ['Body on page', '16.75', 'AA'],
                ['Muted on page', '6.49', 'AA'],
                ['Faint on page (--c-n-450)', '4.99', 'AA'],
                ['Accent text on page (--c-accent-700)', '4.86', 'AA'],
                ['Dark ink on accent button', '7.43', 'AA'],
                ['Raw #d7955d as text on page', '2.25', 'never use — background only'],
              ].map(([pair, ratio, verdict]) => (
                <tr key={pair}>
                  <td>{pair}</td>
                  <td className={`${styles.num} tabular`}>{ratio}:1</td>
                  <td className={verdict === 'AA' ? styles.pass : styles.fail}>{verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- TYPE ---------------- */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Typography</h2>
        <p className={styles.note}>
          Cormorant Garamond (high-contrast serif display) with Inter (neutral grotesque) for text.
          Both SIL Open Font License 1.1, self-hosted and subset to Latin by <code>next/font</code>.
          This replaces Roboto Condensed, which carried every heading on the old site and was the
          single biggest reason it read mid-market.
        </p>
        <div className={styles.typeList}>
          {TYPE.map(t => (
            <div key={t.token} className={styles.typeRow}>
              <div className={styles.typeMeta}>
                <code className={styles.mono}>{t.token}</code>
                <span className={styles.swatchNote}>{t.label}</span>
              </div>
              <p
                className={t.font === 'display' ? styles.typeSampleDisplay : styles.typeSampleText}
                style={{ fontSize: `var(${t.token})` }}
              >
                {t.sample}
              </p>
            </div>
          ))}
        </div>
        <h3 className={styles.h3}>Numerals</h3>
        <p className={styles.note}>Tabular figures everywhere digits align — stats, prices, plan specs.</p>
        <div className={styles.statRow}>
          {stats.map(s => (
            <div key={s.label} className={styles.stat}>
              <span className={`${styles.statValue} tabular`}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- SPACE ---------------- */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Space &amp; structure</h2>
        <p className={styles.note}>
          One 4px-based scale. Luxury is whitespace: <code>--section-y</code> is markedly larger than
          the old site&rsquo;s section padding. Near-zero radius; separation by space and tone, with
          1px hairlines as structure rather than shadows.
        </p>
        <div className={styles.spaceList}>
          {SPACE.map(s => (
            <div key={s} className={styles.spaceRow}>
              <code className={styles.monoSmall}>--s-{s}</code>
              <div className={styles.spaceBar} style={{ width: `var(--s-${s})` }} />
            </div>
          ))}
        </div>
        <h3 className={styles.h3}>Hairlines</h3>
        <div className={styles.ruleDemo}>
          <div className={styles.ruleOnStage} />
          <span className={styles.swatchNote}>--rule-on-stage</span>
          <div className={styles.ruleAccent} />
          <span className={styles.swatchNote}>--rule-accent</span>
        </div>
      </section>

      {/* ---------------- COMPONENTS ---------------- */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Component states</h2>
        <div className={styles.btnRow}>
          <button type="button" className={styles.btnPrimary}>Request Price</button>
          <button type="button" className={styles.btnGhost}>Call Now</button>
          <button type="button" className={styles.btnPrimary} disabled>Submitting…</button>
        </div>
        <p className={styles.note}>
          Tab to each control to check the focus ring. Sticky CTAs get a 3px hover lift and nothing
          more — they convert, so no motion may delay a tap.
        </p>

        <h3 className={styles.h3}>Form fields</h3>
        <div className={styles.formDemo}>
          <div className={styles.field}>
            <input id="sg-name" className={styles.input} placeholder=" " />
            <label htmlFor="sg-name" className={styles.label}>Name</label>
          </div>
          <div className={styles.field}>
            <input id="sg-phone" className={styles.input} placeholder=" " inputMode="tel" />
            <label htmlFor="sg-phone" className={styles.label}>Phone</label>
          </div>
          <div className={styles.field}>
            <select id="sg-pref" className={styles.input} defaultValue="">
              <option value="" disabled>Please select your preference*</option>
              {priceOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <label htmlFor="sg-pref" className={styles.labelStatic}>Preference</label>
          </div>
          <div className={styles.fieldError}>
            <div className={styles.field}>
              <input id="sg-err" className={`${styles.input} ${styles.inputError}`} placeholder=" " defaultValue="not-an-email" />
              <label htmlFor="sg-err" className={styles.label}>Email</label>
            </div>
            <p className={styles.errorText} role="status">Please enter a valid email address</p>
          </div>
        </div>
        <p className={styles.consent}>{legal.formConsent}</p>
      </section>

      {/* ---------------- MOTION ---------------- */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Motion primitives</h2>
        <p className={styles.note}>
          One UI ease, one entrance ease, linear for scrubs. Hover the swatches to run each curve.
          Everything scroll-linked uses <code>scrub</code>; all responsive motion goes through{' '}
          <code>gsap.matchMedia()</code> and all contexts through <code>gsap.context()</code> with cleanup.
        </p>
        <div className={styles.motionGrid}>
          <div className={styles.motionCard}>
            <code className={styles.mono}>--ease-ui · 200ms</code>
            <span className={styles.swatchNote}>micro-interactions</span>
            <div className={styles.motionTrackUi}><span className={styles.motionDot} /></div>
          </div>
          <div className={styles.motionCard}>
            <code className={styles.mono}>--ease-entrance · 400ms</code>
            <span className={styles.swatchNote}>element entrances</span>
            <div className={styles.motionTrackEntrance}><span className={styles.motionDot} /></div>
          </div>
          <div className={styles.motionCard}>
            <code className={styles.mono}>--dur-emphasis · 700ms</code>
            <span className={styles.swatchNote}>emphasis moves</span>
            <div className={styles.motionTrackEmphasis}><span className={styles.motionDot} /></div>
          </div>
        </div>
        <h3 className={styles.h3}>3D depth</h3>
        <p className={styles.note}>
          Perspective steps down at narrower widths (1200 → 900 → 700px) so the effect does not
          over-read on small screens.
        </p>
        <div className={styles.perspStage}>
          <div className={styles.perspCard}>rotateY(−25°)</div>
          <div className={styles.perspCardFlat}>translateZ(0)</div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p className={styles.monoSmall}>
          {legal.reraLabel}: {legal.rera} · {legal.buildingPermissionLabel}: {legal.buildingPermission}
        </p>
        <p className={styles.caption}>{legal.imageDisclaimer}</p>
      </footer>
    </main>
  );
}
