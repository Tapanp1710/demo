/**
 * Pulls every homepage section out of the Phase 1 rendered-DOM snapshot into
 * structured JSON, so lib/content.ts can be authored from real source text
 * rather than memory. Writes .content-cache/homepage-sections.json.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const H = await readFile(path.join(ROOT, 'audit', 'data', 'snapshot-rendered-dom.html'), 'utf8');

const ENT = {
  '&nbsp;': ' ', '&amp;': '&', '&#8217;': '’', '&rsquo;': '’', '&#8216;': '‘',
  '&#8211;': '–', '&ndash;': '–', '&#8212;': '—', '&mdash;': '—',
  '&quot;': '"', '&#039;': "'", '&apos;': "'", '&#8230;': '…', '&deg;': '°',
  '&#8220;': '“', '&#8221;': '”', '&lt;': '<', '&gt;': '>',
};
const strip = (s) => s
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#?\w+;/g, (m) => ENT[m] ?? m)
  .replace(/[ \t]+/g, ' ')
  .replace(/\n\s+/g, '\n')
  .trim();

const out = {};

// ---- every heading, in order, with its tag ----
out.headings = [...H.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)]
  .map((m) => ({ tag: m[1], text: strip(m[2]) }))
  .filter((h) => h.text);

// ---- vc_tta accordion/tab groups: specifications AND location categories ----
out.ttaGroups = [...H.matchAll(/<div class="vc_tta-panels"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi)]
  .map((g) => [...g[1].matchAll(/<h4[^>]*vc_tta-panel-title[^>]*>([\s\S]*?)<\/h4>([\s\S]*?)(?=<div class="vc_tta-panel"|$)/gi)]
    .map((p) => ({ title: strip(p[1]), body: strip(p[2]) })))
  .filter((g) => g.length);

// Flat list of every panel title+body (more reliable than group detection).
out.ttaPanels = [...H.matchAll(/<div class="vc_tta-panel"[^>]*>([\s\S]*?)(?=<div class="vc_tta-panel"|<\/div><\/div><\/div>)/gi)]
  .map((m) => {
    const title = (m[1].match(/<span class="vc_tta-title-text">([\s\S]*?)<\/span>/i) || [])[1];
    const body = (m[1].match(/vc_tta-panel-body[^>]*>([\s\S]*?)$/i) || [])[1];
    return { title: title ? strip(title) : '', body: body ? strip(body) : '' };
  })
  .filter((p) => p.title);

// ---- text columns (About, Reflection of Mastery, Tellapur copy) ----
out.textColumns = [...H.matchAll(/<div class="wpb_text_column[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi)]
  .map((m) => strip(m[1]))
  .filter((t) => t.length > 40);

// ---- section-title holders (eyebrow + heading + subtext) ----
out.sectionTitles = [...H.matchAll(/<div class="edgtf-section-title-holder[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi)]
  .map((m) => strip(m[1]))
  .filter(Boolean);

// ---- stats ----
out.stats = [...H.matchAll(/<h3[^>]*edgtf-st-title[^>]*>([\s\S]*?)<\/h3>/gi)].map((m) => strip(m[1]));

// ---- all images with alt + context ----
out.images = [...H.replace(/<noscript[\s\S]*?<\/noscript>/gi, '').matchAll(/<img\b[^>]*>/gi)]
  .map((m) => ({
    src: (m[0].match(/data-src="([^"]+)"/) || m[0].match(/\ssrc="([^"]+)"/) || [])[1] || '',
    alt: (m[0].match(/\salt="([^"]*)"/) || [])[1] ?? null,
  }))
  .filter((i) => i.src && !i.src.startsWith('data:'));

// ---- background-image URLs (the desktop amenity grid uses these) ----
out.backgroundImages = [...new Set([...H.matchAll(/background-image:\s*url\((?:&quot;|["']?)([^"')]+)/gi)].map((m) => m[1]))];

// ---- iframes ----
out.iframes = [...H.matchAll(/<iframe\b[^>]*>/gi)]
  .map((m) => ({
    src: (m[0].match(/data-src="([^"]+)"/) || m[0].match(/\ssrc="([^"]+)"/) || [])[1] || '',
    title: (m[0].match(/title="([^"]*)"/) || [])[1] || '',
  }))
  .filter((f) => f.src && f.src !== 'about:blank');

// ---- testimonials (Trustindex widget) ----
out.testimonials = [...H.matchAll(/<div class="ti-review-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi)]
  .map((m) => strip(m[1]))
  .filter(Boolean);
out.trustindexRaw = strip((H.match(/<div[^>]*class="[^"]*ti-widget[^"]*"[\s\S]{0,9000}/i) || [])[0] || '').slice(0, 4000);

// ---- links (nav + footer) ----
out.navLinks = [...new Set([...H.matchAll(/<a[^>]*href="(https:\/\/bricksmarvella\.in\/[^"]*|#[a-z-]+)"[^>]*>([\s\S]{0,80}?)<\/a>/gi)]
  .map((m) => `${strip(m[2])} -> ${m[1]}`).filter((s) => !s.startsWith(' ->')))];

// ---- raw body text, for anything the selectors missed ----
out.bodyText = strip(H.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')).slice(0, 60000);

const dest = path.join(ROOT, '.content-cache', 'homepage-sections.json');
await writeFile(dest, JSON.stringify(out, null, 1));
console.log('headings:', out.headings.length);
console.log('tta panels:', out.ttaPanels.length);
console.log('text columns:', out.textColumns.length);
console.log('section titles:', out.sectionTitles.length);
console.log('stats:', JSON.stringify(out.stats));
console.log('images:', out.images.length, '| bg images:', out.backgroundImages.length);
console.log('iframes:', out.iframes.length);
console.log('testimonials:', out.testimonials.length);
console.log('-> ' + dest);
