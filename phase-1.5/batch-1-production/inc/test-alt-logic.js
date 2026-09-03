/**
 * Check for the alt-text rules in bm-core.php.
 *
 * PHP is not installed on the authoring workstation, so this is a JS port of the
 * SAME patterns and the SAME decision rule, run over the REAL 40 <img> tags from
 * the audited homepage snapshot. It validates the logic and the regexes against
 * real input; it does not execute the PHP itself — re-check on staging.
 *
 *   node test-alt-logic.js [path/to/snapshot-home.html]
 * Exits non-zero on failure.
 */
const fs = require('fs');
const path = require('path');

const SNAP = process.argv[2] || path.join(__dirname, '..', '..', '..', 'audit', 'data', 'snapshot-home.html');

// --- mirror of bm_core_alt_map() ---
const MAP = [
  ['Bricks_Logo-Revised-02', 'Bricks Ramabhupal Projects'],
  ['MARVELLA_FINAL-LOGOs-05', 'Bricks Marvella'],
  ['MARVELLAFINAL-LOGOs-03', 'Bricks Marvella'],
  ['bricks-ramabhupal-projects', 'Bricks Ramabhupal Projects'],
  ['marvella-flate-logo', 'Bricks Marvella'],
  ['rupee.png', ''], ['phone.png', ''], ['dummy.png', ''],
  ['DJI_0210', 'Aerial view of the Bricks Marvella towers beside the lake at Tellapur'],
  ['DJI_0217', 'Aerial view of Bricks Marvella against the Tellapur skyline'],
  ['DJI_0272', 'Aerial view of Bricks Marvella looking towards the Financial District'],
  ['DJI_0208', 'Aerial view of the landscaped open space around Bricks Marvella'],
  ['Amphitheatre', 'Open-air amphitheatre at the Bricks Marvella clubhouse'],
  ['banquet-hall', 'Banquet hall at the Bricks Marvella clubhouse'],
  ['children-play-area', "Children's play area at Bricks Marvella"],
  ['Camera013', 'Basketball court at Bricks Marvella'],
  ['yoga-1100x550', 'Meditation and yoga centre at Bricks Marvella'],
  ['indoor-games-01', 'Indoor games room at the Bricks Marvella clubhouse'],
  ['yoga-01', 'Gymnasium and spa at Bricks Marvella'],
  ['cycling-and-jogging-track', 'Cycling and jogging track through the Bricks Marvella grounds'],
  ['Cricket-Pratice-pitch', 'Cricket practice pitch at Bricks Marvella'],
  ['master-plan', 'Bricks Marvella master plan: two towers, clubhouse and landscaped open space across 4.5 acres'],
  ['plan-a-1-2', 'Bricks Marvella Tower A floor plan, sheet 1-2'],
  ['plan-4-5-6', 'Bricks Marvella Tower A floor plan, sheet 4-5-6'],
  ['plan-6-7', 'Bricks Marvella Tower A floor plan, sheet 6-7'],
  ['plan-a-8-9', 'Bricks Marvella Tower A floor plan, sheet 8-9'],
  ['plan-b-1-2', 'Bricks Marvella Tower B floor plan, sheet 1-2'],
  ['plan-b-3-4', 'Bricks Marvella Tower B floor plan, sheet 3-4'],
  ['plan-b-5-6', 'Bricks Marvella Tower B floor plan, sheet 5-6'],
  ['lan-b-7-8', 'Bricks Marvella Tower B floor plan, sheet 7-8'],
];

// --- mirror of bm_core_alt_is_junk() ---
const isJunk = alt => {
  alt = alt.trim();
  return alt === '' || /\.(jpe?g|png|webp|gif)$/i.test(alt) || /\d{3,4}x\d{3,4}/.test(alt) || alt.toLowerCase().includes('-scaled');
};

// --- mirror of the the_content callback ---
const applyAlt = tag => {
  const a = tag.match(/\salt=(["'])([\s\S]*?)\1/i);
  if (a && !isJunk(a[2])) return tag;
  let val = null;
  for (const [needle, alt] of MAP) if (tag.toLowerCase().includes(needle.toLowerCase())) { val = alt; break; }
  if (val === null) val = a ? a[2] : '';
  const esc = val.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return a ? tag.replace(/\salt=(["'])[\s\S]*?\1/i, ' alt="' + esc + '"')
           : tag.replace(/<img\b/i, '<img alt="' + esc + '"');
};

// ---------- run over the real page ----------
const html = fs.readFileSync(SNAP, 'utf8').replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
const tags = html.match(/<img\b[^>]*>/gi) || [];
let missing = 0, empty = 0, described = 0, kept = 0, failures = [];

for (const tag of tags) {
  const out = applyAlt(tag);
  const m = out.match(/\salt=(["'])([\s\S]*?)\1/i);
  if (!m) { failures.push('NO ALT ATTRIBUTE PRODUCED: ' + tag.slice(0, 90)); missing++; continue; }
  const v = m[2].trim();
  if (v === '') empty++; else described++;
  if (/\d{3,4}x\d{3,4}/.test(v) || /\.(jpe?g|png|webp|gif)$/i.test(v)) failures.push('FILENAME SURVIVED AS ALT: ' + v.slice(0, 70));
  const before = tag.match(/\salt=(["'])([\s\S]*?)\1/i);
  if (before && !isJunk(before[2]) && before[2] !== m[2]) failures.push('OVERWROTE HUMAN ALT: "' + before[2] + '" -> "' + v + '"');
  if (before && !isJunk(before[2])) kept++;
}

// targeted unit checks
const cases = [
  ['<img src="/uploads/2023/12/Amphitheatre-1080x550.jpg" alt="Amphitheatre">', 'Amphitheatre'],                       // human alt kept
  ['<img src="/uploads/2024/10/plan-b-5-6-scaled-1.jpg" alt="">', 'Bricks Marvella Tower B floor plan, sheet 5-6'],     // empty -> described
  ['<img src="/uploads/2025/11/rupee.png">', ''],                                                                       // missing -> explicit empty (decorative)
  ['<img src="/x/bricks-marvellas-amenities-cycling-and-jogging-track-1080x550.jpg" alt="bricks-marvellas-amenities-cycling-and-jogging-track-1080x550">',
    'Cycling and jogging track through the Bricks Marvella grounds'],                                                   // filename junk -> replaced
  ['<img src="/uploads/2024/10/Plan-b-7-8-scaled-1.jpg" alt="">', 'Bricks Marvella Tower B floor plan, sheet 7-8'],      // capital-P filename
];
for (const [input, want] of cases) {
  const got = (applyAlt(input).match(/\salt=(["'])([\s\S]*?)\1/i) || [, , '<none>'])[2];
  if (got !== want) failures.push('CASE: ' + input.slice(0, 60) + '\n    want "' + want + '"\n    got  "' + got + '"');
}

console.log('tags processed: ' + tags.length + ' | described: ' + described + ' | intentionally empty: ' + empty +
  ' | human alt preserved: ' + kept + ' | without alt attribute: ' + missing);
if (failures.length) { console.error('\nFAILURES (' + failures.length + '):\n - ' + failures.join('\n - ')); process.exit(1); }
console.log('PASS — every image ends with an alt attribute, no filename survives as alt, no human alt overwritten.');
