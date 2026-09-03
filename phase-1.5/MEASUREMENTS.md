# Phase 1.5 — Measurements

**Method.** Every fix was developed and verified on a DOM-identical local testbed: the audited
homepage snapshot served from localhost with `<base href="https://bricksmarvella.in/">`, so all
subresources (CSS, JS, images, third parties) load live while the HTML is editable. Measured with
the Phase 1 harness (`audit/data/measure-cwv.js`, v2: adds per-element CLS attribution; metric math
unchanged) — mobile 412×823 @1.75, 4× CPU throttle; desktop 1350×940; network unthrottled.
Calibration: testbed baseline CLS 0.915–0.923 vs live 0.927 — the testbed reproduces the live pathology.

> **Verification status.** All numbers below are for the **full package** (batch 1 + batch 2
> combined), measured before the package was split by risk. The **batch-1-only** confirmation run is
> **blocked and must be run from another machine** — see *Rate limiting* in the caveats: this
> workstation's IP is firewalled by the host (the site itself is confirmed up and serving normally
> from other networks). Two batch-1 runs that completed as the block took hold are **discarded as
> invalid** — `fcp: null`, 24 resources instead of ~130, i.e. the page never painted, so their
> "CLS 0.0000" measured nothing. A 15-minute automatic retry did not recover; further attempts were
> stopped rather than risk extending the block.
>
> What is *not* in doubt: every CLS mechanism identified below (hero reservation, shine animation,
> stylesheet ordering, pre-init collapse rules, widget boxes) is in **batch 1**. Batch 2 contains no
> CLS mechanism — reCAPTCHA delay, dequeues, font self-hosting and video facades change payload and
> main-thread time, not layout. Batch 1 is therefore expected to reproduce essentially the full
> 0.0020, but treat that as *expected* until the pending run or the production gate confirms it.

## Headline result (3-run medians, testbed)

| | CLS worst-window | Blocking after FCP | Long tasks |
|---|---|---|---|
| **Mobile baseline (v0)** | **0.9149** (runs .9149/.9149/.9211) | 8,538 ms (7,122/8,538/9,885) | 43 |
| **Mobile with package (v7)** | **0.0020** (all three runs 0.0020) | 7,360 ms (6,654/7,360/8,661) | 39 |
| **Desktop baseline** | **0.7244** | 1,103 ms | — |
| **Desktop with package** | **0.0012** | 2,715 ms¹ | — |

CLS is layout-deterministic — three identical 0.0020 readings — and clears the < 0.10 gate
(and the 0.05 stretch) by two orders of magnitude. ¹TBT on the testbed is network-noise-bound
(±1.4 s run-to-run; the desktop 2,715 is a single noisy run); the structural wins (344 KB reCAPTCHA
off the load, multiscroll gone, three editor-CSS bundles unparsed, the shine layout-thrash stopped)
are certain, but their millisecond value must come from the **live** before/after in DEPLOY step 6.

## Where the 0.92 actually was — per-item attribution

The brief assumed the 44 lazy-loaded images. Attribution measured otherwise:

| Contributor | CLS (mobile) | Mechanism | Fix |
|---|---|---|---|
| **Revolution Slider self-sizing** | **≈ 0.895** | fullscreen slider renders ~0 tall, JS sizes it seconds later, entire page shoves down | reserve the region: `min-height:100vh` on `.edgtf-slider/.edgtf-slider-inner/#rev_slider_15_1_wrapper` |
| **"shine" CTA sweep** | ≈ 0.15 accumulated (unbounded — fires every 800 ms forever) | `#wp-custom-css` animates `left` on four `::before` elements → a layout shift per loop | re-declared as compositor `transform` at `wp_head:999`; also honors `prefers-reduced-motion` |
| **Footer-stylesheet settle** | 0.011–0.18 (timing-dependent) | WP prints shortcode-enqueued CSS in the footer (revslider, vc_tta, lightbox2, vc_animate, a 2nd Google-fonts bundle); their late arrival re-metrics the page −10 px | head-hoist those handles (`wp_enqueue_style` during `wp_enqueue_scripts`); `<rs-*>` elements pre-declared `display:block` |
| **Below-fold pre-init stacks** | 0 at load, **large in field** (viewport-visible when scrolled) | drone gallery 1200→362 px, location accordions 4,514→1,307 px, Trustindex 432→220 px collapse on JS init | pre-init CSS matching the final state (hide non-first Owl slides / non-active `vc_tta` panel bodies) + measured `min-height` boxes |
| Lazy-loaded images | ≈ 0 measured | LiteSpeed placeholders were not the shifter at load | belt-and-braces anyway: LiteSpeed "Add Missing Sizes" ON (DEPLOY step 4) |
| Logo wrapper tweak | 0.0020 | mobile logo swap at ~12 s | left as-is (the entire remaining budget) |

The variant chain that got there: v0 0.923 → +hero reservation **0.068** → +transform shine **0.029**
→ +head-hoist & pre-init rules **0.002**. Every step in that chain is a batch-1 item.

### Batch split — which items move CLS

| Item | Batch | CLS mechanism? |
|---|---|---|
| Hero viewport reservation, `rs-*` display, header height | 1 | **yes — the 0.895** |
| shine `left` → `transform` | 1 | **yes — unbounded** |
| Footer stylesheets hoisted to `<head>` | 1 | **yes — the settle** |
| Pre-init collapse rules + widget min-heights | 1 | **yes — field CLS** |
| Alt text, poster preload, `fetchpriority` move, video re-encode | 1 | no (a11y / LCP / payload) |
| reCAPTCHA delay, dequeues, self-hosted fonts, icon subsets, facades | 2 | no (payload / main thread) |

## Payload deltas (exact, file-level)

| Item | Before | After | Saving |
|---|---|---|---|
| Hero video | 115,297 KB — H.264 Main 32.6 Mbps **+ 317 kbps audio on a muted hero** | **4,605 KB** H.264 High two-pass 1.25 Mbps, no audio (+ 3,965 KB VP9 WebM alternate) | **−96%** |
| Text fonts | 532 KB gstatic TTF (19 files; incl. Abril Fatface for a `display:none` h1) | **199 KB** self-hosted variable WOFF2 (4 files, preloaded) | −63%, −15 requests |
| Icon fonts | ~336 KB defined / ~134 KB practically fetched across 9 families | **4.3 KB** (6 subset files covering every referenced glyph) | −97% |
| reCAPTCHA | 344 KB on page load | loads on first interaction (LiteSpeed JS-delay) | main-thread off critical path |
| CSS files | 32 (incl. wp-components/block-editor/preferences + 3 zero-use icon families) | 26 head-ordered | −6 requests, ~heavy parse skipped |
| Scripts | multiscroll dequeued | | |
| YouTube ×3 | lazy iframes (player ~1 MB+ each when near viewport) | click-to-load facades, layout box preserved | loads only on intent |

Poster: `hero-poster.webp` 207 KB 1920×1080 (from the lakeside twin-towers frame), preloaded with
`fetchpriority=high`; the misassigned `fetchpriority` on the below-fold drone thumb is stripped.

## Regression evidence

- Full-page screenshots v3 vs v4 removals: byte-identical page height (26,476 px), SSIM 0.984
  (residual = auto-playing carousel frames).
- CDP exception monitor: no new errors from any shipped change. It also caught two things:
  `.niceScroll()` is called unconditionally by the theme → **nicescroll must stay** (deferred to
  Phase 4 §4.6); and a **pre-existing** live bug: `downloadBrochure is not defined`.
- Contact form, lightboxes, menu icons, phone CTAs: selectors untouched; menu/close icons ship in
  the ElegantIcons subset; prettyPhoto keeps Ionicons (loads only when a lightbox opens).

## Caveats

- Testbed TBT/FCP carry localhost + live-network variance; CLS is the deterministic metric here.
  The deploy-gate numbers (DEPLOY step 6) are the authoritative before/after.
- Network is unthrottled in the harness (Phase 1 method note stands): real Indian mobile networks
  will show larger absolute gains from the video/font/JS cuts than the testbed can express.
- PSI API remains keyless-quota-blocked (retried 2026-09-01: 429). With a PageSpeed API key, CrUX
  field data becomes available — the number that ultimately matters (§2.4 of the brief). When the
  key arrives it will be read from an environment variable / gitignored file, never committed or
  echoed into a report, and cross-checked against the free CrUX API directly; if the origin has
  insufficient traffic for a CrUX record, that will be stated plainly rather than partially reported.
- **Rate limiting is a real constraint on this workflow — with a confirmed diagnosis.** After several
  dozen harness runs, `bricksmarvella.in` became wholly unreachable from this workstation: TCP 443
  and 80 both time out, on both origin IPs and on `www.`, while DNS resolves and the rest of the
  internet is fine. The site is **not** down — an independent proxy (`r.jina.ai`) fetched the
  homepage successfully (HTTP 200, correct title and content) during the outage window, so this is
  an IP-level block by the host/CDN against this workstation, not an incident.
  Consequences: (1) the deploy-gate runs in DEPLOY 1.4 must come from a machine that is not blocked —
  yours is unaffected; (2) space runs out and avoid long back-to-back batteries against production;
  (3) **validate every run before believing it** — `fcp: null` with ~24 resources means the page never
  painted, and a suspiciously perfect CLS is the signature of exactly that failure, appearing precisely
  where a good result is expected and least likely to be questioned.
  If you want measurement to resume from here, whitelisting this workstation's IP in hPanel
  (Security → or the LiteSpeed/CDN firewall) would clear it; otherwise the block should age out.
