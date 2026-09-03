# Step 1 — Asset acquisition & conversion

Reproduce with `node scripts/fetch-assets.mjs` (images) and `node scripts/scrape-content.mjs` (copy).
Per-file detail: `scripts/asset-report.json`.

## Result

**36/36 image assets fetched, 0 failures, 198 output files, 13.63 MB total** (AVIF + WebP at three
widths each). No stock or generated imagery — every file originates from the existing site.

| Group | Assets | Files | Size | Native source |
|---|---|---|---|---|
| Drone (hero + cube) | 4 | 24 | 2.56 MB | 1600×1200 |
| Amenities | 19 | 106 | 5.11 MB | 1000×563 – 2000×1333 |
| Plans (master + 8 floor) | 9 | 54 | 5.86 MB | 2048×1252 · 2560×1565 |
| Logos | 4 | 14 | 0.09 MB | 300×105 – 1420×1014 |

Largest single files: `master-plan-2048.webp` 275 KB, `dji_0272-1600.webp` 251 KB.

## Hero video — before / after

Carried over from the Phase 1.5 work; the encode is unchanged and already meets the §3 target.

| | Before | After |
|---|---|---|
| H.264 | 115,297 KB · 1920×1080 · Main · **32.64 Mbps** · **+317 kbps AAC** | **4,605 KB** · High profile · two-pass 1.25 Mbps · **no audio track** |
| WebM alternate | — | **3,965 KB** VP9 |
| Poster | none (RevSlider + LiteSpeed both lazy-loaded it, so no hero image was ever LCP-eligible) | **207 KB** `hero-poster.webp` 1920×1080 |

**−96%.** Files are in `phase-1.5/media/`; they move into `/public/videos/` when the Hero component
lands. AV1 not produced — the local ffmpeg build has no SVT-AV1 encoder. Say the word and I'll add one.

## The proxy route, and a trap inside it

This workstation's IP is still firewalled by the origin host (see `phase-1.5/MEASUREMENTS.md` — the
site itself is up and serving normally to everyone else). Assets therefore come through **wsrv.nl**,
requested as lossless PNG so the only encode is the local sharp pass; text comes through the
**r.jina.ai** reader proxy. Byte-passthrough proxies (allorigins, codetabs) return 522.

The trap, found by checking rather than trusting: **wsrv silently caps output at 1600 px**, and an
explicit `w` *above* the source silently **upscales** — its "without enlargement" flag clamps to the
same cap, so it cannot be used to discover native size either. The first run therefore produced
**floor plans at 1600×978 instead of 2560×1565**, which for architectural drawings is the difference
between legible and not. Re-fetched at true native; a crop now reads "M.BED ROOM 15'-1" × 12'-3"".

Consequently the script sets an explicit width **only** for sources known to exceed 1600 px (the
plans, whose dimensions the Phase 1 audit recorded). Everything else omits it and takes
min(native, 1600), which can never upscale. Drone images were confirmed native at 1600×1200 by
round-trip: fetching at 2400 and downscaling back gave identical sharpness (38.27 vs 38.08).

Amenities are emitted at ≤1400 px against natives of 1000–2000 px. That is deliberate — drum panels
render far smaller — and is one array change if a full-bleed amenity view is ever specced.

## Grading

One conservative treatment across the render set so the images read as a single campaign
(saturation ×0.92, contrast ×1.06, slight warm tint). **Plans and logos are exempt** — legibility
and brand fidelity beat consistency there.

## Text content

All 20 pages captured to `.content-cache/` (19 amenity pages + `/project-status/`); the homepage was
read from the byte-exact Phase 1 snapshot rather than the network. Extracted into `lib/content.ts`
as typed exports, structured so a CMS can replace the module without touching a component.

Verbatim legal copy recovered and locked into `lib/content.ts`:
- **TG RERA No** `P01100007008`
- **Building Permission No** `047316/SKP/R1/U6/HMDA/17072021`
- Consent: *"I authorise Bricks InfraTech & its representatives to contact me with updates and notifications via Email/SMS/WhatsApp/Call. This will override DND/NDNC."*
- Disclaimer: *"The images provided are for representation purposes only. Actual images may differ."*
- The four enquiry price options, exactly as the old dropdown listed them.

## Two content problems that need your decision

**1. The phone numbers on the old site disagree with each other.** Four distinct numbers are in play:

| Where | Number |
|---|---|
| `tel:` links (header "Call Now", contact block) | **7288050607**, **7799774959** |
| Printed in the footer, not linked | **+91 72880 20304**, **+91 72880 30405** |
| Injected by CSS on the sticky call button | +91 7288020304 |

So the number a visitor *reads* is not the number they *dial*. I have recorded all of them in
`contact.needsClientConfirmation` and guessed at nothing. Tell me which are current before launch.

**2. The 19 amenity pages contain no amenity copy.** Each `/portfolio-item/<slug>/` page is a title,
one image, and the same shared boilerplate — there is no per-amenity description to port. Since §8
requires preserving all 19 URLs, they need *something*. Options: write short descriptions (you or
your copywriter — I won't invent facts about the property), or keep them as thin
image-plus-title pages that preserve the URL. Flagging rather than choosing.

Also noted: `/project-status/` has 20 date sections (July 2026 → October 2023) referencing **126
images**. Those are not in this batch; they get fetched when that page is built (sequence step 4).
