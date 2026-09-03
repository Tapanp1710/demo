# bricksmarvella.in — Phase 1 Site Audit & Baseline Report

**Audited:** 2026-09-01 (IST evening) · **Scope:** descriptive audit only — current typography, colour, icon fonts, alt text, performance baseline, structure. **No design decisions or recommendations in this document**, per the agreed Phase 1 brief.
All raw data referenced here lives in [`audit/data/`](data/) and the measurement JSONs in this folder. Every CSS claim cites the stylesheet by its WordPress handle; the handle → LiteSpeed file → URL map is [`data/css-handle-map.txt`](data/css-handle-map.txt) + [`data/css-urls.txt`](data/css-urls.txt).

---

## 1. Headline facts

- **CLS is 0.93 (mobile) / 0.72 (desktop)** — worst-session-window values; Google's "good" ceiling is 0.10, "poor" starts at 0.25.
- **The hero never paints an image first**: the LCP element is *text* on both form factors (`H2.vc_custom_heading` mobile, a `P` on desktop). The hero background is a **115.3 MB, 32.6 Mbps H.264 video** whose poster JPEG is double-lazy-loaded (Slider Revolution `rs-lazyload` + LiteSpeed `data-lazyloaded`), so no hero image is eligible at first paint.
- The page's **`load` event never fired within ~100 s** on the throttled mobile pass; DOMContentLoaded took 6.8 s at 4× CPU throttle.
- The page's only `fetchpriority="high"` is on `DJI_0210-600x600.webp` — a below-the-fold 600×600 carousel thumbnail.
- **The brand gold `#d7955d` exists only as 22 hardcoded inline values** (element `style=""` attributes, `#wp-custom-css`, one WPBakery shortcode block). It appears in **zero stylesheets**. There is no token/variable layer.
- **9 icon-font families ship ~3,000 glyph definitions; the rendered DOM references ~10 glyph classes** (plus 3 rule-level usages). Google fonts are served as **TTF, not WOFF2** (532 KB across Roboto + Roboto Condensed + Abril Fatface), because LiteSpeed localized the Google Fonts CSS server-side and froze the TTF fallback URLs.
- **Abril Fatface is downloaded for exactly one element — the SEO `h1` that is `display:none`.**
- Alt text: of 40 real `<img>` tags, **17 have alt text, 20 have empty `alt=""`, 3 have no alt attribute** — and several "present" values are filename junk (see §7).

---

## 2. Performance baseline (lab)

> **Method in one line:** PageSpeed Insights API was quota-blocked (429) and Lighthouse was 403-blocked by the host's WAF in all configurations (details in §9), so metrics were captured with a custom CDP harness (`data/measure-cwv.js`) on headless Chrome 152 using the browser's own PerformanceObserver — mobile pass: 412×823 @1.75, touch, **4× CPU throttle**; desktop pass: 1350×940, no throttle. **Network unthrottled** (broadband) on both — real-phone numbers on Indian mobile networks will be *worse* than these. Single run each, ~19:26/19:29 IST. Re-run the same script after the redesign for a like-for-like comparison.

| Metric | Mobile (4× CPU) | Desktop | Reference (good / poor) |
|---|---|---|---|
| TTFB | 66 ms | 47 ms | — (edge cache is fast) |
| First Contentful Paint | 1,064 ms | 500 ms | 1.8 s / 3.0 s |
| **Largest Contentful Paint** | **1,260 ms — `H2.vc_custom_heading` (text)** | **500 ms — `P` (text)** | 2.5 s / 4.0 s |
| **CLS (worst window)** | **0.927** | **0.722** | **0.10 / 0.25** |
| CLS (session total) | 0.945 | 0.723 | — |
| Long tasks | 30 tasks · 7,376 ms total | 7 · 492 ms | — |
| Main-thread blocking after FCP (TBT analogue) | **5,843 ms** | ~180 ms | 200 ms / 600 ms |
| DOMContentLoaded | 6,802 ms | ~1.9 s | — |
| `load` event | **not reached in ~100 s** | 4,456 ms | — |
| Requests / transfer at sample | 146 / 2.45 MB (video not yet started) | 176 / 5.41 MB (video streaming, `readyState 4`) | — |

**LCP-time caveat:** the sub-1.3 s LCP looks healthy only because the LCP is a text node on an unthrottled network; the hero imagery is entirely absent from the first-paint path (poster lazy-loaded ~173 KB later; video later still). On throttled networks the text LCP additionally waits on the TTF font chain (§4).

**Heaviest individual resources observed** (excluding the hero video stream): reCAPTCHA `recaptcha__en.js` 344 KB · hero poster `Horizontal_Shots_28.jpeg` 173 KB · location-tab JPGs 153/129/103/84 KB (CSS-initiated) · Meta pixel `fbevents.js` 106 KB · one LiteSpeed JS bundle 93 KB.

**Request inventory (static analysis):** 51 separate JS files + 32 separate CSS files (LiteSpeed "minify" without "combine"; raw CSS total ≈ 2.03 MB before Brotli), 40 real images (44 lazy-load rewritten elements), 2 YouTube iframes, 1 Google Maps iframe, Trustindex widget, reCAPTCHA, gtag (AW-639905625, DC-14767699) **and a Meta pixel** (`fbevents.js` — not in the earlier stack recon).

### 2.1 Hero video — measured encode parameters (`data/../mp4-probe.json`)

| Property | Value |
|---|---|
| File | `/wp-content/uploads/2025/11/Horizontal_Shots.mp4` |
| Size | **120,897,476 B (115.3 MiB)** |
| Duration | 29.35 s (loop) |
| Video | H.264 (avc1) **Main profile**, 1920×1080, 23.976 fps, yuv420p, **32.64 Mbps** |
| Audio | **AAC-LC, 317 kbps** — present although the hero plays muted |
| Overall bitrate | 32.95 Mbps |

For scale: 29 s of 1080p at this bitrate is Blu-ray-class; the audio track alone is ~1.1 MB. (Re-encode targets are a Phase 2+ decision — recorded here as data only.)

### 2.2 CLS context (observed page traits, not itemized attribution)

44 elements are LiteSpeed-lazy-loaded with 1×1 base64 GIF placeholders and no reserved aspect-ratio box; the amenities Owl slider, drone-image carousel, Slider Revolution module and Trustindex widget all size themselves post-JS. The 0.93/0.72 shift totals accumulated during initial render on both passes.

---

## 3. Structure & stack inventory

| Layer | Fact |
|---|---|
| WordPress | 6.8.8 · PHP 8.1.34 |
| Theme | **Aalto 1.8** (Edge Themes, `edgtf-core 1.0.8`) with **active child theme `aalto-child` 1.0.1** |
| Child theme visibility | Its stylesheet (`aalto-edge-child-style`) is **0 bytes** — the child theme currently overrides nothing via CSS; its PHP contents are not visible from outside |
| Builder | WPBakery `js-comp-ver-6.8.0` |
| Hero | Slider Revolution 6.5.11, `#rev_slider_15_1_wrapper`, single slide, video background |
| Caching | LiteSpeed Cache 7.8.0.1 (page cache HIT at origin; minify only — no combine; inline scripts as base64 `data:` URIs, deferred) behind Hostinger CDN (`hcdn`, HTML edge-MISS, uploads cached 1 y) |
| jQuery | 3.7.1 + jquery-migrate |
| Animation libs present | waypoints, parallax(-scroll), nicescroll, multiscroll, appear, isotope, packery, owl-carousel, swiper, typed, countdown, counter, chart.js, easypiechart + CSS keyframes in `#wp-custom-css` (`scale-up-animation`, `imageanimation`, `shine`, `spin-rotate`). **No GSAP, no Lenis** |
| Lightboxes | prettyPhoto (theme; floor-plan galleries) + Lightbox2 (master plan) |
| Other plugins visible | Contact Form 7, Popup Maker (`#popmake-5086`), Chaty (+picmo), Trustindex, reCAPTCHA |
| Hotlinking | None; uploads send `access-control-allow-origin: *` |

### 3.1 Section map (front page, top → bottom)

| Section | Anchor / row | Key selectors |
|---|---|---|
| Hero | `.edgtf-slider` (above WPBakery content) | `#rev_slider_15_1_wrapper`; only slide text: "Experience 360° Views" ×4 responsive layer duplicates |
| Headline + stats | `.vc_row.vc_custom_1703843941243` | hidden SEO `h1.vc_custom_heading.d-none` (Abril Fatface); `h2` "EXPERIENCE PERFECT LIFE"; **6 stat blocks:** `.vc_custom_1703843941243 .edgtf-st-title` (2/2.5/3&4 BHK · 42,000 sft · 32 · 1385–3570 sft · 2 · 4.5 Acres), labels in sibling `.wpb_text_column p`; "32" carries `.scale-up-animation` |
| About | `#about-project` | — |
| City views ("IMMERSE YOURSELF…") | **row has no id and no `vc_custom_*`** | hooks: `.edgtf-eh-custom-1046` (text col) / `.edgtf-eh-custom-5454` (image col); `h2.edgtf-st-title` inline-styled `#d7955d`; 4 `DJI_*-600x600.webp` in an Owl one-item carousel, no `srcset`; only generated sizes: original / 600×600 / 150×150 (all verified 200, full-size included) |
| Amenities | `#club-house` (heading row), grid in 2 rows `.amenities-text-disclaimer.vc_custom_1729329546232`, `#amenities` = empty spacer row after | **Desktop:** `article.edgtf-fpg-item` ×19, links `a.edgtf-fpgi-link` → `/portfolio-item/<slug>/` (plain navigation, **no lightbox**); images live in a *separate index-matched* `.edgtf-fpg-image-holder .edgtf-image-url[style*=background-image]` list using **full-size originals**. **Mobile:** separate 9-item Owl gallery (`.edgtf-pl-gallery`), `-1080x550`/`-1100x550` crops, **no links at all** |
| Master plan | `#master-plan` | `figure.vc_figure a[data-lightbox]` (Lightbox2) → `…master-plan…1024x626.jpg`; full 2048×1252 as `img[data-src]` |
| Floor plans | `#floor-plan` (Tower A heading) | Tower A gallery `prettyPhoto[image_gallery_pretty_photo-483]`: plan-4-5-6 / plan-6-7 / plan-a-1-2 / plan-a-8-9 (all `-scaled-1.jpg`, 2560×1564). **Tower B row has no id**, gallery `-654`: plan-b-1-2 / plan-b-3-4 / plan-b-5-6 / **P**lan-b-7-8. ⚠ `vc_custom_1703800234843` is shared by all four floor-plan rows — the gallery ids are the only discriminators |
| Location / specs / contact | `#location`, `#general-specifications`, `#contact-form` | location tab JPGs load via CSS backgrounds |
| Construction | `.vc_custom_1511536171438` (**shared with "Reflection of Mastery"**) + a plain row | YouTube `J2ctBmVASO4` ("…Update \| July 2026"), `a[href="/project-status/"]` "Check Current Status" |
| `/project-status/` | 200 · page id 5116 | 20 reverse-chronological `h3` date headings (Jul 2026 → Oct 2023) in identical unlabeled `.vc_row`s — no ids anywhere |

**DOM caveat for any future tooling:** LiteSpeed rewrites every image to `src="data:image/gif…" data-src="real"` with a `<noscript>` twin — naive `img.src` reads and `<img>` counts are wrong (80 tags in HTML = 40 real + 40 noscript).

---

## 4. Typography inventory

**Families actually loaded** (from `@font-face` + Google Fonts CSS localized into LiteSpeed files; sizes HEAD-verified — `data/fontface-sizes.json`):

| Family | Faces | Weights | Format served | Total bytes | Source | Loaded because |
|---|---|---|---|---|---|---|
| **Roboto** | 7 | 300 / 400 / 700 (+italics) | **TTF** | 195 KB | fonts.gstatic.com via `aalto-edge-google-fonts` | body text |
| **Roboto Condensed** | 12 | 300 / 400 / 700 + italics | **TTF** | 320 KB | same + `vc_google_fonts_roboto_condensed…` | headings, menu, buttons |
| **Abril Fatface** | 1 | 400 | **TTF** | 17 KB | `vc_google_fonts_abril_fatfaceregular` | **only the `display:none` SEO h1** |
| Trustindex Open Sans | 28 subsets | 400 / 700 | WOFF2 | 270 KB total (subsets load on demand) | cdn.trustindex.io | testimonials widget |

TTF-not-WOFF2: LiteSpeed's server-side localization of the Google Fonts CSS captured the TTF fallback variant of the API response, so browsers download TTF despite full WOFF2 support.

**Role → family map** (traced through the cascade; primary source `aalto-edge-modules` = `2d96f7fe….css`, sticky-nav variants in `aalto-edge-style-dynamic` = `8af22421….css`):

| Role | Family | Rule cited |
|---|---|---|
| `body` | Roboto, sans-serif | `aalto-edge-modules` |
| `h1`–`h6` | **Roboto Condensed**, sans-serif | `aalto-edge-modules` |
| Main menu links | Roboto Condensed (sticky-nav variant: Roboto) | `aalto-edge-modules` / `aalto-edge-style-dynamic` |
| Buttons (`.edgtf-btn`), CF7 submits | Roboto Condensed | `aalto-edge-modules` |
| Search/newsletter/footer inputs | Roboto | `aalto-edge-modules` |
| Breadcrumbs, portfolio meta | Roboto Condensed | `aalto-edge-modules` |
| Hidden SEO `h1` | Abril Fatface | `vc_google_fonts_abril_fatfaceregular` + element class |
| Testimonials widget | "Trustindex Open Sans" | widget inline CSS |
| prettyPhoto lightbox controls | Ionicons (glyphs) | `aalto-edge-modules` |

42 distinct `font-family` declaration values exist overall (`data/fontfamilies.json`); the remainder are framework/editor/plugin fallback stacks (wp-components, Chaty, Popup Maker, mediaelement…), not the site's design voice.

---

## 5. Colour inventory

**706 distinct colour literals** across the 32 stylesheets + inline CSS (`data/colors.json`). Grouped by *where they come from*, since that separates the page's design layer from framework noise:

### 5.1 Page-design layer (inline `style=""` attributes, `#wp-custom-css`, WPBakery shortcode blocks)
The colours that constitute the site's actual visual identity as built:

| Colour | Count | Where |
|---|---|---|
| **`#d7955d` brand gold** | **22** | element style attrs ×15 (e.g. the "IMMERSE YOURSELF" `h2`), `#wp-custom-css` ×4, one `vc_custom` block ×3 — **never in any stylesheet file** |
| `#ce8e60` (second, darker gold) | 3 | two `vc_custom` shortcode blocks |
| `#202020` (near-black) | 16 inline (+196 as the theme's own dark across `aalto-edge-modules` etc.) | style attrs |
| `#888888` / `#999999` (label greys) | 10 / 8 | style attrs |
| `#111111`, `#2e2e2e` | 4, 2 | wp-custom-css + attrs |
| `#27213f` (dark violet) | 2 | `#wp-custom-css` |
| `#ffffff` / `#000000` | 48 / 6 inline | everywhere |

### 5.2 Theme layer (Aalto defaults — `aalto-edge-modules`, `aalto-edge-default-style`, dynamic styles)
Dark greys `#202020` ×196 · `#2a2a2a` ×102 · `#1e1e1e` ×78 · `#333333` ×52; body-text grey `#666666` ×166; surface neutrals `#f0f0f0` ×207 · `#f8f8f8` ×171 · `#f7f7f7` ×117 · `#ebebeb` ×88 · `#f2f2f2` ×67 · `#dddddd` ×62; `#ffffff` ×1,234 total; `#fff0` (transparent shorthand) ×927.

### 5.3 Framework noise (loaded but not part of the design)
WPBakery's preset palette in `js_composer_front` (~14 colours at ~82 occurrences each: `#75d69c #5472d2 #fe6c61 #8d6dc4 #4cadc9 #6dab3c #f4524d #f7be68 #00c1cf …`); Trustindex star golds `#f6bb06`/`#fbe049`; Gutenberg/editor defaults (`#cf2e2e`, `#32373c`).

**Structural fact:** no CSS custom properties / token layer carries any brand colour; the gold pair lives exclusively in hardcoded inline values.

---

## 6. Icon-font inventory *(user-requested)*

Method: glyph classes = selectors with `:before { content: "…" }` in each family's stylesheet; "referenced" = those class names present in the **rendered DOM** (headless-Chrome `--dump-dom`, post-JS). Rule-level usages (family applied to non-glyph selectors) listed separately. Clearfix `content:" "` pseudo-rules excluded where identified. Font *files* download only when a family's glyph actually renders; the 9 CSS files load regardless.

| Family (handle) | File format Chrome picks | Size | Glyphs defined | Referenced in rendered DOM |
|---|---|---|---|---|
| FontAwesome (`edgtf-font-awesome`) | WOFF2 | 75 KB | 786 | **1** — `fa-building` |
| Ionicons (`edgtf-ion-icons`) | TTF | 102 KB | 733 | **0** by class; rule-bound to prettyPhoto prev/next/close (downloads when a floor-plan lightbox opens) |
| Linea ×7 sub-families (`edgtf-linea-icons`, 7 files) | TTF | ~49 KB total | 712 | **6** — `icon-arrows-left/right`, `icon-basic-eye`, `icon-basic-headset`, `icon-basic-pin1`, `icon-basic-elaboration-mail-check` |
| ElegantIcons (`edgtf-font-elegant`) | TTF | 27 KB | 360 | **2** — `icon_menu`, `icon_close` (+ language-menu caret rule) |
| dripicons-v2 (`edgtf-dripicons`) | TTF | 24 KB | 200 | **0** |
| simple-line-icons (`edgtf-simple-line-icons`) | WOFF2 | 26 KB | 183 | **0** |
| Linearicons-Free (`edgtf-linear-icons`) | WOFF2 | 21 KB | 170 | **0** |
| revicons (`rs-plugin-settings`) | TTF | 7 KB | 46 | **1** — `revicon-right-dir` |
| vcpb-plugin-icons + vc_grid_v1 (`js_composer_front`) | TTF | 5 KB | ~75 (incl. some non-icon pseudo rules) | **0** icon usages |
| **Total** | | **~336 KB of font files (if all loaded)** | **~3,265** | **~10 classes + 3 rule contexts** |

---

## 7. Alt-attribute inventory *(user-requested — all 40 real images, `<noscript>` twins excluded; full data `data/alt-inventory.json`)*

**Summary: present 17 · empty 20 · missing 3.** Note rows 24–26: alt "present" but the value is the filename. Rows 3–5/8–10 repeat generic "logo/dark logo/light logo".

| # | Status | Image | Alt text |
|---|---|---|---|
| 1 | empty | …/2025/11/Bricks_Logo-Revised-02-300x105.png | |
| 2 | empty | …/2025/11/MARVELLA_FINAL-LOGOs-05-300x103.png | |
| 3 | present | …/2025/11/MARVELLAFINAL-LOGOs-03.webp | logo |
| 4 | present | …/2025/11/MARVELLAFINAL-LOGOs-03.webp | dark logo |
| 5 | present | …/2025/11/MARVELLAFINAL-LOGOs-03.webp | light logo |
| 6 | **missing** | …/2025/11/rupee.png | — |
| 7 | **missing** | …/2025/11/phone.png | — |
| 8 | present | …/2025/11/bricks-ramabhupal-projects.webp | logo |
| 9 | present | …/2025/11/bricks-ramabhupal-projects.webp | dark logo |
| 10 | present | …/2025/11/bricks-ramabhupal-projects.webp | light logo |
| 11 | present | …/2025/11/marvella-flate-logo.webp | Mobile Logo |
| 12 | **missing** | revslider dummy placeholder | — |
| 13 | empty | …/2026/01/DJI_0210-600x600.webp | |
| 14 | empty | …/2026/01/DJI_0217-600x600.webp | |
| 15 | empty | …/2026/01/DJI_0272-600x600.webp | |
| 16 | empty | …/2026/01/DJI_0208-600x600.webp | |
| 17 | present | …/2023/12/Amphitheatre-1080x550.jpg | Amphitheatre |
| 18 | empty | …/2023/12/banquet-hall-1100x550.webp | |
| 19 | empty | …/2023/12/children-play-area-1100x550.webp | |
| 20 | empty | …/2023/12/Camera013-1100x550.webp | |
| 21 | empty | …/2023/12/yoga-1100x550.webp | |
| 22 | empty | …/2023/12/indoor-games-01-1100x550.webp | |
| 23 | empty | …/2023/12/yoga-01-1100x550.webp | |
| 24 | present* | …cycling-and-jogging-track-1080x550.jpg | *filename as alt* |
| 25 | present* | …Cricket-Pratice-pitch-1080x550.png | *filename as alt (typo "Bircks…Pratice" included)* |
| 26 | present* | …/2024/10/Bricks-Marvella-master-plan-2048x1252-1.jpg | Bricks Marvella master-plan-2048x1252 |
| 27–34 | **empty ×8** | all eight floor-plan images (plan-4-5-6, plan-6-7, plan-a-1-2, plan-a-8-9, plan-b-1-2, plan-b-3-4, plan-b-5-6, Plan-b-7-8) | |
| 35 | present | …/2026/06/phani-gopal-reddy-gudimetla-60x60.jpeg | Phani Gopal Reddy Gudimetla profile picture |
| 36–40 | present ×5 | Trustindex Google star SVGs | Google |

Also noteworthy: all four drone images (13–16) and the entire floor-plan set (27–34) are empty-alt; the cricket-pitch PNG is the heaviest amenity crop at 750 KB.

---

## 8. Verified asset URLs (HEAD, all 200)

- 4 drone images in three sizes each (original / `-600x600` / `-150x150`) — full-size originals 222–279 KB.
- 9 amenity `-1080x550`/`-1100x550` crops (46–750 KB) + 10 more portfolio items using full-size originals in the desktop grid's hover-image list (19 items total, titles + slugs + image URLs in the recon table, `data/` snapshots).
- Master plan 2048×1252 (294 KB) + `-1024x626` lightbox target.
- All 8 floor-plan files, exact names `plan-*-scaled-1.jpg` (note: `Plan-b-7-8-scaled-1.jpg` capital P; the non-`-scaled-1` names do **not** exist); generated sizes `-300x183 / -768x469 / -1024x626 / -1536x938`.

---

## 9. Method & reproducibility

**Snapshots (2026-09-01):** `data/snapshot-home.html` (curl, desktop Chrome UA, 307,393 B) · `data/snapshot-rendered-dom.html` (headless Chrome 152 `--dump-dom --virtual-time-budget=20000`, 351,622 B).

**Extraction:** `data/extract.js` over the 32 downloaded stylesheets + inline CSS → `colors.json`, `fontfamilies.json`, `fontfaces.json`, `roles.json`, `icon-glyphs.json`, `alt-inventory.json`; handle map from the `<link id>` attributes.

**Performance:**
1. PSI API (keyless) → **429 daily-quota** for the shared consumer project. CrUX field data therefore not retrieved (needs an API key) — this baseline is lab-only.
2. `npx lighthouse@12.8.2`, Chrome 152 headless → **403 `ERRORED_DOCUMENT_REQUEST`** from the Hostinger edge (`server: hcdn`) in *all* configurations: default UA emulation, native-UA string, and `emulatedUserAgent:false` config. The captured DevTools log shows a completely normal request header set; curl replays of the same headers (with/without client hints, with no-cache headers) all return 200, and plain headless-Chrome navigations succeed — the WAF discriminates DevTools-*instrumented* traffic by a non-header signal. Lighthouse is not runnable against this origin from this egress today.
3. **Fallback used:** `data/measure-cwv.js` — CDP via `chrome-remote-interface@0.34`, **only Page/Runtime/Emulation domains** (no Network domain), metrics from buffered PerformanceObserver entries (LCP incl. element attribution, layout-shift with standard 5 s/1 s-gap session windows, longtask) + Navigation Timing. Mobile: 412×823 @1.75 DPR, touch, `Emulation.setCPUThrottlingRate(4)`. Desktop: 1350×940 @1. Network unthrottled. Raw outputs: `cwv-mobile.json`, `cwv-desktop.json`.
4. Hero MP4 probed remotely (range requests) with the `ffprobe-static` npm binary → `mp4-probe.json`.

**To reproduce after the redesign:** re-run `node data/measure-cwv.js mobile out.json` (and `desktop`) with Chrome installed — identical harness, directly comparable numbers; re-attempt PSI with an API key for field data if desired.

---
*End of Phase 1. This report is measurement only — palette, type, motion and layout decisions belong to Phase 2 (design tokens + styleguide) after the full brief.*
