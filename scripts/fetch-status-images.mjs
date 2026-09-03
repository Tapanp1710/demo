/**
 * Fetches the /project-status/ construction photos (~128 across 20 dates) and
 * emits AVIF+WebP at two widths. Same proxy route and no-upscale rule as
 * scripts/fetch-assets.mjs — see that file's header for the wsrv gotchas.
 * Writes lib/status-manifest.json for the timeline page to import.
 */
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, '.asset-cache', 'status');
const PUB = path.join(ROOT, 'public', 'status');
await mkdir(RAW, { recursive: true });
await mkdir(PUB, { recursive: true });

const sections = JSON.parse(await readFile(path.join(ROOT, '.content-cache', 'project-status.json'), 'utf8'));

const fetchPng = async (url) => {
  const proxied = `https://wsrv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}&output=png&n=-1`;
  for (let a = 1; a <= 3; a++) {
    try {
      const r = await fetch(proxied, { signal: AbortSignal.timeout(120000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const b = Buffer.from(await r.arrayBuffer());
      if (b.length < 1024) throw new Error('too small');
      return b;
    } catch (e) { if (a === 3) throw e; await new Promise(res => setTimeout(res, a * 4000)); }
  }
};

const grade = (img) => img
  .modulate({ saturation: 0.88, brightness: 1.02 })
  .linear([1.07, 1.055, 1.03], [-7, -7, -5]);

const manifest = [];
let n = 0, failed = 0;

for (const sec of sections) {
  const slug = sec.date.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const entry = { date: sec.date, slug, images: [] };
  for (let i = 0; i < sec.images.length; i++) {
    const src = sec.images[i];
    const name = `${slug}-${String(i + 1).padStart(2, '0')}`;
    const cache = path.join(RAW, name + '.png');
    let png;
    try {
      if (existsSync(cache)) png = await readFile(cache);
      else { png = await fetchPng(src); await writeFile(cache, png); }
    } catch (e) { failed++; console.error('FAIL', name, e.message); continue; }

    const meta = await sharp(png).metadata();
    const widths = [1200, 700].filter(w => w <= meta.width);
    if (!widths.length) widths.push(meta.width);
    for (const w of widths) {
      for (const fmt of ['avif', 'webp']) {
        const file = path.join(PUB, `${name}-${w}.${fmt}`);
        if (!existsSync(file)) {
          await sharp(await grade(sharp(png).resize({ width: w, withoutEnlargement: true })).toBuffer())
          [fmt](fmt === 'avif' ? { quality: 52, effort: 5 } : { quality: 78 })
            .toFile(file);
        }
      }
    }
    entry.images.push({ stem: `/status/${name}`, widths, w: meta.width, h: meta.height });
    n++;
    if (n % 12 === 0) process.stdout.write(`${n} `);
  }
  manifest.push(entry);
}

await writeFile(path.join(ROOT, 'lib', 'status-manifest.json'), JSON.stringify(manifest, null, 1));
const bytes = (await Promise.all(
  manifest.flatMap(m => m.images.flatMap(i => i.widths.flatMap(w => ['avif', 'webp'].map(f => path.join(PUB, path.basename(i.stem) + `-${w}.${f}`)))))
    .map(async f => (await stat(f).catch(() => ({ size: 0 }))).size)
)).reduce((a, b) => a + b, 0);
console.log(`\n${n} images across ${manifest.length} dates, ${failed} failed, ${(bytes / 1048576).toFixed(2)} MB emitted`);
