/**
 * Converts the scraped blog posts in .content-cache/post-*.md into
 * lib/blog-posts.json — real source text, structured as headings/paragraphs/
 * lists. Nothing is rewritten; the site's own words carry over verbatim.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const CACHE = path.join(ROOT, '.content-cache');

/** Lines the reader proxy adds from the site chrome, not post content. */
const isChrome = (l) =>
  !l.trim() ||
  /^!\[/.test(l) ||                                   // images from header/footer
  /^\*\s+\[/.test(l) ||                               // nav lists
  /^\[.*\]\(https:\/\/bricksmarvella\.in\/(#|$)/.test(l) ||
  /^(Title|URL Source|Markdown Content):/.test(l) ||
  /Building Permission No|TG RERA No|rera\.telangana|^Call us on|^Visit Us At|Bricks Infra Group is a respected/.test(l) ||
  /^(Home|About|Amenities|Master Plan|Floor Plan|Project Status|Location|Blog|Specifications|Virtual Site Visit|Contact|Privacy Policy)$/.test(l.trim()) ||
  /^\s*\[\]\(/.test(l);

/** Markdown inline -> plain text, keeping the words exactly. */
const inline = (s) =>
  s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')     // links -> their text
    .replace(/\*\*([^*]+)\*\*/g, '$1')            // bold
    .replace(/\*([^*]+)\*/g, '$1')                // italic
    .replace(/\s+/g, ' ')
    .trim();

const posts = [];
for (const f of (await readdir(CACHE)).filter((n) => n.startsWith('post-') && n.endsWith('.md'))) {
  const raw = await readFile(path.join(CACHE, f), 'utf8');
  const title = inline((raw.match(/^Title:\s*(.+)$/m) || [])[1] || '')
    .replace(/\s*[-|]\s*Bricks Marvella.*$/i, '');
  const slug = f.replace(/^post-/, '').replace(/\.md$/, '');

  const body = [];
  const lines = raw.slice(raw.indexOf('Markdown Content:')).split('\n');
  let list = null;
  for (const line of lines) {
    if (isChrome(line)) { if (list) { body.push(list); list = null; } continue; }
    const h = line.match(/^(#{2,4})\s+(.*)$/);
    const li = line.match(/^\*\s+(.*)$/);
    if (h) {
      if (list) { body.push(list); list = null; }
      const text = inline(h[2]);
      if (text) body.push({ type: 'heading', level: h[1].length, text });
    } else if (li) {
      const text = inline(li[1]);
      if (!text) continue;
      list ??= { type: 'list', items: [] };
      list.items.push(text);
    } else {
      if (list) { body.push(list); list = null; }
      const text = inline(line);
      if (text.length > 25) body.push({ type: 'p', text });
    }
  }
  if (list) body.push(list);

  const firstP = body.find((b) => b.type === 'p');
  posts.push({
    slug,
    title,
    excerpt: firstP ? firstP.text.slice(0, 200).replace(/\s+\S*$/, '') + '…' : '',
    body,
  });
}

posts.sort((a, b) => a.slug.localeCompare(b.slug));
await writeFile(path.join(ROOT, 'lib', 'blog-posts.json'), JSON.stringify(posts, null, 1));
for (const p of posts) {
  const words = p.body.filter((b) => b.type === 'p').reduce((n, b) => n + b.text.split(/\s+/).length, 0);
  console.log(`${p.slug.slice(0, 52).padEnd(54)} ${String(p.body.length).padStart(3)} blocks, ~${words} words`);
}
console.log('-> lib/blog-posts.json');
