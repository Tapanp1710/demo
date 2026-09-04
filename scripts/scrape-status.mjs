/**
 * Scrapes https://bricksmarvella.in/project-status/ into
 * .content-cache/project-status.json — one entry per month, with that month's
 * photograph URLs and its YouTube id.
 *
 * The page is WPBakery: each month is an `<h3 class="edgtf-st-title">` and
 * everything up to the next one belongs to it. LiteSpeed's lazyload rewrites
 * `src` to `data-src` and leaves a `<noscript>` twin, so both attributes are
 * read and the results de-duplicated — reading only `src` returns a page full
 * of `about:blank`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, '.content-cache');
const URL_ = 'https://bricksmarvella.in/project-status/';

const res = await fetch(URL_, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(60000) });
if (!res.ok) throw new Error(`HTTP ${res.status} from ${URL_}`);
const html = await res.text();
/* Stop at the footer. It carries a decorative YouTube embed of its own, and
   everything after the last month heading would otherwise be attributed to
   that month — October 2023 was picking up the footer's video. */
const afterHead = html.slice(html.indexOf('</head>'));
const footAt = afterHead.search(/<footer[s>]|class="[^"]*edgtf-page-footer/i);
const body = footAt > 0 ? afterHead.slice(0, footAt) : afterHead;

/* Month headings, in page order. */
const HEAD = /<h3[^>]*class="[^"]*edgtf-st-title[^"]*"[^>]*>\s*([A-Z][a-z]+ 20\d\d)\s*<\/h3>/g;
const heads = [...body.matchAll(HEAD)].map((m) => ({ date: m[1], at: m.index + m[0].length }));
if (!heads.length) throw new Error('no month headings found — the page markup changed');

/* Gallery photographs only: the logos and icons live outside /uploads/ dated
   folders or are the site chrome, which never appears between two headings. */
const IMG = /(?:data-src|src)="([^"]*\/wp-content\/uploads\/[^"]+\.(?:jpe?g|png|webp))"/gi;
const VID = /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/g;
const SKIP = /logo|favicon|avatar|placeholder|icon|Bricks_Logo|MARVELLA_FINAL/i;

const sections = heads.map((h, i) => {
  const chunk = body.slice(h.at, i + 1 < heads.length ? heads[i + 1].at : body.length);
  const images = [...new Set([...chunk.matchAll(IMG)].map((m) => m[1]))]
    .filter((u) => !SKIP.test(u))
    .map((u) => (u.startsWith('http') ? u : `https://bricksmarvella.in${u}`))
    /* WordPress emits the same photo at several sizes; keep the original. */
    .map((u) => u.replace(/-\d+x\d+(\.\w+)$/, '$1'));
  const video = [...new Set([...chunk.matchAll(VID)].map((m) => m[1]))][0] ?? null;
  return { date: h.date, images: [...new Set(images)], video };
});

await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'project-status.json'), JSON.stringify(sections, null, 2));

let photos = 0, videos = 0;
for (const s of sections) { photos += s.images.length; if (s.video) videos++; }
console.log(`${sections.length} months, ${photos} photographs, ${videos} videos`);
for (const s of sections) console.log(`  ${s.date.padEnd(16)} ${String(s.images.length).padStart(3)} photos  ${s.video ?? '—'}`);
