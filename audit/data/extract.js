// Phase-1 audit extraction: colors, font-families, @font-face, role rules, icon glyphs, alt inventory.
const fs = require('fs'), path = require('path');
const SP = __dirname;
const OUT = path.join(SP, 'out');
fs.mkdirSync(OUT, { recursive: true });

const urlMap = {};
for (const line of fs.readFileSync(path.join(SP, 'css-urls.txt'), 'utf8').split(/\r?\n/).filter(Boolean)) {
  urlMap[path.basename(line.split('?')[0])] = line;
}
const home = fs.readFileSync(path.join(SP, 'home.html'), 'utf8');
const rendered = fs.readFileSync(path.join(SP, 'rendered.html'), 'utf8');

// ---------- sources: 32 css files + inline <style> blocks + style="" attributes ----------
const sources = {};
for (const f of fs.readdirSync(path.join(SP, 'css'))) sources[f] = fs.readFileSync(path.join(SP, 'css', f), 'utf8');
let anon = 0;
for (const m of home.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)) {
  const idm = m[1].match(/id=["']?([^"'>\s]+)/);
  const name = 'inline:' + (idm ? idm[1] : 'style-' + (++anon));
  sources[name] = (sources[name] || '') + '\n' + m[2];
}
sources['inline:style-attributes'] = [...home.matchAll(/style=["']([^"']+)["']/g)].map(m => m[1]).join(';');

// ---------- A. colors ----------
const normHex = h => {
  h = h.toLowerCase();
  return /^#[0-9a-f]{3}$/.test(h) ? '#' + [...h.slice(1)].map(c => c + c).join('') : h;
};
const colors = {};
for (const [name, txt] of Object.entries(sources)) {
  for (const m of txt.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) || []) {
    const c = m.startsWith('#') ? normHex(m) : m.replace(/\s+/g, '').toLowerCase();
    (colors[c] = colors[c] || { count: 0, files: {} });
    colors[c].count++;
    colors[c].files[name] = (colors[c].files[name] || 0) + 1;
  }
}
const colorRows = Object.entries(colors).map(([color, v]) => ({ color, count: v.count, files: v.files }))
  .sort((a, b) => b.count - a.count);
fs.writeFileSync(path.join(OUT, 'colors.json'), JSON.stringify(colorRows, null, 1));

// ---------- B. font-family declarations ----------
const fams = {};
for (const [name, txt] of Object.entries(sources)) {
  for (const m of txt.matchAll(/font-family\s*:\s*([^;}]+)/gi)) {
    const v = m[1].replace(/["']/g, '').replace(/!important/gi, '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!v) continue;
    (fams[v] = fams[v] || { count: 0, files: {} });
    fams[v].count++;
    fams[v].files[name] = (fams[v].files[name] || 0) + 1;
  }
}
fs.writeFileSync(path.join(OUT, 'fontfamilies.json'), JSON.stringify(
  Object.entries(fams).map(([family, v]) => ({ family, count: v.count, files: v.files })).sort((a, b) => b.count - a.count), null, 1));

// ---------- C. @font-face ----------
const faces = [];
for (const [name, txt] of Object.entries(sources)) {
  for (const m of txt.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
    const d = m[1];
    const base = urlMap[name] || 'https://bricksmarvella.in/';
    const urls = [...d.matchAll(/url\(([^)]+)\)/gi)].map(u => u[1].replace(/["']/g, '')).map(u => {
      if (/^data:/.test(u)) return 'data:(embedded)';
      try { return new URL(u, base).href } catch (e) { return u }
    });
    faces.push({
      file: name,
      family: ((d.match(/font-family\s*:\s*["']?([^;"'}]+)/i) || [])[1] || '').trim(),
      weight: ((d.match(/font-weight\s*:\s*([^;}]+)/i) || [])[1] || '').trim(),
      style: ((d.match(/font-style\s*:\s*([^;}]+)/i) || [])[1] || '').trim(),
      urls
    });
  }
}
fs.writeFileSync(path.join(OUT, 'fontfaces.json'), JSON.stringify(faces, null, 1));
const headUrls = [...new Set(faces.flatMap(f => f.urls).filter(u => /^https?:/.test(u)).map(u => u.split('#')[0]))];
fs.writeFileSync(path.join(OUT, 'fontface-urls.txt'), headUrls.join('\n'));

// ---------- D. role rules (selector -> font-family) ----------
const roleSel = /(^|[\s,>+~])(body|html|h[1-6]|p|button|input|textarea|select)\b|edgtf-st-title|edgtf-st-text|edgtf-btn|edgtf-main-menu|edgtf-page-header|vc_custom_heading|edgtf-section-title|wpb_text_column|edgtf-title|menu-item|edgtf-logo/;
const roles = [];
for (const [name, txt] of Object.entries(sources)) {
  const flat = txt.replace(/@(media|supports)[^{]*\{/g, '');
  for (const m of flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim(), dec = m[2];
    if (!/font-family/i.test(dec)) continue;
    if (!roleSel.test(sel)) continue;
    roles.push({
      file: name,
      selector: sel.replace(/\s+/g, ' ').slice(0, 140),
      family: ((dec.match(/font-family\s*:\s*([^;}]+)/i) || [])[1] || '').replace(/["']/g, '').trim().slice(0, 80)
    });
  }
}
fs.writeFileSync(path.join(OUT, 'roles.json'), JSON.stringify(roles, null, 1));

// ---------- E. icon glyphs: per-file class->:before content sets, DOM intersection ----------
const domClasses = new Set();
for (const m of rendered.matchAll(/class=["']([^"']*)["']/g)) for (const t of m[1].split(/\s+/)) if (t) domClasses.add(t);
const staticClasses = new Set();
for (const m of home.matchAll(/class=["']([^"']*)["']/g)) for (const t of m[1].split(/\s+/)) if (t) staticClasses.add(t);

const glyphFiles = {};
for (const [name, txt] of Object.entries(sources)) {
  for (const m of txt.matchAll(/([^{}]+)\{[^{}]*content\s*:\s*["']\\?[^"']+["'][^{}]*\}/g)) {
    for (const c of m[1].matchAll(/\.([A-Za-z0-9_-]+)\s*:{1,2}before/g)) {
      (glyphFiles[name] = glyphFiles[name] || new Set()).add(c[1]);
    }
  }
}
const glyphReport = Object.entries(glyphFiles).map(([file, set]) => {
  const famsInFile = faces.filter(f => f.file === file).map(f => f.family);
  const used = [...set].filter(c => domClasses.has(c));
  const usedStatic = [...set].filter(c => staticClasses.has(c));
  return { file, fontFamilies: [...new Set(famsInFile)], defined: set.size, usedInRenderedDom: used.length, usedClasses: used, usedInStaticHtml: usedStatic.length };
}).sort((a, b) => b.defined - a.defined);
fs.writeFileSync(path.join(OUT, 'icon-glyphs.json'), JSON.stringify(glyphReport, null, 1));

// ---------- F. alt inventory ----------
const noNo = home.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
const rows = [...noNo.matchAll(/<img\b[^>]*>/gi)].map((t, i) => {
  const tag = t[0];
  const src = ((tag.match(/\sdata-src=["']([^"']+)/) || tag.match(/\ssrc=["']([^"']+)/) || [])[1] || '');
  const altm = tag.match(/\salt=(["'])(.*?)\1/);
  return {
    n: i + 1,
    src: src.replace(/^https?:\/\/[^/]+/, '').replace(/^\/wp-content\/uploads/, '…/uploads').slice(0, 100),
    status: altm ? (altm[2].trim() ? 'present' : 'empty') : 'missing',
    alt: altm ? altm[2].slice(0, 90) : ''
  };
});
fs.writeFileSync(path.join(OUT, 'alt-inventory.json'), JSON.stringify(rows, null, 1));

console.log('colors:', colorRows.length, '| families:', Object.keys(fams).length, '| @font-face:', faces.length,
  '| font urls:', headUrls.length, '| role rules:', roles.length, '| glyph files:', glyphReport.length,
  '| imgs:', rows.length, '(present:', rows.filter(r => r.status === 'present').length + ', empty:', rows.filter(r => r.status === 'empty').length + ', missing:', rows.filter(r => r.status === 'missing').length + ')');
console.log('top colors:', colorRows.slice(0, 12).map(c => c.color + 'x' + c.count).join(' '));
