# DECISIONS.md

Every assumption made during the overnight autonomous run, and why. Anything
here that is wrong is cheap to change — each entry says where.

---

## 1. Phone numbers — placeholder, but the evidence points one way

**Decision:** one `PHONE_PRIMARY_E164` / `PHONE_SECONDARY_E164` pair in
`lib/content.ts`; `telHref` and `display` are both derived from them, so the
printed number and the dialled number can never diverge again.

**Evidence found while scraping** (recorded, not acted on): the old homepage's
own contact block prints `+91 7288050607` and `+91 7799774959` as headings, and
those are exactly the numbers its `tel:` links dial. The conflicting
`+91 72880 20304 / 30405` appear only in the amenity-page footer, and a fourth
(`+91 7288020304`) only in a CSS `::after`. So the two placeholders now in the
code are the two the site's own contact section agrees on.

**Still needs your confirmation.** `phone.unconfirmed` is `true`; the losing
candidates are preserved in `contact.candidatesFromOldSite` for reference and
are never rendered.

## 2. Two different addresses exist — homepage version used

The homepage contact block says **Sy No.407/A/1, 100ft Road, Tellapur, Telangana
- 502032**. The amenity-page footer says *100ft Road, Tellapur-Osman Nagar Rd,
Tellapur, Hyderabad, Telangana 500019* — a different street line and a different
PIN. The homepage version is used site-wide (`contact.address`); the other is
kept as `contact.addressAlt`. **Confirm which is the site office.**

## 3. Amenity categories for the pill filters — invented, needs review

The source has **one** category ("Club House") for all 19, so the four groups
are mine. Applied mapping:

| Category | Amenities |
|---|---|
| **Sport & Play** (9) | Children's Play Area, Basketball Court, Cycling & Jogging Track, Cricket Practice Pitch, Skating Rink, Badminton Court, Tennis Court, Squash Court, Table Tennis |
| **Wellness** (4) | Meditation & Yoga Centre, Gymnasium and Spa, Swimming Pool, Gym |
| **Leisure** (3) | Indoor Games, Movie Theater, Pool Table |
| **Community** (3) | Amphitheatre, Banquet Hall, Guest Rooms |

Change the `category` field on any amenity in `lib/content.ts` — the arc
recalculates its geometry for whatever the filtered count turns out to be.

Judgement calls worth a second look: **Gym vs Gymnasium and Spa** are two
separate source entries and both went to Wellness; **Guest Rooms** went to
Community rather than a "Stay" group, to avoid a category of one.

## 4. Blog posts — real text, not rewritten

I initially drafted post bodies myself and **deleted them** — writing marketing
copy for a real business is not mine to do. `scripts/build-blog.mjs` converts
the scraped posts into `lib/blog-posts.json` as structured headings/paragraphs/
lists, preserving the site's own words. Both posts carried over in full.

**Source inconsistencies left as-is, not silently reconciled:** the blog says
"4.25-acre expanse" while the homepage says 4.5 acres; the blog mentions a
"5-level, 42,000 sq ft clubhouse", a "60-foot gap between towers" and a
"three-tier security system" that appear nowhere else. Those are the client's
words on the client's site — flagged, not edited.

## 5. Hero copy is CSS-animated, not GSAP

The hero sub-heading is the LCP element. Animating it from `opacity: 0` in
JavaScript meant LCP could not fire until the bundle loaded and ran. It is now
a CSS keyframe animating **transform only** — `animation-fill-mode: backwards`
pins an element to its `from` state, so an opacity of 0 there re-creates the
same problem even in CSS. Same reasoning applies to About's word reveal, which
now animates `yPercent` rather than opacity (axe was correctly failing it for
contrast at rest).

## 6. Hero video is desktop-only

4.6 MB against a 207 KB poster. `shouldLoadHeroVideo()` refuses on viewports
under 768px in addition to the saveData / low-core / reduced-motion gates,
because `navigator.hardwareConcurrency` reports the *host* machine's cores under
device emulation, so the CPU gate never trips on a lab "mobile" run — the video
was downloading on mobile and accounted for 80% of page weight (4,151 KB → 825 KB).

## 7. `trailingSlash: true`

The old WordPress URLs all end in `/`. The domain ranks commercially, so URLs are
preserved exactly rather than 301-redirected.

## 7b. Amenities arc is concave, and arrow-driven

Panels are on the INNER cylinder surface (`rotateY(-off·22°) translateZ(-R)` with
the container at `translateZ(+R)`), so the centre sits furthest back and the
edges lean toward the viewer. Pushing translateZ the other way gives the convex
band this replaced. Only offsets within ±2 are painted — beyond that perspective
scales a panel past 1200px wide, entirely off-screen.

Drag and scroll-scrub were removed on request; arrows and arrow keys are the only
controls, and the section no longer pins. The ring is infinite via modular offsets
over an unbounded float, so there is no cloned DOM and no seam.

## 8. Master plan mask uses `inset()` throughout

`clip-path` does **not** interpolate between `circle()` and `inset()` — different
shape functions, and browsers refuse the transition (Chrome and Safari alike).
A square `inset()` with a 50% radius *is* a circle, so all three states
(circle → rounded rect → full bleed) run on one interpolatable function. No SVG
mask needed. **Safari note:** this is the approach chosen precisely because it
avoids the cross-engine problem, but it has not been verified on real Safari —
no Apple device here. See OPEN-QUESTIONS.

## 9. Specifications is a server component

Native `<details name="specifications">` gives exclusive-open accordion
behaviour, keyboard support and crawlable content with no JavaScript, so React
state bought nothing. 21 groups, all verbatim.

## 10. Images: `<picture>` + `srcset`, not `next/image`

The sharp pipeline already emits AVIF+WebP at fixed widths, so `next/image`
would re-encode on demand and add per-request cost on Vercel for no gain. Same
formats, same explicit dimensions, same zero-CLS guarantee. Three lint warnings
about `<img>` remain and are deliberate. Say the word and I'll switch.

## 11. Motion initialises lazily

Every animated section builds its ScrollTriggers only when it comes within 150%
of the viewport (`lib/useNearViewport.ts`). Markup is still server-rendered, so
crawlers and no-JS readers see everything. This cut main-thread work from 8.7s
to ~4.8s and TBT from 1,870ms to ~460ms.

## 12. Parallax openers avoid the plan images

Openers render the 560px variant; the floor plans are only emitted at 900px and
up (they are drawings — downsizing them destroys legibility). The Residences
opener therefore draws on the drone set instead. A missing width silently
produces an empty opener, which is exactly what happened on the first pass.

## 13. Stat band does not count up

Four of the six stats are not numbers ("2, 2.5, 3 & 4 BHK", "1385 - 3570 sft"),
so a count-up would mangle them. They use the same line-mask reveal as headings.

## 14. Disclaimer / terms pages do not exist

`/disclaimer/` and `/terms-and-conditions/` both return 403 through the proxy
and are not linked from anywhere on the old site. Treated as non-existent. Only
`/privacy-policy/` was real, and it is ported in full.

## 15. Testimonials: one review, kept verbatim

The Trustindex widget exposes exactly one review. Google attribution and the
star rating are preserved — removing them is a trust problem and probably a ToS
one. No review was invented.

## 16. The wordmark is owned by the nav, and travels as font-size

The hero's "Bricks Marvella" flies up and parks in the pinned bar. One element
does that, and it belongs to `Nav`, not `Hero`: it is `position: fixed`, its
resting state IS the small mark in the bar, and the scroll timeline unwinds a
transform that starts it out over the hero. The hero only lays out an invisible
box (`[data-hero-wordmark]`) marking where the mark should sit while it is on
screen.

Two earlier attempts failed and are worth recording, because both type-checked:

- Owning the animation in `Hero` put it inside a `gsap.context()` scoped to the
  hero root, which cannot resolve a selector for the bar outside it — so the bar
  never faded in at all. Measured `barOpacity: 0` at every scroll position.
- Owning the *element* in `Hero` meant it scrolled away with the hero, leaving
  the bar permanently empty.

Size travels as `fontSize`, not `scale`. Scaling the 22px bar mark up to the
hero's 187px rasterises the glyphs once at 22px and stretches the bitmap — the
hero wordmark rendered visibly blurred. `font-size` re-renders the glyphs each
frame, and on a single out-of-flow element the extra layout costs nothing.

The morph is measured centre-to-centre, at the destination size. The slot sets
`line-height: 0.9` and the mark `1.4`, so their boxes differ at the same glyph
size; and the mark's box grows downward as its font-size grows, so measuring it
at its 31px resting height lands the 262px one ~115px too low, clipped off the
bottom of the viewport.

## 17. Anchor links are handled by us, not by Lenis or the router

Clicking "Amenities" did not reach the amenities section. Three separate causes,
each hiding the next:

1. Lenis writes the scroll position every frame from its own value, so a native
   anchor jump is dragged back before it lands — measured 2,268px into a
   5,766px jump.
2. These are `next/link`s. Their own handler `preventDefault`s and hands the
   click to the router, which then does its own scroll — so a bubble-phase
   listener only ever saw an already-handled click. The listener is now
   capture-phase and calls `stopPropagation`.
3. Sections build their ScrollTriggers only when near the viewport (#11), so pin
   spacers below the fold do not exist when a jump starts. Scrolling toward one
   creates them and the document grows — measured 17,215px → 20,635px mid-flight
   — moving the target from 5,535px to 7,335px.

`scrollToAnchor` in `lib/gsap.ts` therefore re-aims every frame at a freshly
computed absolute position rather than firing once. It lands at exactly 88px on
both form factors. `scroll-padding-top` in `globals.css` covers the paths that
never reach Lenis (reduced motion, no scripting).

## 18. The amenity section is a name grid over a rotating cube

Replaces the arc carousel, per the reference: the names are the navigation, as
on the old site, and the cube is the single display surface. Hovering or
focusing a name paints that amenity onto the face 90° away and turns a quarter.
Four faces serve nineteen amenities because only the front face and the one
arriving are ever visible; the turn counter is unbounded, so it rotates forever
in either direction with no reset. Every name is still a real link to its
amenity page — hover is a preview, the click still navigates.

The cube is sized `max(100vw, 100svh) * 1.3`. A face covers the frame exactly
only while square to the viewer; mid-turn it is angled, its far edge recedes,
and the ground showed as black bars down both sides.

`components/ArcCarousel/` is now unreferenced. Left in place rather than
deleted — there is no version control in this directory, so removing it is not
undoable. It and `lib/amenity-dims.json` can go whenever you say so.

## 19. The scrim alpha over the cube is measured, not chosen

`0.80` through the band the name grid covers. Several of the amenity
photographs contain blown highlights at pure white, and that is the alpha at
which the palest of them still clears 4.5:1 against `--c-n-300`, the
lightest-on-lightest pairing in the section. At the 0.62 I first used, all 30
checks failed, worst 2.36:1. `scripts/check-cube-scrim.mjs` recomputes it from
the source files — rerun it if the imagery changes.

The check works from the source images rather than screenshots, because
screenshot sampling gave two false readings in a row: the light text is itself
the brightest thing inside its own box, and a hand-rolled PNG reader read RGBA
out of an RGB file, which misaligned every row and returned the same ~1.34 for
every element regardless of what was behind it.

## 20. Image widths come from a manifest, not a convention

`scripts/build-amenity-images.mjs` reads what the pipeline actually emitted and
writes `lib/amenity-images.json`. The pipeline only writes a width if the source
is at least that wide (#12), so four amenities — amphitheatre, gym,
cricket-practice-pitch, cycling-and-jogging-track — have no 1400px file. Both
the cube and the amenity detail pages hardcoded `-1400`, so all four served a
404 and rendered a broken-image icon. The detail pages also declared a fixed
`1400x788` for images that are not all 16:9.

## 21. The sticky CTA is hidden over the hero

The hero carries its own Request Price / Call Now pair, so showing the sticky
bar as well duplicated the CTA and laid the buttons across the wordmark. It now
fades in on the same scroll ramp as the nav bar, standing in for the hero's pair
as those leave. Pages with no hero reveal it on mount, reduced motion shows it
unconditionally, and `@media (scripting: none)` covers the no-JS path — nothing
may make the conversion pair permanently unreachable.

## 22. Every section is exactly one screen

`height: 100svh` (never `vh` — mobile browser chrome changes `vh` mid-scroll),
with the content scaled to whatever the heading block leaves rather than to a
hardcoded fraction. Three mechanisms, depending on the section:

- **Measured**, where the residue depends on font metrics and how many rows the
  controls wrap onto: the arc carousel's panel height is written from a
  ResizeObserver on its own track.
- **Flexed**, where the content has an aspect ratio: `flex: 1 1 0; min-height: 0`
  plus `aspect-ratio`, so width follows from the height left over. Note that an
  explicit `width` alongside `aspect-ratio` re-forces the height flex just
  removed — that is what kept the master plan 486px too tall.
- **Restructured**, where the content simply could not fit: see #23 and #24.

`--section-y-fit` replaces `--section-y` inside these. The rhythm token scales
with WIDTH (`4rem + 6vw` = 150px at 1440) and in a height-bound box that spent a
third of the screen on padding.

Two traps worth keeping in mind. A centred flex container overflows *both* ends
and ignores its own padding, which cut the top off headings — every one of these
sections uses `safe center`. And a centred grid item is sized by its content, so
the flex column inside it never comes under height pressure and never shrinks;
the drone cube needed `place-items: stretch` before its own `min-height: 0`
could do anything.

## 23. Location is a disclosure list, not tabs

Was a tabbed panel with a full-bleed image per tab and a separate map block:
1859px tall in a 900px viewport, and 2167px at 390x844. Now each category is a
row that expands to its named list, with the map as the last row and the iframe
mounted only while that row is open.

Disclosure buttons (`aria-expanded`), not `role="tab"`. An accordion is not a
tablist, and a tablist whose children are row *wrappers* rather than the tabs
themselves fails `aria-required-children` — Lighthouse caught exactly that.

**Travel times.** Only one is published anywhere on bricksmarvella.in: the
Tellapur blog post's "less than 15-20 minutes" to Gachibowli, HITEC City,
Kokapet and the Financial District, which is precisely the Offices list. That
number is shown on that row. Every other category would need a figure the site
does not state, so no other row carries one. Nothing here is estimated.

## 24. Specifications is an index plus a fixed detail panel

21 inline `<details>` expanded whichever column they sat in, so the section's
height changed with the open group and could not be held to one screen — 1270px
at 390x844. Now the 21 titles are a constant-height index (four columns at
desktop, two on a phone) and every body renders into the same reserved panel.

That gives up the no-JS accordion `<details name>` provided for free, so a
`<noscript>` block prints all 21 groups in full — which is also what a crawler
without scripting reads.

## 25. The ground scalar is scrubbed, and the body follows it

Ground inversion was measurably broken: `--ground-t` wandered between 0 and 0.44
across the whole page and never reached 1, so the light sections never appeared.
Two independent causes.

The tween was re-issued on every scroll event with `overwrite: true`. Each event
restarted a fresh 0.55s tween from the current value, so it only ever advanced
one frame's worth of easing and never arrived. It is now scrubbed against scroll
position across each boundary — from where a section whose ground differs from
its predecessor enters, to 40% into it. Position in, colour out: there is no
timeline to fall out of sync, so a jumped scroll lands on the right value.

And `body` hardcoded `background: var(--bg-stage)`, so even with the scalar
driving correctly the page behind the sections never inverted. It reads
`var(--ground)` like everything else now.

Accent contrast inverts with the ground because it comes from the same tokens:
`--ink-accent` for accent text, `--rule-accent` for accent borders. Raw
`--c-accent-500` is 2.25:1 on the light ground and is background-only; the arc
carousel's arrows were the one place still using it as a text colour.

## 26. The numbered index is in the bar only where it fits

Eight labelled entries need ~740px. The bar centres the wordmark, so the index
and the RERA/phone block share the two side tracks equally — 598px each at
1440 — and the index ran underneath the wordmark. Above 1600px it sits in the
bar; below, it is the overlay, which is the nav at those widths. The overlay
carries the same eight numbers plus the off-page links.

## 27. Amenity taglines are the category, not invented copy

The cards carry a title and a second line. Only two of the nineteen amenities
have a `descriptor` on the source site, so the rest show their category —
factual, and derived from data already in `content.ts`. Real taglines are a
content decision for the client; the shape is ready for them.

The carousel panels carry no `aria-label`. A hand-written name has to CONTAIN
the visible text verbatim or it is a label/content mismatch — with the tagline
now visible on the card, even the em-dash in "Title — Tagline" was enough to
fail it. Letting the caption name the link makes the mismatch impossible.

## 28. The nav bar does not follow the ground

Everything else on the page is derived from `--ground-t`. The bar is not: it is
a constant dark surface with its own fixed text tokens (`--nav-bg`,
`--nav-ink`, `--nav-muted`, `--nav-rule`). A bar that inverted with the page
changed colour at every section boundary, and the wordmark went with it.

Because the surface is constant, its contrast can be checked once rather than
at both extremes. `scripts/check-contrast.mjs` now carries four nav pairs, all
measured against the bar composited at its 8% transparency over the LIGHT
ground — the worst case, since that is the lightest the surface ever gets.

The wordmark is gold: `--c-gold-500` (#d9ae55), 7.47:1 on that surface. It is
warmer and more yellow than the bronze `--c-accent-500` so it reads as gold
rather than as the accent again, and it works over the dark hero at full size
as well as on the bar at rest — one colour for the whole morph.

**Layout note.** The bar is three columns and the wordmark slot must be the
middle one, because the mark itself is `position: fixed; left: 50%` and always
screen-centred. Two things broke that and both are now pinned explicitly with
`grid-column`: the menu button was a fourth sibling in a three-column grid, and
`display: none` on the numbered index takes it OUT of the grid entirely, so
auto-placement slid everything one column left and the phone number printed
straight through the gold wordmark.

## 29. Every section holds for one extra screen

`app/page.module.css` `.hold` is a wrapper two screens tall containing a
`position: sticky` section. The section arrives, stays put for a full screen of
scrolling, then releases.

Sections that already own a scroll track — hero, master plan, floor plans,
construction — are NOT wrapped. They hold for longer than this by design and a
second track would fight the first.

`data-ground` moved onto the wrapper for the six wrapped sections.
GroundProvider resolves boundaries from each ground element's position, and a
sticky element reports its stuck position rather than its place in the
document; measuring the wrapper keeps the boundaries honest. Under reduced
motion the wrapper collapses to `height: auto` and the section to `static`, so
the page is a plain stack of screens.

Measured with wheel-driven scrolling: all six held sections hold 0.97-1.11
screens. `window.scrollTo` is useless for verifying this — Lenis rewrites the
position every frame and drags the walk backwards, which reported held sections
as unheld.

## 30. The stat band is a banner, not a section

A horizontal strip of data — heading at the left, six cells across divided by
hairlines — at its natural height rather than 100svh. It is something the page
runs through, not something it stops at; six numbers centred in an empty
viewport was the worst use of a full screen on the page.

Columns are content-sized (`repeat(6, auto)` + `space-between`), not six equal
fractions: "2, 2.5, 3 & 4 BHK" needs several times the width of "32", and equal
columns wrapped the long one while leaving the short ones half empty. The cells
align on `end` so the labels share one baseline across the strip.

## 31. Section headings are one line; the numbering is gone

Eyebrows keep their descriptor and lose the `01 —` prefix; the nav shows plain
labels. Every section title is a single authored line — the two-line splits
("The / Clubhouse", "Master / Plan") were costing 90-140px of vertical space in
sections that then had none left for their own content. That reclaimed height
is what made #32, #33 and #34 possible.

## 32. The arc is 30° over a 2.0 radius, with a 1400px camera

At 22° over a 2.7 radius the outer panels were foreshortened by the numbers but
read as flat. The horizontal spread of three panels is fixed by the gap
requirement (arc spacing = R·Δθ ≈ 1.05 panel widths, so R·θ is constant); the
step is therefore the only lever on DEPTH. 30° swings the ±1 panels 0.27 panel
widths toward the camera instead of 0.20, and each renders as a true trapezoid
— near edge magnified 1.27x, far edge 1.007x.

Panel height is solved against both limits: the ±1 panels bind vertically
(magnified ~1.10x), and the ±2 sliver positions bind horizontally. At 1920 that
gives a 470x588 centre panel — 83% of the track height, portrait 4:5 — with
three fully visible panels and a 99px sliver bleeding in at each edge.

The band moved INSIDE `.track`. Anchored to the section it was positioned
against the whole section's centre rather than the arc's, and being later in
DOM order it painted over the category pills. The pills now carry
`position: relative; z-index: 2`, the band `z-index: 0`.

## 33. Master plan and floor plans are sized to their own drawings

The master plan frame now carries `aspect-ratio: 2048/1252` and takes its width
from the height the heading leaves. `object-fit: cover` on a box that already
matches the source crops nothing; the previous full-bleed box was a different
ratio and lost the top and bottom of the plan.

The floor-plan deck had `max-width: min(100%, 62rem)` — a 992px cap on a
2560x1564 architectural drawing, which is what made the room labels
unreadable. The cap is gone; the height the heading leaves is the only limit,
and at 1920 the deck renders 1035px wide with "DRAWING 12'-0" X 15'-0"",
"KITCHEN" and the SIZE (SBU) table all legible.

## 34. Specifications is an index plus a cursor popup

The fixed description panel had to reserve its height whether or not anything
was selected, and that reservation is what squeezed the index into columns
narrow enough to push the fourth one (groups 19-21) off the right edge.

The index is now an explicit CSS grid — `repeat(4, minmax(0,1fr))` with six
rows and `grid-auto-flow: column` — NOT `columns`. Multicol picks its own
column count from the available height, and with the height constrained it
produced a fifth column that ran off the edge. An explicit grid cannot.

The body appears in a popup positioned in viewport coordinates and clamped to
the viewport, flipping to the other side of the cursor near an edge. Hover and
focus open it, Escape and mouse-out close it, a tap opens and a tap outside
closes. `pointer-events: none` on the popup so it never steals the pointer from
the trigger it describes. Verified: all 21 groups inside the section and the
popup for group 21 inside the viewport at 1920, 1440 and 390.

## 35. The ground ramp has three stops, and the ink has its own curve

`--ground-t` still drives everything, but it is now carved into two halves by
`--gm1` / `--gm2`, so the ground runs stage -> mid grey -> page rather than
crossfading between two colours.

**The mid stop is a DARK warm grey (#2f2b26), not a 50% grey.** The binding
constraint is the faintest and the accent ink on the RAISED mid surface: both
need it below L=0.042, and a true mid grey (L≈0.2) puts them at roughly 2:1. At
L 0.030 the mid is still six times the stage's luminance, so it reads as a
third stop, and every ink pair clears 4.5:1 on it.

**The ink does not ride the same ramp.** Light ink needs the ground below
L=0.157 and dark ink needs it above L=0.199, so no single ground satisfies
both — a linear ink crossfade put the ink at a mid grey at the same moment the
ground was one, measured at 1.01:1. `--ink-t` is a separate, narrow smoothstep
over t 0.735..0.775, and `--gm2` is smootherstep so the ground crosses the
unsafe band quickly and lingers on the grey instead.

`scripts/check-contrast.mjs` now walks t from 0 to 1 in 1% steps and reports
both. The three RESTING stops are a hard gate (all pass); the transitional dip
is reported as information, because it is inherent: `--c-accent-500` needs a
ground below L=0.042 and `--c-accent-700` needs one above L=0.75, so NO ground
between them clears 4.5:1 for accent text. Any continuous dark-to-light sweep
crosses that gap, and it is only crossed while a boundary is being scrubbed.

## 36. Media height is solved, not capped

The three media sections were already filling their containers (floor plans
100%, clubhouse 83%) — the containers were small. Chrome, measured at 1920:

| section | chrome before | after | heading block |
|---|---|---|---|
| clubhouse | 374px | 287px | 168 -> 65 |
| master plan | 308px | 207px | 101 -> 73 |
| floor plans | 447px | 319px | 168 -> 125 |

Trimmed by cutting `--nav-h` 4.5rem -> 3.25rem, dropping the section headings
from `--t-display-3` to `--t-heading`, halving the inter-block gaps, and
replacing `--section-y-fit` padding with `--s-4`. No max-height, no max-width
cap, no rem ceiling remains on any of the three.

## 37. The arc solves its own geometry

`ASPECT` went 0.8 (portrait) -> 0.92 (near-square): at 4:5 a panel tall enough
to fill the section was too narrow to read as a picture. The panel size is now
solved from the arc's real maths rather than a tuned divisor. With step S,
radius R = k·W and perspective P, the ±1 panel's NEAR edge sits at

    x = (k·sinS + 0.5·cosS)·W        z = (k·(1−cosS) + 0.5·sinS)·W

and perspective magnifies it by P/(P−z). Both limits are that same near edge —
once against the track height (`FILL`), once against the viewport width
(`SPAN`) — bisected because the perspective term is awkward to invert. The
panel therefore ends up as large as the arc allows.

At 1920: centre 504x548, ±1 576x655 in a 793px track — the ±1 panels fill 83%
of it, with a 51px sliver bleeding in at each edge. At 1440: centre 394x429,
±1 423x492 in 613 — 80%. Width is the binding limit at both, which is why the
centre panel lands at ~26% of viewport width rather than a full third: pushing
`SPAN` past 0.90 eats the slivers.

## 38. The master plan mask, and what it cannot do

Three chained `inset()` states — never `circle()`. clip-path does not
interpolate between different shape functions, so a `circle()` -> `inset()`
tween snaps in both Chromium and WebKit; a square inset with a 50% radius IS a
circle, so the whole sequence stays inside one function:

    circle (57% of viewport height)  ->  wide rounded rect  ->  the full frame

The radius is an explicit **pixel** value, half the square's side. `round 50%`
resolves against the inset rectangle and gets clamped, which drew a squircle
rather than a circle. Both insets are measured per frame, since the frame's
proportion changes with the viewport.

**The end state is not literally edge-to-edge, and cannot be.** The plan is
2048x1252; filling 1920px of width demands 1174px of height, and the section
has 873. Edge-to-edge would crop 300px off the bottom — which is exactly where
the legend is, and the brief also requires the legend legible. The end state is
therefore the largest UNCROPPED size: 1400x850 at 1920, thin ground margins
left and right, every legend line readable.

Tested in Chromium only — this is a Windows machine with no WebKit available,
so the Safari behaviour of the chained-inset approach is reasoned, not observed.

## 39. The nav bar follows the ground again

Superseding #28. The brief requires nav TEXT to invert with the ground, and
text can only do that if the surface under it does too — black labels on a
constant dark bar would be unreadable. `--nav-bg` / `--nav-ink` / `--nav-muted`
/ `--nav-rule` are now the ground tokens with the bar's translucency applied.

The wordmark needed its own ground-aware gold: `--c-gold-500` is 1.85:1 on the
light ground. `--ink-gold` crossfades to `--c-gold-700` (#7d5f1a) on the same
`--im` curve as every other ink token, so the wordmark and the labels hand over
together. Measured 9.02:1 on stage, 6.78:1 on mid, 5.34:1 on page.

## 40. Location: the disclaimer was being painted over

`.split` is a flex item with a fixed share of the column. Its panel content —
image plus a fourteen-name list — exceeded that share and overflowed VISUALLY
past the box, straight across the disclaimer that sits after it. `overflow:
hidden` on `.split` stops that, and the list gained a fourth column so it needs
fewer rows to begin with. The map is now the fifth category row, mounted only
while open.

## 41. The specifications index fills its section

Four columns of six put all 21 groups in the top third of a 1080px screen and
left ~380px of blank ground beneath them — the section read as unfinished. The
list box was already full height (`flex: 1 1 0`); `grid-template-rows: repeat(6,
auto)` with `align-content: start` sized the rows to their own text and packed
them at the top.

Two changes: the rows now `minmax(min-content, 1fr)` so they divide the whole
track between them and still refuse to squash below their text, and the grid is
**two columns of eleven** rather than four of six. Four columns stretched to
full height give 144px rows, which floats each label absurdly far from its
rule; eleven rows land at 79px (1920) / 62px (1440), which is a normal index
row. `align-content: center` on the trigger centres the label pair in its row
so the rule reads as belonging to the line above it.

The wider columns also justified stepping the type up from `--t-caption` to
`--t-body`, which makes 21 hover targets easier to hit.

At 767px the index runs the full height too, so `.inner` now reserves
5.25rem of bottom padding for the sticky Request Price / Call Now bar — without
it the eleventh row sat underneath the buttons.

## 42. Location: three columns, and a list that adapts to the window

Category names left, the places in that category in the middle, the photograph
on the right — the panel became a two-column grid inside the split, so the
image takes whatever width the names leave and the full height of the row.
It comes out 604x720 at 1920, against 403x720 stacked.

The tabs are equal ruled rows (`flex: 1 1 0` plus a hairline) rather than five
names bunched at the top of a 700px column with nothing between them. Spread
without the rules they read as a broken layout; with them they read as the
table of contents they are.

**The names list is sized by row COUNT, not by font size.** Fourteen stretched
rows need ~406px of panel; a 1240x560 window has ~250px, and the extra rows ran
past the bottom of the box and were clipped by `.split`'s `overflow: hidden`.
Two height queries switch the same rows into 2x7 (needs 203px) and then to
plain auto rows. Nothing about the text changes — only how many rows deep it
goes.

## 43. Floor plans and master plan get side rails

Same move in both, for the same reason: stacked above the drawing, the chrome
was eating the height the drawing could have had.

Floor plans — heading, tower toggle, unit links and disclaimer run down a rail
on the left. Chrome fell from 319px to 80px and the deck went from 1245x761 to
1490x968, which is what makes the room labels comfortable rather than merely
legible.

Master plan — the stat band's six figures, three either side, with the plan
between them. The band used to be its own strip between About and the
amenities; as rails it frames the drawing instead. `StatList` is exported from
StatBand so the markup, the entrance and the count-up are defined once and the
band still renders the horizontal version. The end state is 1322x880 with the
legend legible.

Both revert to the old stack below 992px, where a rail would squeeze the
drawing to a couple of hundred pixels.

## 44. The construction timeline is moved by hand

It used to be dragged by SCROLL: a tall CSS track held the section sticky while
a ScrollTrigger scrubbed the rail's x. Two problems. The reader could only go
back along the timeline by scrolling the page backwards, and the head, rail and
video all had to fit one viewport for the whole track — on a short window the
rail was the box that lost, and the dates under the dots were clipped.

It is now an ordinary one-screen section and the rail is a native
`overflow-x: auto` container: pointer drag (pointer capture, `scrollLeft`
follows), plus wheel, touch and — since it is focusable and named — the arrow
keys, all for free. No ScrollTrigger, no scroll track, so nothing to reserve
and nothing to reduce for `prefers-reduced-motion`.

`flex: none` on the rail and the "Latest" badge moved onto the spine beside its
dot: in the flow the badge pushed that one stop's photo count a row below every
other stop's.

## 45. About: the film runs across the foot

The section centred a block that was taller than the viewport inside
`overflow: hidden`, so it was cut at BOTH ends at once — the top of the
heading and the bottom of the film. The grid now has an explicit second row:
quote and body share row 1 at their own height, the film takes row 2 across
both columns and gets every pixel they leave. 1173x700 at 1920, nothing
clipped. Below 992px the three stack in the same order.

## 46. The lead form is a dialog, not a section

It was the last full section of the home page. As a native `<dialog>` opened
by a **Contact us** button in the bar it is reachable from every scroll
position and from the pages that are not the home page — whose "Contact" links
used to navigate home and scroll.

`showModal()` means the focus trap, the inert background, Escape and the
backdrop are the platform's. The form is not built until the first open: a
dozen fields and a select nobody has asked for yet.

Five links still point at the old anchors — the hero, the sticky CTA, the bar,
the overlay's Request Price, the overlay's Contact. Rather than five edits,
ContactDialog intercepts clicks on them with ONE delegated listener. It runs in
the **capture** phase: next/link's own handler bails out when the event is
already default-prevented, so intercepting on the way down stops the navigation
while everything else on the link — the overlay closing itself — still runs on
the way up. Bubble-phase interception did not work: next/link had already
called preventDefault by then and the guard skipped it. All five verified
opening the dialog.

`LeadForm` gained one `modal` prop that swaps the 100svh section skin for a
panel; the markup, the validation and the POST are unchanged. On a phone the
call/email/address block comes back — that was hidden only because the section
had to fit one screen, and a dialog scrolls.

## 47. Location: markers, and an animated switch

The places carry a small accent dot, drawn with `::before` rather than
`list-style` — the rows are grid items and a UA marker has nowhere to sit in
one.

Switching category animates. The photograph fades and settles from a 2% scale;
the place names do NOT fade — they rise on transform alone, staggered 22ms
apart. Fading body text leaves it unreadable at the start of the tween and, if
the animation never runs, at rest. A panel goes from `display: none` to shown
when it is picked, and that is what restarts both animations — no JS, no state
beyond the tab index that was already there.

## 48. Every timeline stop shows its own month

The construction rail was a list of dates that did nothing. Each stop is now
the control: the whole dot / date / count block is one button, and picking one
swaps the film in the foot for that month's photographs — 34 for April 2026 —
scrolled sideways in the same box, each keeping its own proportions so a
portrait phone shot and a landscape drone shot sit side by side uncropped.

The section opens on the newest update, which has no photographs, so the film
is what it opens with. A filled dot now means "this is the one you are looking
at"; the newest is marked by its badge instead, because two filled dots meant
neither read as the selection.

`page.tsx` hands Construction the manifest itself rather than a date-and-count
projection of it — the stops need the photographs.

## 49. The footer, halved

660px to **345px** at 1920, same content, nothing dropped.

The ten nav links stacked in one column were 470px on their own and set the
height of everything else; as two columns of five they are 200. The rest is
tightening what was sized for a section rather than a footer: top padding from
`--section-y-fit` to `--s-5`, the column gap from `--s-8` to `--s-6`, the
wordmark from `--t-heading` to `--t-subhead`, the developer logo 9rem to 7.5,
links and address from `--t-small` to `--t-caption`, and the legal strip's rule
margin from `--s-8` to `--s-5`. The copyright gave up its own full-width row
and rides the right end of the legal line instead; only the disclaimer still
needs a line to itself.

At 767px the inner grid already supplies two columns, so the links revert to
one inside it — two inside two made four and ran "Specifications" off the right
edge.
