/**
 * Crawl diff: every URL, in-page anchor, meta value and heading the OLD site
 * had, checked against the new build. Reports anything lost.
 *
 *   node scripts/crawl-diff.mjs [baseUrl]     # default http://localhost:3000
 *
 * The old site's inventory comes from the Phase 1 snapshot and the scraped
 * pages in .content-cache/, so this needs no network access to the origin
 * (which firewalls this workstation anyway).
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');

const OLD_URLS = [
  '/', '/project-status/', '/blog/', '/privacy-policy/',
  ...['amphitheatre', 'banquet-hall', 'childrens-play-area', 'basket-ball-court',
    'meditation-and-yoga-center', 'indoor-games', 'gymnasium-and-spa',
    'cycling-and-jogging-track', 'cricket-practice-pitch', 'swimming-pool',
    'skating-rink', 'badminton-court', 'tennis-court', 'guest-rooms', 'gym',
    'movie-theater', 'pool-table', 'squash-court', 'table-tennis',
  ].map((s) => `/portfolio-item/${s}/`),
  '/why-luxury-apartments-in-tellapur-hyderabad-are-becoming-the-preferred-choice-for-homebuyers/',
  '/why-new-home-buyers-are-choosing-3-bhk-apartments-in-hyderabad/',
];

const OLD_ANCHORS = [
  'about-project', 'club-house', 'amenities', 'master-plan', 'floor-plan',
  'location', 'general-specifications', 'leadform', 'contact-form', 'registeryourinterest',
];

/** Content that must survive verbatim, anywhere on the home page. */
const OLD_STRINGS = [
  'P01100007008',
  '047316/SKP/R1/U6/HMDA/17072021',
  'This will override DND/NDNC',
  'representation purposes only',
  'sales@bricksinfratech.com',
  '42,000 sft', '4.5 Acres', '1385 - 3570 sft',
  'Tellapur',
];

/** Headings the old home page carried (h2-level section names). */
const OLD_HEADINGS = [
  'About Project', 'Tellapur', 'Amenities', 'Master Plan', 'Floor Plan',
  'Location', 'Specifications', 'Construction', 'Testimonials',
];

const get = async (url) => {
  const res = await fetch(url, { redirect: 'follow' });
  return { status: res.status, html: res.ok ? await res.text() : '' };
};

const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&#8211;/g, '-').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ');

const problems = [];
const notes = [];

// ---- 1. every old URL still resolves ----
for (const u of OLD_URLS) {
  const { status } = await get(BASE + u);
  if (status !== 200) problems.push(`LOST URL  ${u} -> HTTP ${status}`);
}
notes.push(`${OLD_URLS.length} URLs checked`);

// ---- 2. home page: anchors, strings, headings, meta ----
const home = await get(BASE + '/');
const homeText = strip(home.html);

for (const a of OLD_ANCHORS) {
  if (!new RegExp(`id="${a}"`).test(home.html)) problems.push(`LOST ANCHOR  #${a}`);
}
for (const s of OLD_STRINGS) {
  if (!homeText.includes(s)) problems.push(`LOST CONTENT  "${s}"`);
}
for (const h of OLD_HEADINGS) {
  if (!new RegExp(h, 'i').test(homeText)) problems.push(`LOST HEADING  "${h}"`);
}

const meta = {
  // decode entities: the title legitimately contains "&" as &amp;
  title: ((home.html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '').replace(/&amp;/g, '&'),
  description: (home.html.match(/<meta name="description" content="([^"]*)"/i) || [])[1] || '',
  canonical: (home.html.match(/<link rel="canonical" href="([^"]*)"/i) || [])[1] || '',
  ogTitle: (home.html.match(/<meta property="og:title" content="([^"]*)"/i) || [])[1] || '',
  twitter: (home.html.match(/<meta name="twitter:card" content="([^"]*)"/i) || [])[1] || '',
};
if (!/Luxury 2, 3 & 4 BHK Flats for sale in Tellapur/i.test(meta.title)) problems.push(`META title changed: "${meta.title}"`);
if (!meta.description) problems.push('META description missing');
if (!meta.canonical) problems.push('META canonical missing');
if (!meta.ogTitle) problems.push('META og:title missing');
if (!meta.twitter) problems.push('META twitter:card missing');

// ---- 3. all 19 amenities present and linked on the home page ----
const linked = (home.html.match(/\/portfolio-item\/[a-z-]+/g) || []);
const uniqueLinked = new Set(linked.map((l) => l.replace(/\/$/, '')));
if (uniqueLinked.size < 19) problems.push(`AMENITY LINKS  only ${uniqueLinked.size}/19 linked from the home page`);
notes.push(`${uniqueLinked.size}/19 amenity links on the home page`);

// ---- 4. alt text ----
// A MISSING alt attribute is a defect. An explicitly empty alt="" is the
// correct value for a decorative image (the cube's lid, for one) and is not.
let imgs = 0, missingAlt = 0, decorative = 0;
for (const tag of home.html.match(/<img\b[^>]*>/gi) || []) {
  imgs++;
  const alt = (tag.match(/\salt="([^"]*)"/) || [])[1];
  if (alt === undefined) missingAlt++;
  else if (alt.trim() === '') decorative++;
}
if (missingAlt) problems.push(`ALT TEXT  ${missingAlt}/${imgs} home-page images have NO alt attribute`);
notes.push(`${imgs - missingAlt - decorative}/${imgs} home-page images described, ${decorative} intentionally decorative, ${missingAlt} missing`);

// ---- 5. sitemap + robots ----
for (const u of ['/sitemap.xml', '/robots.txt']) {
  const { status } = await get(BASE + u);
  if (status !== 200) problems.push(`MISSING  ${u} -> HTTP ${status}`);
}

// ---- 6. project-status keeps all 20 dates ----
const status = await get(BASE + '/project-status/');
const statusText = strip(status.html);
const dates = ['July 2026', 'June 2026', 'April 2026', 'December 2025', 'November 2025',
  'October 2025', 'August 2025', 'June 2025', 'February 2025', 'August 2024', 'July 2024',
  'June 2024', 'May 2024', 'April 2024', 'March 2024', 'February 2024', 'January 2024',
  'December 2023', 'November 2023', 'October 2023'];
const missingDates = dates.filter((d) => !statusText.includes(d));
if (missingDates.length) problems.push(`PROJECT STATUS  missing dates: ${missingDates.join(', ')}`);
notes.push(`${dates.length - missingDates.length}/20 status dates present`);

// ---- 7. all 21 specification groups ----
const specs = ['Doors', 'Utility Door', 'French Door', 'Windows', 'Grills', 'Internet / Cable TV',
  'Kitchen', 'Flooring', 'Utility', 'Corridors', 'Dadoing', 'WTP & STP', 'Electrical',
  'Generator', 'Painting', 'External', 'Bathrooms', 'Fire Safety', 'Waste Management',
  'Car Wash Facility', 'LPG Reticulation'];
const missingSpecs = specs.filter((s) => !homeText.includes(s));
if (missingSpecs.length) problems.push(`SPECIFICATIONS  missing: ${missingSpecs.join(', ')}`);
notes.push(`${specs.length - missingSpecs.length}/21 specification groups present`);

// ---- report ----
const report = { base: BASE, checkedAt: new Date().toISOString(), notes, problems };
await writeFile(path.join(ROOT, 'crawl-diff.json'), JSON.stringify(report, null, 2));

console.log(notes.map((n) => '  ' + n).join('\n'));
console.log(problems.length
  ? `\n${problems.length} PROBLEM(S):\n` + problems.map((p) => '  ! ' + p).join('\n')
  : '\nCLEAN — no lost URL, anchor, meta, heading or content.');
process.exit(problems.length ? 1 : 0);
