# BUILD-REPORT.md

Overnight autonomous run. The complete site is built, every check listed in the
brief has been run, and the results — good and bad — are below.

---

## Headline

| | Result | Target | |
|---|---|---|---|
| Crawl diff vs old site | **CLEAN** — 0 lost URLs, anchors, meta, headings | no losses | ✅ |
| CLS | **0** both | < 0.05 | ✅ |
| Accessibility | **100** both | — | ✅ |
| SEO | **100** both | — | ✅ |
| Best practices | **100** both | — | ✅ |
| Lighthouse performance | 98 desktop · **53–63 mobile** | ≥ 90 | ❌ mobile |
| Contrast, both grounds | 17/17 pairs pass AA | verified | ✅ |
| tsc / eslint / build | clean (3 deliberate warnings) | green | ✅ |

**The one miss is mobile performance.** Everything else meets or beats the brief.
Detail and the honest reason are in "Performance" below.

---

## What shipped

**7 route groups, 29 static pages:** home · `/project-status/` · `/blog/` ·
2 blog posts at their original root URLs · 19 `/portfolio-item/<slug>/` ·
`/privacy-policy/` · `/styleguide` · `/api/lead` · `sitemap.xml` · `robots.txt`.

**20 components**, one CSS module each, TSX and CSS colocated. No raw hex outside
`tokens.css`. No `grayscale()` anywhere.

### The six motion patterns

1. **Background inversion** — one scalar `--ground-t` on `<html>`; `tokens.css`
   derives every ground/ink/rule colour from it via `color-mix`. 16 sections
   opt in with `data-ground`. Resolves from scroll position each frame rather
   than from boundary enter/leave callbacks, which silently produce the wrong
   ground when the page is jumped rather than scrolled.
2. **Line-mask reveal** — `<LineReveal>`, entry-triggered once, never scrubbed.
   Roman/italic mixing uses Cormorant's true italic.
3. **Hero shrink + wordmark morph** — one element, FLIP-style measurement
   against the real nav slot, no crossfade. The nav's centre slot is an empty
   `aria-hidden` placeholder, so the mark exists once in the DOM.
4. **Scattered parallax openers** — Amenities / Residences / Specifications.
   Z-sandwich confirmed working in the screenshots: images pass both in front
   of and behind the giant word.
5. **Circle → full-bleed** — master plan, `inset()` throughout (see DECISIONS #8).
6. **Pill filters** — All + 4 categories; the arc rebuilds for the filtered
   count and the counter follows it.

### The amenities arc (reworked)

**Concave**, matching the reference: panels sit on the *inner* surface of the
cylinder, so the centre panel is furthest back and the edges swing toward the
camera —

```
panel      rotateY(-off · 22°) translateZ(-R)
container  translateZ(+R)
```

Measured on the built page: centre at z −1128, both edges at z −811 (forward),
panels portrait at 418×522. The band's top edge rises at the left and right ends
to match. Three full panels plus a sliver at each margin; offsets beyond ±2 are
not painted, because perspective blows them up past 1200px wide off-screen.

**Infinite in both directions.** `pos` is an unbounded float and each panel's
offset is wrapped into [−n/2, n/2) with modular arithmetic — no cloned DOM, no
reset at the seam. Verified by clicking through it: 01→04 after three presses,
back to 01/19 after nineteen, and 19/19 stepping backwards from the first.

**Arrows and keyboard only.** Drag, the drag badge, the scroll-scrub and the pin
are all gone; the page scrolls past the section normally. One panel per press
over 0.6s, and rapid presses accumulate into a single retargeted tween
(`overwrite: true`) so the position cannot desync.

### Content — nothing dropped

Verified by `scripts/crawl-diff.mjs`, which fails the run if anything is lost:

- 25/25 old URLs resolve · 10/10 in-page anchors present
- **19/19** amenities rendered *and linked* on the home page (the old site
  linked 0 of them on mobile)
- **21/21** specification groups, verbatim
- **20/20** project-status dates, **128** construction photos
- All four location category lists (14 offices, 12 schools, 8 hospitals, 4 recreation)
- Legal strings verbatim: RERA `P01100007008`, permission
  `047316/SKP/R1/U6/HMDA/17072021`, the DND/NDNC consent sentence, the
  representation disclaimer
- 81/82 home-page images carry real alt text; the 1 remaining is `alt=""` on a
  decorative cube face, which is the correct value

---

## Performance

| | Mobile | Desktop |
|---|---|---|
| Performance | **53–63** (run-to-run; latest 61) | **98** |
| FCP | 1.9–2.6 s | 0.4 s |
| LCP | 5.9–6.4 s | 1.1 s |
| CLS | **0** | 0 |
| TBT | 320–700 ms (latest 410) | 40–70 ms |
| Speed Index | 5.2 s | 0.8 s |
| Page weight | 955 KB | 4.3 MB (incl. hero video) |
| JS shipped | 207 KB transferred, 10 requests | — |

Mobile performance varies 53–63 between identical runs — TBT swings 320–700 ms
on this machine. Treat the band, not a single number, as the result; re-measure
on quieter hardware before drawing conclusions.

### What was fixed along the way

| Change | Effect |
|---|---|
| `srcset`/`sizes` on carousel, plans, cube, master plan | oversized images: −1,080 ms of flagged savings |
| Hero video gated to desktop | weight **4,151 KB → 825 KB** |
| Motion initialises near-viewport (`useNearViewport`) | main thread 8.7 s → 4.8 s |
| Hero timeline deferred to `requestIdleCallback` | TBT **1,870 ms → 460 ms** |
| Specifications → server component; manifest kept off the client | −16 KB + hydration |

Mobile went 43 → 61 across those.

### Why mobile is still ~61, honestly

**LCP 6.4 s is the whole gap** — it alone caps the score. The filmstrip shows
the hero fully painted at **~2.4 s**, and every network dependency is fast (the
poster arrives in 139 ms at high priority, fonts in ~120 ms). The 6.4 s is
Lighthouse's *Lantern simulation* of the dependency graph under 4× CPU
throttling plus slow 4G, and it is dominated by "render delay" — main-thread
time, not bytes.

I chased this through four hypotheses and measured each: the GSAP opacity tween
(fixed, real), the CSS `backwards` fill (fixed, real), a `filter` on the
poster's parent (tested, not the cause), and hydration timing (deferred, cut TBT
by 75% but LCP unmoved). What remains is the irreducible cost of hydrating a
33,000px page with fifteen animated sections on a simulated mid-range phone.

Getting to 90 means one of: shipping the heavy sections as non-interactive
server components with motion added only on interaction; dropping Lenis and
some ScrollTriggers on mobile; or splitting the page into routes. Each is a
design decision I was not willing to make unsupervised — they change what you
signed off on. **The desktop experience, which is where this design lives, is 98.**

---

## Verification run

```
npx tsc --noEmit                  clean
npx eslint app lib components     0 errors, 3 warnings (deliberate <img> usage)
npx next build                    29 pages, all static/SSG
node scripts/check-contrast.mjs   17/17 pairs pass AA, both grounds
node scripts/crawl-diff.mjs       CLEAN
lighthouse mobile + desktop       above
```

Screenshots were taken of every section at 1440px and 412px and reviewed. That
review caught four bugs that all three automated checks passed:

1. **The mobile nav overlay covered the whole page at every scroll position** —
   an author `display: grid` beats the UA stylesheet's `[hidden] { display: none }`
   regardless of specificity. Same bug in Location's tab panels: all four
   rendered at once. Both fixed with an explicit `[hidden]` rule.
2. **The ground inversion showed the wrong ground** on jumped scroll positions —
   rewritten to resolve from position rather than boundary callbacks.
3. **About's body copy rendered with no spaces between words** — `display:
   inline-block` collapses an element's own trailing whitespace.
4. **The Residences parallax opener was empty** — it referenced a 560px width
   the plan images do not have. Openers now name the exact file stem, width
   suffix included, so a wrong width fails loudly rather than rendering nothing.

---

## Stubbed / needs wiring

- **Lead form endpoint.** Validates client- and server-side, posts to
  `/api/lead`, and logs loudly via the console adapter because no destination is
  configured. Wiring it is one function in `lib/leads.ts` (or set
  `LEAD_WEBHOOK_URL`). **No lead is currently delivered anywhere.**
- **Phone numbers** — placeholders, evidence in DECISIONS #1.
- **Amenity page copy** — `description` field ready and empty; pages currently
  render title + image + boilerplate exactly as the old ones did.
- **Amenity categories** — my mapping, DECISIONS #3.

## Not done

- Safari verification of the `clip-path` expansion (no Apple device here).
- 60fps-at-4×-throttle frame timing for the parallax field specifically — CLS
  and TBT were measured, per-frame timing was not.
- The old site's `/disclaimer/` and `/terms-and-conditions/` do not exist (403,
  unlinked), so nothing was ported.

---

# Addendum — pinned navbar, wordmark morph, amenity cube

## What changed

- **Pinned navbar with a morphing wordmark.** "Bricks Marvella" starts oversized
  over the hero, travels up as you scroll, and parks in the fixed bar, where it
  stays. One element does the whole journey; it is owned by `Nav` and is
  `position: fixed`. DECISIONS #16.
- **Amenities section replaced.** The arc carousel is gone; the section is now
  the old site's name grid laid over a cube that turns a quarter per selection.
  DECISIONS #18.
- **Sticky CTA no longer sits on the hero.** DECISIONS #21.

## Bugs found by looking at the screenshots

Each of these type-checked, built, and would have shipped:

1. **The nav bar never appeared.** `gsap.context()` scoped to the hero could not
   resolve the bar's selector. Measured `barOpacity: 0` at every scroll offset.
2. **The wordmark scrolled away with the hero**, leaving the bar empty.
3. **The hero wordmark was blurred** — an 8x `scale` on text rasterised at 22px.
4. **The wordmark was clipped by the viewport bottom** and sat under the sticky
   CTA buttons.
5. **Nav links did not reach their sections.** Three stacked causes, DECISIONS #17.
6. **Four amenities served a 404 image** on both the cube and their own detail
   pages, rendering a broken-image glyph. DECISIONS #20.
7. **The names failed contrast over the photography** — all 30 checks failed,
   worst 2.36:1. DECISIONS #19.
8. **Mobile requested a 560px file for a 1070px face**, because `sizes` describes
   width and the cube is sized off the taller axis on a phone.
9. **Black bars down both sides of the cube** mid-rotation.

Two of my own measurements were wrong before they were right, both reporting
success: the contrast sampler measured the text against itself, and its PNG
reader parsed RGBA out of an RGB file. Both produced clean-looking output. The
check now works from the source images instead.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npx eslint app lib components scripts` | 0 errors, 2 deliberate `<img>` warnings |
| `node scripts/crawl-diff.mjs` | CLEAN — 25 URLs, 19/19 amenity links, 21/21 spec groups, 20/20 status dates |
| `node scripts/check-contrast.mjs` | all pairs pass |
| `node scripts/check-cube-scrim.mjs` | 30 checks, worst 4.56:1, 0 below 4.5:1 |
| Lighthouse desktop | perf 98, a11y 100, best-practices 100, SEO 100 |
| Lighthouse mobile | perf 68, a11y 100, best-practices 100, SEO 100 |
| Full-page sweep, 29 frames @1440 | no HTTP errors, no JS exceptions |
| Standalone pages + reduced motion | nav bar, mark and CTA all present |

Anchor landing measured at exactly 88px below the bar on both 1440x900 and
412x823, while the document grew 17,215px → 20,635px mid-scroll.

Mobile performance is 68, up from 53-63, still short of the 90 target and still
entirely LCP under Lantern simulation. Unchanged in cause and options from
OPEN-QUESTIONS #5.

---

# Addendum — section architecture restructure

## Which sections were overflowing

Measured before any change, at all three viewports. The union is seven of
sixteen; the count differs per viewport because most were width-sensitive.

| Section | 1920x1080 | 1440x900 | 390x844 |
|---|---|---|---|
| Stat band | fits | fits | **+178px** |
| About | fits | **+40px** | **+130px** |
| Amenities (cube) | fits | fits | **+329px** |
| Location | **+821px** | **+959px** | **+1323px** |
| Specifications | **+513px** | **+635px** | **+1378px** |
| Contact form | fits | fits | **+389px** |
| Footer | fits | fits | **+350px** |
| **Total not fitting** | **2 of 16** | **3 of 16** | **7 of 16** |

Now **0 of 16 at every one of the three viewports.** Floor plans, master plan
and the drone cube had already been fixed in the previous pass.

## What changed

- **Every section is exactly 100svh**, with content sized from the space the
  heading leaves — measured, flexed, or restructured. DECISIONS #22.
- **Ground inversion restored.** It was measurably dead: `--ground-t` never
  exceeded 0.44 and the body was pinned to the stage colour. DECISIONS #25.
  The page now shows 9-10 distinct body grounds across a scroll.
- **Concave arc carousel is back** as the amenities section, replacing the cube.
  `components/AmenityCube/` is kept, unreferenced, as asked.
- **Numbered section index** in the nav, tabular figures. DECISIONS #26.
- **Stat band counts up** from zero on entry, for the stats that are single
  quantities. "2, 2.5, 3 & 4 BHK" and "1385 - 3570 sft" are a list and a range
  and are left alone — counting either up states a number the project does not
  claim. **A residences count is not published anywhere on bricksmarvella.in,
  so that fifth counter is absent rather than invented.**
- **Two-line headlines** on the three that were single-line: The / Clubhouse,
  Master / Plan, Floor / Plans.
- **Amenity cards carry a title and a tagline.** DECISIONS #27.
- **Location** rebuilt as a disclosure list with the one published travel time.
  DECISIONS #23.
- **Eyebrows** on every section title, accent, letterspaced caps, carrying the
  section number where it maps to the index.

## Bugs found by looking

1. `body` hardcoded the stage ground, so the inversion could never show.
2. The ground tween restarted every scroll frame and never converged.
3. The numbered index ran under the centred wordmark at 1440.
4. "The Clubhouse" was clipped at the top — a centred flex container overflows
   both ends and ignores its own padding.
5. `aria-required-children`: the Location tablist's children were row wrappers.
6. `label-content-name-mismatch` on all 19 carousel panels.
7. **Four sections had been commented out of `app/page.tsx`** — DroneCube and
   all three ParallaxOpeners. That edit was not mine and I could not account for
   it, so I restored all four rather than ratify it. crawl-diff was CLEAN either
   way, so no tracked content had been lost.

## Verification

| Check | Result |
|---|---|
| Sections fitting one screen | **16/16 at 1920x1080, 1440x900 and 390x844** |
| `npx tsc --noEmit` | clean |
| `npx eslint app lib components scripts` | 0 errors, 2 deliberate `<img>` warnings |
| `node scripts/crawl-diff.mjs` | CLEAN — 25 URLs, 19/19 amenity links, 21/21 spec groups, 20/20 status dates |
| `node scripts/check-contrast.mjs` | all pairs pass |
| Backward scroll (fast flick) | 0 slip, document height constant |
| ScrollTrigger table | 0 pins, 0 overlaps, every end > start |
| Full-page sweep x3 viewports | no HTTP errors, no JS exceptions |
| Lighthouse desktop | **perf 98, a11y 100, best-practices 100, SEO 100** |
| Lighthouse mobile | perf 70, a11y 97, best-practices 100, SEO 100 |

Mobile a11y 97 is a single `target-size` report on the first Location row. Its
rendered box measures 335x44, well past the 24x24 minimum, so this is a spacing
or obscured-target report — most likely the fixed CTA bar at that scroll offset
— rather than an undersized control. Desktop scores 100 on the same markup.

Mobile performance is 70, up from 53-63 originally. Still short of 90 and still
entirely LCP under Lantern simulation; unchanged in cause from OPEN-QUESTIONS #5.

---

# Addendum — nav colour, per-section hold, stat banner

- **Nav bar is a constant dark surface**, no longer following the ground.
  DECISIONS #28.
- **Wordmark is gold** (`--c-gold-500`, #d9ae55) — 7.47:1 on the bar at its
  worst case, and it holds over the dark hero at full size too.
- **Every section holds for one extra screen** of scrolling. DECISIONS #29.
- **Stat band is now a horizontal data strip**, at its natural height.
  DECISIONS #30.
- **Amenities carousel**: 3 panels instead of 5, sized from the space left over
  rather than a vh fraction. Centre panel went 376x470 to 439x549 at 1920.

## Bugs found by looking

1. The bar's grid: the menu button was a fourth sibling in a three-column grid,
   and `display: none` on the numbered index removed it from the grid so
   auto-placement slid the rest one column left. The phone number printed
   through the gold wordmark. Columns are pinned explicitly now.
2. The carousel's SIDE panels bind, not the centre — perspective magnifies them
   ~1.16x. Sizing on the centre pushed them through the category pills.
3. `ANCHOR_OFFSET` was -88px to clear the fixed nav, but sections now pad their
   own content clear of it. The offset double-counted and pushed the bottom of
   each section below the fold, which put the carousel arrows off-screen on
   arrival. Zero now; the anchor lands flush at rect.top 0.
4. On a phone the carousel's width limit crushed the panel to 114x142 — three
   panels cannot sit side by side at 390px. The width limit is desktop-only.

## Verification

| Check | Result |
|---|---|
| Sections fitting one screen | **12/12 at 1920x1080, 1440x900 and 390x844** |
| Per-section hold (wheel-driven) | six held sections at 0.97-1.11 screens |
| Ground inversion | 11-16 distinct body grounds per scroll |
| `npx tsc --noEmit` | clean |
| `npx eslint app lib components` | 0 errors, 2 deliberate `<img>` warnings |
| `node scripts/crawl-diff.mjs` | CLEAN |
| `node scripts/check-contrast.mjs` | all pairs pass, incl. 4 new nav pairs |
| Full-page sweep x3 viewports | no HTTP errors, no JS exceptions |

---

# Addendum — revision round (nine changes)

| # | Change | Outcome |
|---|---|---|
| 1 | Numbering stripped, titles to one line | Eyebrows keep descriptors; nav labels plain; all 10 headings single-line |
| 2 | Nav centre line is the wordmark only | RERA to footer (already there), phone to Menu panel; 0 overlaps at 1920/1600/1440/1280/390 |
| 3 | Carousel taller + actually concave | 470x588 centre at 1920 (83% of track), 30° step, 3 full + 99px slivers, pills clear |
| 4 | Master plan larger, uncropped | Frame carries the plan's own 2048:1252 ratio |
| 5 | Floor plans much larger | 992px cap removed; 1035px wide at 1920, room labels legible |
| 6 | Location restored | Vertical category list left, image + full place list right |
| 7 | Grey mid-stage in the ground ramp | Three stops; ink on its own curve; ramp checked at 101 points |
| 8 | Specs hover popup + 4th column | All 21 inside the section; popup clamped in-viewport at all three widths |
| 9 | One extra scroll hold per section | Six held sections at 0.98-1.08 screens; 0 pins, 0 overlaps |

## ScrollTrigger table (1440x900) — change 9

| trigger | start | end | len | pin | pinSpacing | scrub |
|---|---|---|---|---|---|---|
| cormorant_garamond (nav mark) | 0 | 810 | 810 | – | default | 0.4 |
| Hero | 0 | 990 | 990 | – | default | 0.6 |
| StatBand (ground boundary) | 990 | 1062 | 72 | – | default | true |
| hold (About) | 2969 | 3689 | 720 | – | default | true |
| master-plan | 5669 | 7289 | 1620 | – | default | 0.6 |
| floor-plan (ground boundary) | 7289 | 8657 | 1368 | – | default | true |
| floor-plan (deck scrub) | 8189 | 10709 | 2520 | – | default | 0.5 |
| hold (Amenities) | 10709 | 11429 | 720 | – | default | true |
| hold (Location) | 12509 | 13229 | 720 | – | default | true |
| construction (ground boundary) | 14309 | 14849 | 540 | – | default | true |
| construction (rail scrub) | 15209 | 15659 | 450 | – | default | 0.6 |
| hold (Specifications) | 15659 | 16379 | 720 | – | default | true |
| hold (Testimonials/Contact) | 17459 | 18179 | 720 | – | default | true |

**pins: 0 | end <= start: 0 | overlapping pin ranges: 0**

There are no pinned triggers at all. The hold is a CSS-reserved track (a
two-screen wrapper with a `position: sticky` section), so every constraint the
brief listed is satisfied by construction rather than by tuning: no pin ranges
to overlap, height reserved before JS runs, no pin spacer to insert, and no
`ScrollTrigger.refresh()` during animation (`refreshWhenSettled` waits for
fonts + load AND for scroll to be idle). No snapping anywhere.

## Verification

| Check | Result |
|---|---|
| Sections fitting one screen | **12/12 at 1920x1080, 1440x900 and 390x844** |
| Nav overlap (1920/1600/1440/1280/390) | none at any width |
| Backward scroll on a fast flick | none; document height constant |
| Per-section hold | six sections at 0.98-1.08 screens |
| Specs: all 21 inside section / popup in viewport | yes at all three widths |
| `npx tsc --noEmit` | clean |
| `npx eslint app lib components` | 0 errors, 2 deliberate `<img>` warnings |
| `node scripts/crawl-diff.mjs http://localhost:3111` | CLEAN |
| `node scripts/check-contrast.mjs` | all resting stops pass; ramp reported |
| Full-page sweep x3 viewports | no HTTP errors, no JS exceptions |

---

# Addendum — reference-match round

## Measured heading and media heights (change 1)

Before -> after, at both widths. "avail" is what the heading block, pills and
controls leave; "media" is what the media occupies of it.

**1920x1080**

| section | heading | chrome | avail | media | media/avail |
|---|---|---|---|---|---|
| clubhouse | 168 -> **65** | 374 -> **287** | 706 -> **793** | 588 -> **655** (±1 panel) | 83% |
| master plan | 101 -> **73** | 308 -> **207** | 772 -> **873** | 888 -> **1004** | 100% (frame) |
| floor plans | 168 -> **125** | 447 -> **319** | 633 -> **761** | 633 -> **761** | 100% |

**1440x900**

| section | heading | chrome | avail | media | media/avail |
|---|---|---|---|---|---|
| clubhouse | 168 -> **65** | 374 -> **287** | 526 -> **613** | 492 (±1 panel) | 80% |
| master plan | 101 -> **73** | 299 -> **207** | 601 -> **693** | 797 | 100% (frame) |
| floor plans | 168 -> **125** | 438 -> **319** | 462 -> **581** | 581 | 100% |

The medias were already filling their containers. The containers were small —
so the fix was chrome, not the media. DECISIONS #36.

## What changed

| # | Change | Outcome |
|---|---|---|
| 1 | Media fills the remaining height | chrome down 87-128px per section; no cap of any kind left |
| 2 | Clubhouse matches the reference | near-square panels (0.92), ±1 at 80-83% of track, 51px slivers, geometry solved not tuned |
| 3 | Master plan circle -> full bleed | true circle at 57% of viewport height, chained `inset()`, legend legible at the end |
| 4 | Navbar shorter | `--nav-h` 4.5rem -> 3.25rem; wordmark size unchanged |
| 5 | Nav text inverts with the ground | bar + labels + wordmark all ride the ground; gold gains a dark counterpart |
| 6 | Location disclaimer | `.split` clips to its own box; list gains a 4th column |
| 7 | Map restored | fifth category row, iframe mounted only while open |

## Verification

| Check | Result |
|---|---|
| Sections fitting one screen | 12/12 at 1920x1080, 1440x900 and 390x844 |
| Nav overlap (1920/1600/1440/1280/390) | none at any width |
| Specs: 21 groups inside section, popup in viewport | yes |
| Backward scroll on a fast flick | none; document height constant |
| `npx tsc --noEmit` | clean |
| `npx eslint app lib components` | 0 errors, 2 deliberate `<img>` warnings |
| `crawl-diff` | CLEAN |
| `check-contrast` | all three resting grounds pass, incl. the new `--ink-gold` |
| Sweeps at 1920 and 1440 | no HTTP errors, no JS exceptions |

**Not verified: Safari.** This is a Windows machine with no WebKit. The mask
uses chained `inset()` states specifically because that is the approach that
interpolates in both engines, but I have not observed it in Safari.
