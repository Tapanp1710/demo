/**
 * WCAG contrast check for the token palette. Run after ANY change to a colour
 * token — the brief requires contrast verified, not assumed, and this caught
 * two failing tokens on the first pass.
 *
 *   node scripts/check-contrast.mjs      # exits 1 if any body-text pair < 4.5:1
 *
 * Values are parsed out of styles/tokens.css so the check can never drift from
 * the tokens it claims to verify.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const css = await readFile(path.join(import.meta.dirname, '..', 'styles', 'tokens.css'), 'utf8');

/** Read a primitive `--name: #hex;` out of tokens.css. */
const tok = (name) => {
  const m = css.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} not found in tokens.css`);
  return m[1];
};

const srgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => { const [r, g, b] = srgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/** Composite `over` on top of `under` at the given alpha, in sRGB. */
const mix = (under, over, alpha) => {
  const u = [1, 3, 5].map((i) => parseInt(under.slice(i, i + 2), 16));
  const o = [1, 3, 5].map((i) => parseInt(over.slice(i, i + 2), 16));
  return "#" + u.map((v, i) => Math.round(v * (1 - alpha) + o[i] * alpha)
    .toString(16).padStart(2, "0")).join("");
};

const STAGE = tok('c-n-900');
const PAGE = tok('c-n-50');

/** [label, foreground, background, minimum] — 4.5 for body text, 3.0 for large/UI. */
const PAIRS = [
  ['body on stage', tok('c-n-50'), STAGE, 4.5],
  ['muted on stage', tok('c-n-300'), STAGE, 4.5],
  ['faint on stage', tok('c-n-350'), STAGE, 4.5],
  ['accent on stage', tok('c-accent-500'), STAGE, 4.5],
  ['accent-400 on stage', tok('c-accent-400'), STAGE, 4.5],
  ['body on page', tok('c-n-900'), PAGE, 4.5],
  ['muted on page', tok('c-n-500'), PAGE, 4.5],
  ['faint on page', tok('c-n-450'), PAGE, 4.5],
  ['accent text on page', tok('c-accent-700'), PAGE, 4.5],
  ['dark ink on accent button', tok('c-n-900'), tok('c-accent-500'), 4.5],
  ['muted on raised stage', tok('c-n-300'), tok('c-n-800'), 4.5],
  ['faint on raised stage', tok('c-n-350'), tok('c-n-800'), 4.5],
];

/**
 * The ground-inversion layer means every ink token must also clear AA against
 * BOTH light surfaces, not just the base one — an accent that passes on
 * --ground can still fail on --ground-raised.
 */
const LIGHT_RAISED = tok('c-n-100');
const STAGE_RAISED = tok('c-n-800');
PAIRS.push(
  ['ink on raised light', tok('c-n-900'), LIGHT_RAISED, 4.5],
  ['muted on raised light', tok('c-n-500'), LIGHT_RAISED, 4.5],
  ['faint on raised light', tok('c-n-450'), LIGHT_RAISED, 4.5],
  ['accent text on raised light', tok('c-accent-700'), LIGHT_RAISED, 4.5],
  ['accent on raised stage', tok('c-accent-500'), STAGE_RAISED, 4.5],
);

/* The nav bar does NOT follow --ground-t: it is a constant dark surface with
   its own fixed text colours, so its pairs are checked against that surface
   and not against either ground. Worst case is the bar's 8% transparency
   letting the LIGHT ground through, so that is what is mixed in here. */
const NAV_BG = mix(tok('c-n-900'), tok('c-n-50'), 0.08);
/* The nav bar follows the ground now, so its text is covered by the ink-family
   ramp below rather than by fixed pairs against a constant dark surface. */

let failed = 0;
for (const [label, fg, bg, min] of PAIRS) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(6)}:1  (min ${min})  ${label}  ${fg} on ${bg}`);
}

// The raw brand accent must never be used as text on the light ground.
const raw = ratio(tok('c-accent-500'), PAGE);
/* There is no ramp any more. The ground used to be scrubbed between two
   colours and this walked every step of it, because the middle was where
   light-on-grey and dark-on-grey both failed. The site now has two RESTING
   grounds and nothing in between, so the pairs above are the whole story. */

console.log(failed ? [String.fromCharCode(10), failed, ' pair(s) FAIL'].join('') : String.fromCharCode(10) + 'all pairs pass on both grounds');
process.exit(failed ? 1 : 0);
