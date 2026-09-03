/**
 * Worst-case contrast for the amenity names over the cube's photography.
 *
 * The names sit on arbitrary photographs, so the palette says nothing about
 * whether they are readable — only the composited pixels do. Screenshotting and
 * decoding proved unreliable (the light text is itself the brightest thing in
 * its own box, and a hand-rolled PNG reader is a second source of error), so
 * this works from the source images instead, which is both exact and stable:
 *
 *   1. read the emitted 1400px file for every amenity,
 *   2. take the region the name grid covers once object-fit:cover has run,
 *   3. find the brightest pixel there — the worst case for light text,
 *   4. composite the scrim over it at the alpha used at that height,
 *   5. ratio that against the text colour.
 *
 * Run: node scripts/check-cube-scrim.mjs
 */
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const DIR = 'public/images/amenities';

/* Must track AmenityCube.module.css. The grid sits in the middle band, where
   the gradient holds a flat 0.80; the ends are darker and not the constraint. */
const SCRIM = { r: 20, g: 18, b: 15 };
const SCRIM_ALPHA_AT_NAMES = 0.80;

/* The names span roughly the middle 55% of the section vertically and the full
   width, so this is the fraction of the face they sit over. */
const BAND = { top: 0.3, bottom: 0.85 };

const TEXT = { '--c-n-200 (names)': '#ddd6cb', '--c-n-300 (descriptor)': '#b5ada2' };

const srgb = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const over = (bg, a) => bg.map((c, i) => c * (1 - a) + [SCRIM.r, SCRIM.g, SCRIM.b][i] * a);

const files = (await readdir(DIR)).filter((f) => f.endsWith('-1400.webp'));
const rows = [];

for (const file of files) {
  const img = sharp(path.join(DIR, file));
  const { width, height } = await img.metadata();

  /* object-fit: cover on a square face crops the long axis, so the band the
     names cover maps onto the SHORT axis of the source. */
  const side = Math.min(width, height);
  const top = Math.round((height - side) / 2 + side * BAND.top);
  const band = Math.round(side * (BAND.bottom - BAND.top));

  const { data, info } = await img
    .extract({ left: 0, top, width, height: Math.min(band, height - top) })
    .raw().toBuffer({ resolveWithObject: true });

  /* Brightest pixel, but at the 99.5th percentile rather than the absolute max:
     one specular highlight a few pixels wide is not what a line of text sits
     on, and letting it set the number would darken the scrim for nothing. */
  const lums = [];
  for (let i = 0; i < data.length; i += info.channels * 7)
    lums.push(lum(data[i], data[i + 1], data[i + 2]));
  lums.sort((a, b) => a - b);
  const bright = lums[Math.floor(lums.length * 0.995)];

  // Recover an sRGB grey of that luminance to composite the scrim over.
  const inv = (L) => 255 * (L <= 0.0031308 ? L * 12.92 : 1.055 * L ** (1 / 2.4) - 0.055);
  const g = inv(bright);
  const composited = over([g, g, g], SCRIM_ALPHA_AT_NAMES);
  const bgL = lum(...composited);

  for (const [name, h] of Object.entries(TEXT)) {
    rows.push({
      file, text: name,
      ratio: +ratio(lum(...hex(h)), bgL).toFixed(2),
    });
  }
}

rows.sort((a, b) => a.ratio - b.ratio);
const failing = rows.filter((r) => r.ratio < 4.5);

console.log(`scrim alpha behind the names: ${SCRIM_ALPHA_AT_NAMES}`);
console.log(`${rows.length} checks, worst ${rows[0].ratio}:1, below 4.5:1 — ${failing.length}`);
for (const r of rows.slice(0, 8)) console.log(`  ${r.ratio}:1  ${r.file}  ${r.text}`);

/* What alpha would the brightest image in the set actually need? Reported
   whether or not the check passes, so the value in the CSS is a measurement
   rather than a guess. */
const brightest = Math.max(...(await Promise.all(files.map(async (file) => {
  const img = sharp(path.join(DIR, file));
  const { width, height } = await img.metadata();
  const side = Math.min(width, height);
  const top = Math.round((height - side) / 2 + side * BAND.top);
  const { data, info } = await img
    .extract({ left: 0, top, width, height: Math.min(Math.round(side * (BAND.bottom - BAND.top)), height - top) })
    .raw().toBuffer({ resolveWithObject: true });
  const l = [];
  for (let i = 0; i < data.length; i += info.channels * 7) l.push(lum(data[i], data[i + 1], data[i + 2]));
  l.sort((a, b) => a - b);
  return l[Math.floor(l.length * 0.995)];
}))));

const inv = (L) => 255 * (L <= 0.0031308 ? L * 12.92 : 1.055 * L ** (1 / 2.4) - 0.055);
const worstText = Math.min(...Object.values(TEXT).map((h) => lum(...hex(h))));
let need = 0;
for (let a = 0.5; a <= 0.99; a += 0.005) {
  const g = inv(brightest);
  if (ratio(worstText, lum(...over([g, g, g], a))) >= 4.5) { need = +a.toFixed(3); break; }
}
console.log(`brightest source pixel L=${brightest.toFixed(3)} → needs alpha ${need || '>0.99'} for 4.5:1`);

process.exit(failing.length ? 1 : 0);
