# Alt text — all 40 homepage images

Paste each string into the image's **Alternative Text** field in the Media Library. That is the
permanent fix: it repairs alt sitewide and survives theme changes. `bm-core.php` applies the same
strings at render as a safety net, and never overwrites alt text a person has written.

Baseline (audit): 17 present · 20 empty · 3 missing — and three of the "present" values were the
filename, including the `Bircks…Pratice` typo.

**Empty alt is deliberate for decorative images.** A screen reader should skip a rupee glyph beside
a "Request Price" button, not announce it. Empty ≠ missing: the attribute must exist.

## Brand marks

| Image | Alt text |
|---|---|
| `Bricks_Logo-Revised-02-300x105.png` | Bricks Ramabhupal Projects |
| `MARVELLA_FINAL-LOGOs-05-300x103.png` | Bricks Marvella |
| `MARVELLAFINAL-LOGOs-03.webp` (×3 — light/dark/default) | Bricks Marvella |
| `bricks-ramabhupal-projects.webp` (×3) | Bricks Ramabhupal Projects |
| `marvella-flate-logo.webp` | Bricks Marvella |

## Decorative — empty alt (`alt=""`)

| Image | Alt text |
|---|---|
| `rupee.png` | *(empty)* |
| `phone.png` | *(empty)* |
| Slider Revolution placeholder `dummy.png` | *(empty)* |

## Aerial / drone

| Image | Alt text |
|---|---|
| `DJI_0210` | Aerial view of the Bricks Marvella towers beside the lake at Tellapur |
| `DJI_0217` | Aerial view of Bricks Marvella against the Tellapur skyline |
| `DJI_0272` | Aerial view of Bricks Marvella looking towards the Financial District |
| `DJI_0208` | Aerial view of the landscaped open space around Bricks Marvella |

## Amenities

| Image | Alt text |
|---|---|
| `Amphitheatre-1080x550.jpg` | Open-air amphitheatre at the Bricks Marvella clubhouse |
| `banquet-hall-1100x550.webp` | Banquet hall at the Bricks Marvella clubhouse |
| `children-play-area-1100x550.webp` | Children's play area at Bricks Marvella |
| `Camera013-1100x550.webp` | Basketball court at Bricks Marvella |
| `yoga-1100x550.webp` | Meditation and yoga centre at Bricks Marvella |
| `indoor-games-01-1100x550.webp` | Indoor games room at the Bricks Marvella clubhouse |
| `yoga-01-1100x550.webp` | Gymnasium and spa at Bricks Marvella |
| `bricks-marvellas-amenities-cycling-and-jogging-track-1080x550.jpg` | Cycling and jogging track through the Bricks Marvella grounds |
| `Bircks-Marvella-Amenities-Cricket-Pratice-pitch-1080x550.png` | Cricket practice pitch at Bricks Marvella |

The ten remaining amenities (swimming pool, skating rink, badminton, tennis, guest rooms, gym,
movie theater, pool table, squash, table tennis) render as **CSS background images** in the desktop
grid, so they take no alt attribute. Their names are already exposed as `<h3>` text — correct as-is.
The Phase 3 drum converts them to real `<img>`/`<a>` elements, at which point they need alt text too;
the strings will follow the same pattern.

## Plans

| Image | Alt text |
|---|---|
| `Bricks-Marvella-master-plan-2048x1252-1.jpg` | Bricks Marvella master plan: two towers, clubhouse and landscaped open space across 4.5 acres |
| `plan-a-1-2-scaled-1.jpg` | Bricks Marvella Tower A floor plan, sheet 1-2 |
| `plan-4-5-6-scaled-1.jpg` | Bricks Marvella Tower A floor plan, sheet 4-5-6 |
| `plan-6-7-scaled-1.jpg` | Bricks Marvella Tower A floor plan, sheet 6-7 |
| `plan-a-8-9-scaled-1.jpg` | Bricks Marvella Tower A floor plan, sheet 8-9 |
| `plan-b-1-2-scaled-1.jpg` | Bricks Marvella Tower B floor plan, sheet 1-2 |
| `plan-b-3-4-scaled-1.jpg` | Bricks Marvella Tower B floor plan, sheet 3-4 |
| `plan-b-5-6-scaled-1.jpg` | Bricks Marvella Tower B floor plan, sheet 5-6 |
| `Plan-b-7-8-scaled-1.jpg` | Bricks Marvella Tower B floor plan, sheet 7-8 |

> **Confirm the plan wording.** "Sheet 4-5-6" is derived from the filename only — nothing on the page
> says whether those digits are unit numbers, floor ranges, or drawing sheets. Tell me which and I
> will revise both this list and the PHP map. Better alt would name the configuration
> (e.g. "Tower A, 3 BHK, 1,850 sft") if you have that mapping.

## Third-party (not editable here)

`phani-gopal-reddy-gudimetla-60x60.jpeg` already reads "Phani Gopal Reddy Gudimetla profile picture",
and the five Google star SVGs read "Google" — both are rendered by the Trustindex widget from its own
CDN, so they are outside the theme's control.
