/**
 * The hero slideshow, the gallery strip, and the hero's marketing plate.
 *
 * These used to share ONE manifest — the gallery deliberately re-showed the
 * hero's photographs. They are separate now because the two sections were given
 * different pictures: the hero carries the five new renders, the gallery keeps
 * the four originals it always had. Sharing a manifest is what made replacing
 * the hero silently replace the gallery too.
 *
 * Everything goes through the same pipeline as the rest of the site: sharp,
 * AVIF + WebP, fixed widths, and a manifest the component imports so no width
 * is ever hardcoded at a call site.
 *
 * Run: node scripts/build-hero-slides.mjs
 */
import { mkdir, writeFile, stat, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');

/* The new renders as delivered. 1600x900, which is the ceiling on the hero. */
const WA = path.join(ROOT, 'WhatsApp Unknown 2026-09-07 at 16.20.01');

/**
 * Hero slugs are all new rather than reusing the gallery's. Everything under
 * /images/ is served `immutable` for a year (next.config.ts), so pointing an
 * existing filename at a different photograph would leave returning visitors on
 * the old one with no way to invalidate it.
 *
 * Hero order alternates dark and bright so consecutive slides never look like
 * the same frame, and leads with the dusk shot: the wordmark sits over the hero
 * in near-white and gold and wants a dark plate under it on first paint.
 */
const GROUPS = [
  {
    name: 'hero',
    dir: 'hero',
    manifest: 'hero-slides.json',
    widths: [800, 1200, 1600],
    /* Raised for the hero: it is the LCP surface and the source is only
       1600 wide, so there is no resolution left to spend — only quality. */
    avif: 62, webp: 86,
    slides: [
      [path.join(WA, 'WhatsApp Image 2026-09-07 at 16.19.47 (2).jpeg'), 'marvella-dusk',
        'The two Bricks Marvella towers lit at dusk, Tellapur'],
      [path.join(WA, 'WhatsApp Image 2026-09-07 at 16.19.47 (1).jpeg'), 'marvella-street',
        'The Bricks Marvella towers seen from the road at Tellapur'],
      [path.join(WA, 'WhatsApp Image 2026-09-07 at 16.19.47.jpeg'), 'marvella-lake',
        'The Bricks Marvella towers reflected in the lake at Tellapur'],
      [path.join(WA, 'WhatsApp Image 2026-09-07 at 16.19.48.jpeg'), 'marvella-sunset',
        'The entrance to Bricks Marvella at sunset'],
      [path.join(WA, 'WhatsApp Image 2026-09-07 at 16.19.48 (1).jpeg'), 'marvella-facade',
        'Looking up the balconies of a Bricks Marvella tower'],
    ],
  },
  {
    name: 'gallery',
    dir: 'gallery',
    manifest: 'gallery-slides.json',
    widths: [900, 1400, 1920],
    /* The settings this section already shipped with. It was asked to stay the
       same, and at 1920 wide across four images the higher hero settings cost
       5.79 MB against 3.09 MB for a strip that is lazy-loaded anyway. */
    avif: 50, webp: 76,
    slides: [
      [path.join(ROOT, 'Camera007.jpg'), 'garden-walk',
        'A landscaped walkway and raised timber deck in the gardens at Bricks Marvella'],
      [path.join(ROOT, 'Camera009.jpg'), 'clubhouse',
        'The Club Marvella clubhouse building at Bricks Marvella'],
      [path.join(ROOT, 'Camera016.jpg'), 'pool',
        'The swimming pool, loungers and shades beside a tower at Bricks Marvella'],
      [path.join(ROOT, 'Lobby 2.jpg'), 'lobby',
        'The double-height clubhouse lobby and reception at Bricks Marvella'],
    ],
  },
];

let grand = 0;

for (const group of GROUPS) {
  const OUT = path.join(ROOT, 'public', 'images', group.dir);
  await mkdir(OUT, { recursive: true });

  /* Clear only this group's directory — the previous set is unreferenced once
     its manifest is rewritten, and these files are large. */
  for (const f of await readdir(OUT)) await unlink(path.join(OUT, f));

  const manifest = [];
  for (const [src, slug, alt] of group.slides) {
    const meta = await sharp(src).metadata();

    const widths = group.widths.filter((w) => w <= meta.width);
    /**
     * The native rung, when the ladder stops short.
     *
     * This filter alone dropped 1920 on a 1600-wide source, leaving 1400 as the
     * largest file — which a 1920 screen then upscaled by 37% while a perfectly
     * good 1600 sat unused. Emit the source's own width whenever the top rung
     * misses it by more than 5%.
     */
    const top = widths[widths.length - 1] ?? 0;
    if (top < meta.width * 0.95) widths.push(meta.width);

    for (const w of widths) {
      const resized = sharp(src).resize({ width: w, withoutEnlargement: true });
      /* Sharpen only where the image was actually downscaled. At the native
         rung there is no resample to recover from, so it adds ringing only. */
      const base = w < meta.width ? resized.sharpen({ sigma: 0.6 }) : resized;
      await base.clone().avif({ quality: group.avif, effort: 6 }).toFile(path.join(OUT, `${slug}-${w}.avif`));
      await base.clone().webp({ quality: group.webp }).toFile(path.join(OUT, `${slug}-${w}.webp`));
    }

    manifest.push({ slug, alt, w: meta.width, h: meta.height, widths });
    console.log(group.name.padEnd(8), slug.padEnd(16), meta.width + 'x' + meta.height, '->', widths.join(', '));
  }

  await writeFile(path.join(ROOT, 'lib', group.manifest), JSON.stringify(manifest, null, 1));

  let bytes = 0;
  for (const m of manifest) {
    for (const w of m.widths) {
      for (const ext of ['avif', 'webp']) bytes += (await stat(path.join(OUT, `${m.slug}-${w}.${ext}`))).size;
    }
  }
  grand += bytes;
  console.log(`  ${group.name}: ${(bytes / 1048576).toFixed(2)} MB across ${manifest.length} images\n`);
}

/**
 * The marketing plate over the left of the hero.
 *
 * TRIMMED to its own ink first. The supplied file is padded with transparency —
 * the current one is 1145x2056 with the artwork ending at row 1376, so a third
 * of it is empty. Shipped untrimmed, the plate's box is half again as tall as
 * anything you can see, which makes the artwork look small and sit high inside
 * its own frame. The bounds are MEASURED off the alpha channel rather than
 * hardcoded, because this file has already been re-exported at a completely
 * different size once — it was 1080x1080 square — and will be again.
 *
 * Alpha survives into both derivatives: the plate is composited over a
 * photograph, and flattening it onto any one colour would put a plate-coloured
 * rectangle over whichever slide happens to be showing.
 *
 * No sharpening at either rung — it is type and flat shapes, and sharpening a
 * hard edge is how you get a halo around every letter.
 */
{
  const OUT = path.join(ROOT, 'public', 'images', 'hero');
  const src = path.join(ROOT, 'marwella text.jpg.png');
  const meta = await sharp(src).metadata();

  /* The alpha bounding box: the smallest rect holding every non-clear pixel. */
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const box = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  const trimmed = await sharp(src).extract(box).png().toBuffer();

  /* Half and native. The component sizes the plate by HEIGHT, so the widths
     here are only about pixel density, not layout. */
  const widths = [Math.round(box.width / 2), box.width];
  let bytes = 0;
  for (const w of widths) {
    const r = sharp(trimmed).resize({ width: w, withoutEnlargement: true });
    await r.clone().avif({ quality: 68, effort: 6 }).toFile(path.join(OUT, `hero-plate-${w}.avif`));
    await r.clone().webp({ quality: 90 }).toFile(path.join(OUT, `hero-plate-${w}.webp`));
    for (const ext of ['avif', 'webp']) bytes += (await stat(path.join(OUT, `hero-plate-${w}.${ext}`))).size;
  }
  grand += bytes;

  /* A manifest, so the component never hardcodes a width or a ratio that the
     next re-export would silently invalidate. */
  await writeFile(path.join(ROOT, 'lib', 'hero-plate.json'),
    JSON.stringify({ src: '/images/hero/hero-plate', w: box.width, h: box.height, widths }, null, 1));

  console.log('plate   hero-plate      ' + meta.width + 'x' + meta.height
    + '  trimmed to ' + box.width + 'x' + box.height
    + '  -> ' + widths.join(', ') + '  ' + (bytes / 1024).toFixed(0) + ' KB');
}

console.log('\ntotal emitted', (grand / 1048576).toFixed(2), 'MB');
