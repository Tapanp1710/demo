# Phase 1.5 — Deploy Guide

Split by risk, as instructed. **Batch 1 goes to production now** — it has no functional
surface: nothing is removed, no script or plugin behaviour changes, and it carries the
entire CLS win. **Batch 2 waits for staging** — every item there removes or replaces
something the page currently loads, so a failure can be silent.

| | Batch 1 → production | Batch 2 → staging first |
|---|---|---|
| Layout reservations (hero, header, carousels, accordions, widgets) | ✅ | |
| `shine` animation: `left` → `transform` | ✅ | |
| Footer-printed stylesheets hoisted into `<head>` | ✅ | |
| Alt text for all 40 images | ✅ | |
| Hero video re-encode + audio strip + poster + lazyload exclusions | ✅ | |
| `fetchpriority` moved onto the real LCP element | ✅ | |
| LiteSpeed "Add Missing Sizes" (width/height on lazyloads) | ✅ | |
| **reCAPTCHA lazy-load** — highest risk in the package | | ⚠️ |
| Script/stylesheet dequeues (multiscroll, editor CSS, dead icon CSS) | | ⚠️ |
| Icon-font subsetting | | ⚠️ |
| Self-hosted WOFF2 replacing Google-fonts CSS | | ⚠️ |
| YouTube click-to-load facades | | ⚠️ |
| LiteSpeed Combine | | ⚠️ (not recommended — see B6) |

---

# STEP 0 — Backup (before touching anything)

1. **Files + database backup.** hPanel → Websites → Backups → *Create backup* (or your
   backup plugin). Confirm it completed and is downloadable before continuing.
2. **Export the hero slider**: Slider Revolution → slider 15 → Export. Keep the ZIP.
3. Note current LiteSpeed settings (screenshots suffice).

Rollback for everything below: remove the `require` line from `functions.php`, restore the
LiteSpeed setting, re-import the slider ZIP, or restore the backup.

---

# BATCH 1 — production

## 1.1 Install the child-theme module

1. Copy `batch-1-production/inc/` and `batch-1-production/assets/` into
   `wp-content/themes/aalto-child/` → you should have `aalto-child/inc/bm-core.php` and
   `aalto-child/assets/bm-core.css`.
2. Add to the end of `wp-content/themes/aalto-child/functions.php`:
   ```php
   require get_stylesheet_directory() . '/inc/bm-core.php';
   ```
3. LiteSpeed Cache → Toolbox → **Purge All**.

**Check** — view source on the homepage and confirm all four:
1. `bm-core.css` and `<style id="bm-shine-fix">` appear in `<head>`.
2. **The four hoisted stylesheets are now in `<head>`, not before `</body>`** — search the source for
   `rs-plugin-settings`, `vc_tta_style`, `lightbox2`, `vc_animate`. This step no-ops silently if a
   plugin registers its handle later than expected (the code guards with `wp_style_is('registered')`
   rather than erroring), and it is worth a third of the CLS win. If any of them is still in the
   footer, tell me which and I will hook it differently.
3. The "Schedule a Site visit" button still shows its sweep; the hero fills the viewport from first
   paint with no jump when the slider initialises.
4. Menus, lightboxes, forms unchanged.

## 1.2 Alt text

The module fills alt text at render as a safety net, but the **permanent** fix is the Media
Library, which repairs alt everywhere on the site and survives any future theme change:

Media Library → each image below → *Alternative Text* field. The full list is in
`ALT-TEXT.md` (37 described, 3 intentionally empty for decorative icons).

> Two of the suggested strings need your confirmation: the floor-plan sheets are labelled from
> the source filenames (`plan-4-5-6` → "sheet 4-5-6"). If those digits mean unit or floor
> numbers, tell me the correct wording and I will revise the list.

## 1.3 Hero video + poster

1. Media Library → upload `media/hero-poster.webp` (207 KB) and `media/hero-1080-h264.mp4` (4.6 MB).
2. Copy the poster's URL into `BM_CORE_POSTER_URL` in `inc/bm-core.php`.
3. Slider Revolution → slider 15 → the single slide → Background:
   - replace the video with the new MP4 (H.264 High, **no audio track**),
   - set the poster image to `hero-poster.webp`,
   - **disable lazy load** for the slide background/poster (RevSlider's `rs-lazyload` was one of
     the two layers hiding the LCP).
4. LiteSpeed → Page Optimization → Media → **Lazy Load Image Excludes**, add:
   ```
   hero-poster
   Bricks_Logo-Revised-02
   MARVELLA_FINAL-LOGOs-05
   MARVELLAFINAL-LOGOs-03
   ```
   (poster + header logos — the only above-the-fold images)
5. Same screen: **Add Missing Sizes → ON**.
6. Purge All.

**Check:** hard-reload → the lakeside poster paints immediately, video fades in after; Network
shows the 4.6 MB MP4, not 115 MB; the poster carries `fetchpriority="high"` and
`DJI_0210-600x600.webp` no longer does.

Keep the old `Horizontal_Shots.mp4` in the library until the gate passes, then delete it (frees 115 MB).
`media/hero-1080-vp9.webm` (4.0 MB) is a modern-codec alternate for Phase 4, when the hero may
become a native `<video>` with source fallbacks. (No AV1: this ffmpeg build lacks SVT-AV1 — say
the word and I will produce one.)

## 1.4 GATE — re-measure

```
cd audit/data && npm i chrome-remote-interface      # first time only; needs Chrome installed
cd ../..
node audit/data/measure-cwv.js mobile  phase-1.5/after-batch1-mobile.json
node audit/data/measure-cwv.js desktop phase-1.5/after-batch1-desktop.json
```

Pass conditions:
- **CLS worst-window < 0.10 on both** (testbed predicts ≈ 0.00–0.03),
- LCP element is the hero poster, not a text node,
- no visual regressions: menu open/close, floor-plan lightboxes (prettyPhoto), master-plan
  lightbox (Lightbox2), amenities links, contact form submits, both phone CTAs dial,
  RERA/permission text present.

Sanity-check each JSON before trusting it: `fcp` must not be `null` and `resources.count`
should be ≈130+. A run with `fcp: null` and ~24 resources means the page did not paint — see
*Rate limiting* below.

**Batch 2 does not begin until this gate passes on production.**

---

# BATCH 2 — staging only

Install after batch 1 is live and staging exists.

## 2.1 Install
Copy `batch-2-staging/inc/` and `batch-2-staging/assets/` into `aalto-child/`, then add
**below** the batch-1 line in `functions.php`:
```php
require get_stylesheet_directory() . '/inc/bm-staged.php';
```
Purge All.

## 2.2 reCAPTCHA lazy-load — the highest-risk item
LiteSpeed → Page Optimization → Tuning → **JS Delayed Includes**:
```
recaptcha/api.js
gstatic.com/recaptcha
```

**Mandatory end-to-end test — do not promote without it:**
1. Open the homepage in a private window, scroll to the contact form.
2. Submit a real enquiry with a traceable name ("Deploy test <date>").
3. **Confirm the lead actually arrives** in the destination inbox / CF7 storage / CRM.
4. Repeat once *without scrolling first* (tab straight to the form and submit) — this is the
   path where a delayed reCAPTCHA most plausibly fails.
5. Check the browser console for `grecaptcha is not defined` and CF7 for a validation error.

If any submission does not arrive, remove the two lines above and re-test. A form that renders
and appears to submit while silently dropping leads is the exact failure this staging gate exists
to catch.

## 2.3 Verify the rest on staging
- **Icons:** mobile menu open/close (ElegantIcons), amenity arrows and the eye/headset/pin icons
  (Linea), the building icon (FontAwesome), slider arrow (revicons). Any missing glyph means the
  subset needs regenerating — tell me which and I will re-cut it.
- **Fonts:** headings and body render in Roboto Condensed / Roboto, not a fallback. Check a
  page with italics.
- **Dequeues:** no console errors; the page still behaves identically. (`nicescroll` is
  deliberately kept — the theme calls `.niceScroll()` unconditionally and removing it throws.)
- **YouTube facades:** all three thumbnails appear and play on click/Enter; keyboard focus ring visible.
- **Maps:** unchanged in this batch (facade deferred to Phase 4 with the section rebuild).

## 2.4 LiteSpeed Combine — not recommended
The 51 JS / 32 CSS request count is addressed by the dequeues. Combine on this stack (WPBakery +
RevSlider + Owl + prettyPhoto, order-sensitive) risks execution-order bugs for no measured gain.
If you want it tested anyway, enable it on staging alone and re-run the harness plus the full
functional checklist.

## 2.5 Re-measure staging, then promote
Same commands as 1.4, output to `after-batch2-*.json`. Promote only with the CF7 lead test passed.

---

# Notes

**Rate limiting — read before running the gate.** Repeated harness runs against the live origin trip
the host's protection. After several dozen runs, `bricksmarvella.in` became completely unreachable
from my workstation (TCP 443 and 80 time out on both origin IPs and on `www.`, while DNS resolves
normally). **The site was not down** — an independent proxy fetched the homepage fine throughout — it
is an IP-level block against the machine doing the measuring.

For you this means: your machine is unaffected, so the gate runs in 1.4 will work; but space them out,
don't run long back-to-back batteries against production, and **validate each result before trusting
it**. A run with `fcp: null` and ~24 resources (instead of ~130) measured a page that never painted —
its CLS will read as a perfect 0.0000. That is the failure signature, not a pass, and it shows up
exactly where you are hoping for a good number.

**Not in this package (your side):** the Meta pixel (`fbevents.js`, 106 KB) and Microsoft Clarity are
injected at runtime by the gtag/GTM container, not by theme code. You marked the pixel "not sure" —
it stays untouched and is listed as an open item in the QA report.

**Pre-existing bug:** the live homepage throws `downloadBrochure is not defined` (a button calls a
function that no longer exists). Not introduced here; worth fixing in Phase 4.

**Fragile selectors** (documented for Phase 4): `vc_custom_1703800234843` is shared by all four
floor-plan rows — Tower A vs B is distinguishable only by prettyPhoto gallery ids `-483` / `-654`,
which are post-id-derived and break if those galleries are rebuilt. The "IMMERSE YOURSELF" row has
no id (`.edgtf-eh-custom-1046` / `-5454` are the hooks); `/project-status/` is 20 unlabeled rows.
