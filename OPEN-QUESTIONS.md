# OPEN-QUESTIONS.md

Ordered by what blocks launch. Each says what I did in the meantime, so nothing
is waiting on you to keep moving.

---

## Blocking launch

### 1. Where do leads go? *(the whole business case)*
No destination is configured, so **submissions are logged to the server console
and delivered nowhere**. Everything around it is finished: client + server
validation, error and success states, the consent checkbox, the API route.

Wiring is one change — set `LEAD_WEBHOOK_URL`, or replace `getLeadAdapter()` in
`lib/leads.ts` (an email adapter is ~10 lines with Resend/SendGrid). Then send a
real test enquiry and confirm it arrives; the brief rightly calls this the
acceptance criterion that matters most.

**I need:** the destination (inbox, CRM webhook, or sheet) and credentials.

### 2. Which phone numbers are current?
Placeholders are in place, derived from one constant so the printed and dialled
numbers cannot diverge. The old site disagreed with itself four ways.

Evidence gathered: the homepage's own contact block *prints* `+91 7288050607`
and `+91 7799774959`, and its `tel:` links dial exactly those two. The
`+91 72880 20304 / 30405` pair appears only in the amenity-page footer, and a
fourth number only in a CSS rule.

**I need:** confirm those two, or give me the right ones. One line in
`lib/content.ts`.

### 3. Which address is the site office?
Two exist on the old site, with different street lines *and* different PINs:
- `Sy No.407/A/1, 100ft Road, Tellapur, Telangana - 502032` (homepage — currently used)
- `100ft Road, Tellapur-Osman Nagar Rd, Tellapur, Hyderabad, Telangana 500019` (amenity footer)

---

## Needs your judgement, not blocking

### 4. Amenity categories for the pill filters
The source had one category for all 19, so the four groups are mine —
Sport & Play (9) · Wellness (4) · Leisure (3) · Community (3). Full mapping in
DECISIONS #3. Two calls worth checking: "Gym" and "Gymnasium and Spa" are
separate source entries and both went to Wellness; "Guest Rooms" went to
Community. Correcting any of them is one field per amenity.

### 5. Mobile Lighthouse is 53–63, not 90
Desktop is 98. The gap is entirely LCP (6.4 s) under Lighthouse's simulated
4× CPU + slow 4G — the filmstrip shows the hero painted at ~2.4 s and every
network dependency is fast. It is main-thread cost from hydrating a 33,000px
page with fifteen animated sections.

Closing it means a design trade-off I would not make without you:
- **(a)** ship the heavy sections as server components and attach motion only on
  interaction — biggest win, some motion becomes on-demand;
- **(b)** drop Lenis and several ScrollTriggers below 768px — mobile keeps the
  layout, loses most scroll-linked motion;
- **(c)** split the page into routes — best scores, changes the single-scroll
  narrative you asked for.

My recommendation is **(b)**: mobile users get a fast, complete, readable site;
desktop keeps the full piece.

### 6. Amenity page copy
19 pages are live at their original URLs rendering title + image + boilerplate,
exactly as before. The `description` field is wired and empty — drop text in
`lib/content.ts` and it renders, no component change.

### 7. Safari check on the master-plan expansion
The circle → full-bleed mask uses `inset()` throughout specifically to avoid the
`circle()`↔`inset()` interpolation problem that affects both engines. It is
verified in Chrome; there is no Apple device here. Worth ten seconds on a Mac
or iPhone before launch.

### 8. Source facts that contradict each other
Not reconciled, because they are your words on your site:
- Homepage says **4.5 acres**; the blog says **4.25-acre expanse**.
- Homepage About says **82% open space**; the stat band and blog say **75%**.
- The blog alone mentions a 5-level clubhouse, a 60-foot gap between towers, and
  a three-tier security system.

### 9. Analytics and the Meta pixel
Nothing is installed. The old site loaded gtag (`AW-639905625`, `DC-14767699`),
a Meta pixel and Microsoft Clarity via GTM. Tell me which carry over and I'll
add them behind an interaction/idle trigger so they stay off the critical path.

### 10. Staging and cutover
Ready to deploy to Vercel. The plan of record is a staged subdomain first, then
the apex once the crawl diff is confirmed against the live origin (it currently
runs against the local build). Say the word and I'll prepare the deploy.
