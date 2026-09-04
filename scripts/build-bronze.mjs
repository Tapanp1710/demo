/**
 * Renders the amenities section's marble ONCE, at build time, into
 * public/textures/. Nothing procedural ships to the browser: the page loads a
 * single image, not an SVG filter it has to rasterise on every paint.
 *
 * The veining is feTurbulence, not a photograph — a stock marble would be
 * another licence to track and would not match the palette. This is generated
 * from the same charcoal and brass the tokens use, so it sits under the
 * amenity photographs instead of competing with them.
 *
 * The vein opacities are bounded by CONTRAST, not by taste. The brass eyebrow
 * sits on this stone, and brass needs its background below L=0.0252 to clear
 * 4.5:1 — so the BRIGHTEST pixel of the texture has to stay under that. At the
 * first pass the gold veins reached L=0.078 and took the eyebrow to 2.80:1.
 *
 *   node scripts/build-marble.mjs
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const CDP = require(path.join(
  'C:', 'Users', 'ADMIN', 'AppData', 'Local', 'Temp', 'claude',
  'c--Users-ADMIN-OneDrive-Desktop-BricksMarvella',
  '0824b223-211d-4f65-b496-1b753bfbe87a', 'scratchpad', 'ffp',
  'node_modules', 'chrome-remote-interface',
));

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'textures');
const W = 1600, H = 1000;

/* LIQUID BRONZE, not marble.
   Ribbons of gold on a brown-black ground, then bent into swirls by a
   displacement map — the same technique the reference image is made with. The
   pieces:

     bands    smooth diagonal gradient stripes, gold on nothing
     swirl    low-frequency fractal noise driving feDisplacementMap, which is
              what turns straight bands into flowing ones
     dust     high-frequency noise, thresholded hard, for the glitter
     bloom    a wide blur of the bands, added back for the molten glow  */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!-- RIBBONS. Ridged turbulence — the noise folded about its midpoint, with
         a steep slope and a negative offset in the alpha row — turns broad
         blobs into thin bright bands. Displacing those bands with a SECOND,
         lower-frequency noise is what makes them flow instead of ripple. -->
    <filter id="ribbons" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
      <feTurbulence type="turbulence" baseFrequency="0.0013 0.0040" numOctaves="4" seed="11" result="t"/>
      <feColorMatrix in="t" type="matrix" result="r"
        values="0 0 0 0 0.855  0 0 0 0 0.686  0 0 0 0 0.365  3.6 -1.7 0 0 -0.94"/>
      <feGaussianBlur in="r" stdDeviation="1.5" result="b"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.0019 0.0013" numOctaves="3" seed="3" result="n2"/>
      <feDisplacementMap in="b" in2="n2" scale="150"
        xChannelSelector="R" yChannelSelector="G"/>
    </filter>

    <!-- The same ribbons at a coarser scale, heavily blurred: the molten spill
         of light around the bright edges. -->
    <filter id="bloom" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
      <feTurbulence type="turbulence" baseFrequency="0.0011 0.0031" numOctaves="3" seed="11" result="t"/>
      <feColorMatrix in="t" type="matrix" result="r"
        values="0 0 0 0 0.741  0 0 0 0 0.573  0 0 0 0 0.290  2.2 -1.1 0 0 -0.74"/>
      <feGaussianBlur in="r" stdDeviation="34"/>
    </filter>

    <!-- Gold dust: one octave at a high frequency, thresholded hard so only
         the very top of the noise survives as specks. -->
    <filter id="dust" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="1" seed="23" result="t"/>
      <feColorMatrix in="t" type="matrix"
        values="0 0 0 0 0.878  0 0 0 0 0.729  0 0 0 0 0.400  0 26 0 0 -22.4"/>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="#201a14"/>
  <g transform="rotate(-14 ${W / 2} ${H / 2}) scale(1.25)" transform-origin="center">
    <rect x="-${W}" y="-${H}" width="${W * 3}" height="${H * 3}" filter="url(#bloom)"   opacity="0.42"/>
    <rect x="-${W}" y="-${H}" width="${W * 3}" height="${H * 3}" filter="url(#ribbons)" opacity="0.85"/>
  </g>
  <rect width="100%" height="100%" filter="url(#dust)" opacity="0.6"/>
</svg>`;

await mkdir(OUT, { recursive: true });
const tmp = path.join(OUT, '_bronze.svg');
await writeFile(tmp, SVG);

const PORT = 12900 + Math.floor(Math.random() * 60);
const profile = path.join(OUT, '_chrome-' + Date.now());
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, 'about:blank'],
  { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let client;
for (let i = 0; i < 40; i++) { await sleep(400); try { client = await CDP({ port: PORT }); break; } catch { /* still booting */ } }
const { Page, Emulation } = client;
await Page.enable();
await Emulation.setDeviceMetricsOverride({ width: W, height: H, deviceScaleFactor: 1, mobile: false });
await Page.navigate({ url: pathToFileURL(tmp).href });
await sleep(2500);
const shot = await Page.captureScreenshot({ format: 'png' });
await client.close(); chrome.kill(); await sleep(500);

const png = Buffer.from(shot.data, 'base64');
await sharp(png).avif({ quality: 52, effort: 6 }).toFile(path.join(OUT, 'bronze-1600.avif'));
await sharp(png).webp({ quality: 72 }).toFile(path.join(OUT, 'bronze-1600.webp'));
await unlink(tmp);
try { await import('node:fs/promises').then((m) => m.rm(profile, { recursive: true, force: true })); } catch { /* profile already gone */ }

for (const f of ['bronze-1600.avif', 'bronze-1600.webp']) {
  console.log(f, ((await stat(path.join(OUT, f))).size / 1024).toFixed(1) + ' KB');
}
