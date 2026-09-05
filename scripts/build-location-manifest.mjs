/**
 * lib/location-images.json, from what is actually on disk.
 *
 * LocationArc used to hardcode `-900`, and recreation only ever got a 560 —
 * so that panel requested a file that does not exist and rendered as a broken
 * image. A manifest cannot drift from the filesystem the way a hardcoded width
 * can.
 */
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'public', 'images', 'location');

const files = await readdir(DIR);
const widths = {};
for (const f of files) {
  const m = f.match(/^(.+)-(\d+)\.webp$/);
  if (!m) continue;
  (widths[m[1]] ??= new Set()).add(Number(m[2]));
}

const manifest = Object.fromEntries(
  Object.entries(widths).map(([slug, set]) => [slug, [...set].sort((a, b) => a - b)]),
);
await writeFile(path.join(ROOT, 'lib', 'location-images.json'), JSON.stringify(manifest, null, 1));
for (const [k, v] of Object.entries(manifest)) console.log(k.padEnd(14), v.join(', '));
