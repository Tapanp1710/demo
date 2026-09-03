/**
 * Asset acquisition for the Next.js rebuild.
 *
 * Why a proxy: this workstation's IP is firewalled by the origin host (see
 * phase-1.5/MEASUREMENTS.md). wsrv.nl is used as a fetch route. It always
 * re-encodes, so every image is requested as LOSSLESS PNG — a decode of the
 * original, no added generation loss — and the AVIF/WebP encoding is then done
 * locally by sharp. Byte-passthrough proxies (allorigins, codetabs) return 522.
 *
 * wsrv gotcha, measured the hard way: it silently caps output at 1600px unless
 * an explicit `w` is passed, and an explicit `w` ABOVE native silently UPSCALES
 * (its `we` "without enlargement" flag clamps to the 1600 cap, so it cannot be
 * used to discover native size either). Hence the rule enforced below: set
 * `native` ONLY for sources known to be wider than 1600 — that is the plans,
 * whose dimensions the Phase 1 audit recorded. Everything else omits `w` and
 * takes min(native, 1600), which can never upscale.
 *   plans 2560x1564 · master 2048x1252 · drone 1600x1200 · amenities 1000-2000
 * Drone was verified native at 1600 by round-trip: requesting 2400 and
 * downscaling back gave identical sharpness (38.27 vs 38.08) — no real detail.
 * Amenities are emitted at <=1400 against natives of 1000-2000; drum panels
 * render far smaller, so raise the `widths` array if a full-bleed view appears.
 *
 *   node scripts/fetch-assets.mjs            # fetch + convert everything
 *   node scripts/fetch-assets.mjs --verify   # re-report on what is already local
 */
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, '.asset-cache');      // lossless PNG intermediates (gitignored)
const PUB = path.join(ROOT, 'public');
const ORIGIN = 'bricksmarvella.in';
const VERIFY_ONLY = process.argv.includes('--verify');

/** Full-size sources, from the Phase 1 audit (every URL verified 200). */
const DRONE = ['DJI_0210', 'DJI_0217', 'DJI_0272', 'DJI_0208'].map(n => ({
  src: `/wp-content/uploads/2026/01/${n}.webp`, out: `images/drone/${n.toLowerCase()}`, widths: [1600, 1000, 600],
}));

const AMENITIES = [
  ['amphitheatre', '/2023/12/Amphitheatre.jpg'],
  ['banquet-hall', '/2023/12/banquet-hall.webp'],
  ['childrens-play-area', '/2023/12/children-play-area.webp'],
  ['basket-ball-court', '/2023/12/Camera013.webp'],
  ['meditation-and-yoga-center', '/2023/12/yoga.webp'],
  ['indoor-games', '/2023/12/indoor-games-01.webp'],
  ['gymnasium-and-spa', '/2023/12/yoga-01.webp'],
  ['cycling-and-jogging-track', '/2023/12/bricks-marvellas-amenities-cycling-and-jogging-track.jpg'],
  ['cricket-practice-pitch', '/2023/12/Bircks-Marvella-Amenities-Cricket-Pratice-pitch.png'],
  ['swimming-pool', '/2023/12/swimming-pool.webp'],
  ['skating-rink', '/2023/12/skating-rink.webp'],
  ['badminton-court', '/2023/12/badminton-court.webp'],
  ['tennis-court', '/2023/12/tennis-court-1.webp'],
  ['guest-rooms', '/2024/10/guest-bedroom-02.webp'],
  ['gym', '/2025/11/gym-1.webp'],
  ['movie-theater', '/2025/11/movie-theater.webp'],
  ['pool-table', '/2025/11/pool-table.webp'],
  ['squash-court', '/2025/11/squash-court.webp'],
  ['table-tennis', '/2025/11/table-tennis.webp'],
].map(([slug, p]) => ({ src: '/wp-content/uploads' + p, out: `images/amenities/${slug}`, widths: [1400, 900, 560] }));

const PLANS = [
  ['master-plan', '/2024/10/Bricks-Marvella-master-plan-2048x1252-1.jpg'],
  ['tower-a-1-2', '/2024/10/plan-a-1-2-scaled-1.jpg'],
  ['tower-a-4-5-6', '/2024/10/plan-4-5-6-scaled-1.jpg'],
  ['tower-a-6-7', '/2024/10/plan-6-7-scaled-1.jpg'],
  ['tower-a-8-9', '/2024/10/plan-a-8-9-scaled-1.jpg'],
  ['tower-b-1-2', '/2024/10/plan-b-1-2-scaled-1.jpg'],
  ['tower-b-3-4', '/2024/10/plan-b-3-4-scaled-1.jpg'],
  ['tower-b-5-6', '/2024/10/plan-b-5-6-scaled-1.jpg'],
  ['tower-b-7-8', '/2024/10/Plan-b-7-8-scaled-1.jpg'],
].map(([name, p]) => ({
  src: '/wp-content/uploads' + p,
  out: `plans/${name}`,
  // true native, from the Phase 1 audit — requesting more makes wsrv upscale
  native: name === 'master-plan' ? 2048 : 2560,
  widths: name === 'master-plan' ? [2048, 1400, 900] : [2560, 1600, 1000],
  plan: true,
}));

const LOGOS = [
  ['marvella', '/2025/11/MARVELLAFINAL-LOGOs-03.webp'],
  ['marvella-flat', '/2025/11/marvella-flate-logo.webp'],
  ['bricks', '/2025/11/Bricks_Logo-Revised-02-300x105.png'],
  ['bricks-ramabhupal', '/2025/11/bricks-ramabhupal-projects.webp'],
].map(([name, p]) => ({
  src: '/wp-content/uploads' + p,
  out: `logos/${name}`,
  widths: name === 'bricks' ? [300] : [600, 300],
  logo: true,
}));

/** Location flip-card fronts and the testimonial avatar. */
const LOCATION = [
  ['offices', '/2024/10/Bricks-Marvella-Location-Nearby-Offices-1.jpg'],
  ['schools', '/2024/10/Brick-Marvella-Location-Nearby-Schools-1.jpg'],
  ['hospitals', '/2024/10/bricksmarvella-location-advantgaes-hopitals.jpg'],
  ['recreation', '/2024/10/147616-1.jpg'],
].map(([name, p]) => ({ src: '/wp-content/uploads' + p, out: `images/location/${name}`, widths: [900, 560] }));

const PEOPLE = [
  ['phani', '/2026/06/phani-gopal-reddy-gudimetla-60x60.jpeg'],
].map(([name, p]) => ({ src: '/wp-content/uploads' + p, out: `images/testimonials/${name}`, widths: [60], logo: true }));

const ALL = [...DRONE, ...AMENITIES, ...PLANS, ...LOGOS, ...LOCATION, ...PEOPLE];

/**
 * Unified grading: the renders come from different sources and do not read as one
 * campaign. Contrast lift + 12% desaturation + a subtle warm skew.
 * Plans and logos are exempt (legibility / brand fidelity).
 *
 * NEVER use sharp's .tint() here. It replaces chroma while preserving luminance —
 * a duotone operation, monochrome by construction regardless of the saturation
 * setting. It shipped once and collapsed mean per-pixel R/G/B spread from 34.4 to
 * 7.2 (a 79% colour loss). The warm tone comes from per-channel gain instead,
 * which leaves hue relationships intact: corrected spread is 28.8-40.8 against an
 * original 34.4-41.8.
 */
const grade = img => img
  .modulate({ saturation: 0.88, brightness: 1.02 })   // 12% desaturation — the ceiling is 15%
  .linear([1.07, 1.055, 1.03], [-7, -7, -5]);         // contrast lift, R>G>B = warm

/**
 * `native` is opt-in and only set where the true source is WIDER than wsrv's
 * 1600px default cap (the plans). Omitting it is the safe default: wsrv then
 * returns min(native, 1600), which can never upscale. Passing a `w` larger than
 * the real source silently upscales, so never set `native` on a guess.
 */
const fetchPng = async (srcPath, native) => {
  const w = native ? `&w=${native}` : '';
  const url = `https://wsrv.nl/?url=${encodeURIComponent(ORIGIN + srcPath)}&output=png${w}&n=-1`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) throw new Error('suspiciously small: ' + buf.length + 'B');
      return buf;
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise(r => setTimeout(r, attempt * 4000));
    }
  }
};

const report = [];

for (const item of ALL) {
  const cachePath = path.join(RAW, item.out.replace(/\//g, '__') + '.png');
  await mkdir(path.dirname(cachePath), { recursive: true });
  await mkdir(path.join(PUB, path.dirname(item.out)), { recursive: true });

  let png;
  if (existsSync(cachePath)) {
    png = await readFile(cachePath);
  } else if (VERIFY_ONLY) {
    report.push({ out: item.out, status: 'MISSING (not fetched)' });
    continue;
  } else {
    try {
      png = await fetchPng(item.src, item.native);
      await writeFile(cachePath, png);
    } catch (err) {
      report.push({ out: item.out, status: 'FAILED: ' + err.message, src: item.src });
      console.error('FAIL', item.out, err.message);
      continue;
    }
  }

  const meta = await sharp(png).metadata();
  const outputs = [];
  for (const w of item.widths) {
    if (w > meta.width) continue;                       // never upscale
    const base = sharp(png).resize({ width: w, withoutEnlargement: true });
    const shaped = (item.plan || item.logo) ? base : grade(base);
    const suffix = item.widths.length > 1 ? `-${w}` : '';
    for (const fmt of ['avif', 'webp']) {
      const file = path.join(PUB, `${item.out}${suffix}.${fmt}`);
      const opts = fmt === 'avif' ? { quality: item.plan ? 62 : 55, effort: 6 } : { quality: item.plan ? 86 : 80 };
      await sharp(await shaped.clone().toBuffer())[fmt](opts).toFile(file);
      outputs.push({ file: path.relative(PUB, file), bytes: (await stat(file)).size });
    }
  }
  report.push({ out: item.out, status: 'ok', source: `${meta.width}x${meta.height}`, sourceBytes: png.length, outputs });
  console.log(`${item.out}  ${meta.width}x${meta.height}  -> ${outputs.length} files`);
}

await writeFile(path.join(ROOT, 'scripts', 'asset-report.json'), JSON.stringify(report, null, 2));
const ok = report.filter(r => r.status === 'ok');
const bytes = ok.flatMap(r => r.outputs).reduce((s, o) => s + o.bytes, 0);
console.log(`\n${ok.length}/${ALL.length} assets, ${ok.flatMap(r => r.outputs).length} files, ${(bytes / 1048576).toFixed(2)} MB total`);
for (const r of report.filter(r => r.status !== 'ok')) console.log('  !! ' + r.out + ' — ' + r.status);
