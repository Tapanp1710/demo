/**
 * The four hero slides through the same pipeline every other image on the site
 * uses: sharp, AVIF + WebP, fixed widths, and a manifest the component imports
 * so no width is ever hardcoded at a call site.
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = 'C:/Users/ADMIN/OneDrive/Desktop/BricksMarvella';
const OUT = path.join(ROOT, 'public', 'images', 'hero');
const WIDTHS = [900, 1400, 1920];

/* Source file -> slug, and the alt text each one needs. */
const SLIDES = [
  ['Camera007.jpg', 'towers-dusk', 'The Bricks Marvella towers at dusk, Tellapur'],
  ['Camera009.jpg', 'towers-lake', 'The towers seen across the lake at Tellapur'],
  ['Camera016.jpg', 'grounds', 'Landscaped grounds and open areas at Bricks Marvella'],
  ['Lobby 2.jpg', 'lobby', 'The double-height entrance lobby at Bricks Marvella'],
];

await mkdir(OUT, { recursive: true });
const manifest = [];

for (const [file, slug, alt] of SLIDES) {
  const src = path.join(ROOT, file);
  const meta = await sharp(src).metadata();
  const widths = WIDTHS.filter((w) => w <= meta.width);
  if (!widths.length) widths.push(meta.width);

  for (const w of widths) {
    const resized = sharp(src).resize({ width: w, withoutEnlargement: true });
    await resized.clone().avif({ quality: 50, effort: 5 }).toFile(path.join(OUT, `${slug}-${w}.avif`));
    await resized.clone().webp({ quality: 76 }).toFile(path.join(OUT, `${slug}-${w}.webp`));
  }
  manifest.push({ slug, alt, w: meta.width, h: meta.height, widths });
  console.log(slug.padEnd(14), meta.width + 'x' + meta.height, '->', widths.join(', '));
}

await writeFile(path.join(ROOT, 'lib', 'hero-slides.json'), JSON.stringify(manifest, null, 1));

let bytes = 0;
for (const m of manifest) {
  for (const w of m.widths) {
    for (const ext of ['avif', 'webp']) {
      bytes += (await stat(path.join(OUT, `${m.slug}-${w}.${ext}`))).size;
    }
  }
}
console.log('\ntotal emitted', (bytes / 1048576).toFixed(2), 'MB across', manifest.length, 'slides');
