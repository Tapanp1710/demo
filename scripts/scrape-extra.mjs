/**
 * Scrapes the pages the homepage links to that were not captured in step 1:
 * blog index + posts, privacy policy, and any disclaimer page. Uses the
 * r.jina.ai reader proxy (this workstation is firewalled by the origin).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const CACHE = path.join(import.meta.dirname, '..', '.content-cache');
await mkdir(CACHE, { recursive: true });

const get = async (url) => {
  for (let a = 1; a <= 3; a++) {
    try {
      const r = await fetch('https://r.jina.ai/' + url, { signal: AbortSignal.timeout(90000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const t = await r.text();
      if (t.length < 150) throw new Error('too short');
      return t;
    } catch (e) { if (a === 3) throw e; await new Promise(r => setTimeout(r, a * 5000)); }
  }
};

const targets = [
  ['privacy-policy', 'https://bricksmarvella.in/privacy-policy/'],
  ['blog-index', 'https://bricksmarvella.in/blog/'],
  ['disclaimer', 'https://bricksmarvella.in/disclaimer/'],
  ['terms', 'https://bricksmarvella.in/terms-and-conditions/'],
  ['portfolio-category-club-house', 'https://bricksmarvella.in/portfolio-category/club-house/'],
];

const results = [];
for (const [name, url] of targets) {
  const f = path.join(CACHE, name + '.md');
  if (existsSync(f)) { results.push([name, 'cached']); continue; }
  try {
    const md = await get(url);
    await writeFile(f, md);
    results.push([name, 'ok ' + md.length + 'B']);
    console.log('ok   ' + name);
  } catch (e) {
    results.push([name, 'FAILED ' + e.message]);
    console.log('FAIL ' + name + ' — ' + e.message);
  }
  await new Promise(r => setTimeout(r, 1500));
}

// Blog posts, discovered from the index if it came back.
const idxFile = path.join(CACHE, 'blog-index.md');
if (existsSync(idxFile)) {
  const { readFile } = await import('node:fs/promises');
  const idx = await readFile(idxFile, 'utf8');
  const posts = [...new Set([...idx.matchAll(/https:\/\/bricksmarvella\.in\/([a-z0-9-]{6,})\/(?![a-z])/gi)]
    .map(m => m[1])
    .filter(s => !['blog', 'privacy-policy', 'project-status', 'portfolio-item', 'portfolio-category', 'wp-content', 'wp-json', 'feed'].includes(s)))];
  console.log('\ndiscovered candidate posts:', posts.length);
  for (const slug of posts.slice(0, 25)) {
    const f = path.join(CACHE, 'post-' + slug + '.md');
    if (existsSync(f)) continue;
    try {
      const md = await get('https://bricksmarvella.in/' + slug + '/');
      await writeFile(f, md);
      console.log('  post ok  ' + slug);
    } catch { console.log('  post FAIL ' + slug); }
    await new Promise(r => setTimeout(r, 1200));
  }
}

console.log('\n' + results.map(r => r.join(': ')).join('\n'));
