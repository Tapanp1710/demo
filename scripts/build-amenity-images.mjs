/**
 * Record what the image pipeline ACTUALLY emitted for each amenity.
 *
 * The pipeline only writes a width if the source is at least that wide, so four
 * amenities have no 1400px file. A component that hardcodes `-1400` therefore
 * 404s on those four and renders a broken-image icon — which is exactly what
 * happened. Reading the directory instead of assuming a fixed ladder makes that
 * class of bug impossible.
 *
 * Emits lib/amenity-images.json: { slug: { w, h, widths: [...] } }, where w/h
 * are the real intrinsic dimensions of the largest emitted file.
 *
 * Run: node scripts/build-amenity-images.mjs
 */
import sharp from 'sharp';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DIR = 'public/images/amenities';
const OUT = 'lib/amenity-images.json';

const files = await readdir(DIR);
const bySlug = new Map();

for (const f of files) {
  const m = f.match(/^(.+)-(\d+)\.webp$/);
  if (!m) continue;
  const [, slug, width] = m;
  if (!bySlug.has(slug)) bySlug.set(slug, new Set());
  bySlug.get(slug).add(Number(width));
}

const out = {};
for (const [slug, set] of [...bySlug].sort(([a], [b]) => a.localeCompare(b))) {
  const widths = [...set].sort((a, b) => a - b);
  const largest = widths[widths.length - 1];
  const { width, height } = await sharp(path.join(DIR, `${slug}-${largest}.webp`)).metadata();
  out[slug] = { w: width, h: height, widths };
}

await writeFile(OUT, JSON.stringify(out, null, 2) + '\n');

const short = Object.entries(out).filter(([, v]) => !v.widths.includes(1400));
console.log(`${Object.keys(out).length} amenities → ${OUT}`);
console.log(`${short.length} without a 1400px variant: ${short.map(([s]) => s).join(', ') || 'none'}`);
