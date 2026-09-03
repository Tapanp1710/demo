/**
 * Text acquisition. The origin firewalls this workstation (see
 * phase-1.5/MEASUREMENTS.md), so pages come through the r.jina.ai reader proxy,
 * which returns rendered markdown. The homepage is read from the local Phase 1
 * snapshot instead — it is a byte-exact capture and needs no network.
 *
 *   node scripts/scrape-content.mjs
 *
 * Writes raw captures to .content-cache/ for auditing; content.ts is authored
 * from these by hand so nothing unreviewed reaches the site.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE = path.join(ROOT, '.content-cache');
await mkdir(CACHE, { recursive: true });

const SLUGS = [
  'amphitheatre', 'banquet-hall', 'childrens-play-area', 'basket-ball-court',
  'meditation-and-yoga-center', 'indoor-games', 'gymnasium-and-spa',
  'cycling-and-jogging-track', 'cricket-practice-pitch', 'swimming-pool',
  'skating-rink', 'badminton-court', 'tennis-court', 'guest-rooms', 'gym',
  'movie-theater', 'pool-table', 'squash-court', 'table-tennis',
];

const targets = [
  { name: 'project-status', url: 'https://bricksmarvella.in/project-status/' },
  ...SLUGS.map(s => ({ name: 'portfolio-' + s, url: `https://bricksmarvella.in/portfolio-item/${s}/` })),
];

const get = async (url) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://r.jina.ai/' + url, { signal: AbortSignal.timeout(90000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      if (text.length < 200) throw new Error('too short: ' + text.length);
      return text;
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, attempt * 5000));
    }
  }
};

const results = [];
for (const t of targets) {
  const file = path.join(CACHE, t.name + '.md');
  if (existsSync(file)) { results.push({ ...t, status: 'cached' }); continue; }
  try {
    const md = await get(t.url);
    await writeFile(file, md);
    results.push({ ...t, status: 'ok', bytes: md.length });
    console.log('ok   ' + t.name + '  ' + md.length + 'B');
  } catch (err) {
    results.push({ ...t, status: 'FAILED: ' + err.message });
    console.error('FAIL ' + t.name + '  ' + err.message);
  }
  await new Promise(r => setTimeout(r, 1500)); // be polite to the proxy
}

await writeFile(path.join(CACHE, '_report.json'), JSON.stringify(results, null, 2));
console.log(`\n${results.filter(r => r.status === 'ok' || r.status === 'cached').length}/${targets.length} pages captured -> .content-cache/`);
for (const r of results.filter(r => String(r.status).startsWith('FAILED'))) console.log('  !! ' + r.name + ' — ' + r.status);
