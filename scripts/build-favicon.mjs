/**
 * The browser-tab icons, cut from the Marvella lockup.
 *
 * The tab is SQUARE, so the horizontal lockup cannot go in it — the wordmark
 * would be illegible at 16px and the monogram would be a sliver. The monogram
 * is already a square tile at the left of the lockup, so it is extracted at
 * its own edges rather than resized into a square canvas.
 *
 * The near-black tile stays. It is what gives the gold rule contrast on a pale
 * tab strip; on dark chrome the gold still carries it. A transparent version
 * would vanish into one or the other.
 *
 * Emits, all picked up by Next's App Router conventions with no <link> tags:
 *   app/icon.png        — modern browsers
 *   app/apple-icon.png  — iOS home screen
 *   app/favicon.ico     — legacy, replacing the create-next-app default
 *
 * Run: node scripts/build-favicon.mjs
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'public', 'logos', 'marvella-flat-600.webp');
const APP = path.join(ROOT, 'app');

const meta = await sharp(SRC).metadata();
/* The tile is as wide as the lockup is tall. */
const side = meta.height;
const mono = sharp(SRC).extract({ left: 0, top: 0, width: side, height: side });

const png = async (size) => mono.clone().resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();

await writeFile(path.join(APP, 'icon.png'), await png(256));
await writeFile(path.join(APP, 'apple-icon.png'), await png(180));

/**
 * A .ico carrying PNGs — which the format allows, and which every browser that
 * still asks for .ico supports. sharp cannot write ICO, and the container is
 * only a 6-byte header, one 16-byte entry per image, then the image data.
 */
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(png));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);            // reserved
header.writeUInt16LE(1, 2);            // 1 = icon
header.writeUInt16LE(sizes.length, 4);

let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s === 256 ? 0 : s, 0);  // 0 means 256 in this format
  e.writeUInt8(s === 256 ? 0 : s, 1);
  e.writeUInt8(0, 2);                  // palette count
  e.writeUInt8(0, 3);                  // reserved
  e.writeUInt16LE(1, 4);               // colour planes
  e.writeUInt16LE(32, 6);              // bits per pixel
  e.writeUInt32LE(images[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return e;
});

await writeFile(path.join(APP, 'favicon.ico'), Buffer.concat([header, ...entries, ...images]));

console.log(`monogram ${side}x${side} from ${meta.width}x${meta.height}`);
console.log('app/icon.png 256  ·  app/apple-icon.png 180  ·  app/favicon.ico', sizes.join('/'));
