/**
 * All site copy and data. Components import from here and hardcode nothing.
 *
 * Sourced from the live site: the Phase 1 rendered-DOM snapshot for the
 * homepage, and the r.jina.ai reader proxy for /project-status/, the 19
 * /portfolio-item/ pages, /privacy-policy/ and the blog (this workstation is
 * firewalled by the origin). Raw captures live in .content-cache/.
 *
 * Shape note: every export is a plain typed object so a CMS can replace this
 * module later without touching a single component ("in-repo now, headless
 * later"). Keep the types; swap the source.
 */

import blogPostsJson from './blog-posts.json';

/* ============================ TYPES ============================ */

export type AmenityCategory = 'Sport & Play' | 'Wellness' | 'Leisure' | 'Community';

export interface Amenity {
  slug: string;
  title: string;
  /** /public stem — `-1400`, `-900`, `-560` variants exist in .avif and .webp */
  image: string;
  alt: string;
  category: AmenityCategory;
  /** Shown under the carousel title only where the name isn't self-evident. */
  descriptor?: string;
  /** Body copy for the amenity page. Empty until the client supplies it. */
  description?: string;
}

export interface FloorPlan {
  id: string;
  tower: 'A' | 'B';
  units: string;
  label: string;
  image: string;
  alt: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface SpecGroup {
  title: string;
  body: string;
}

export interface LocationCard {
  title: string;
  image: string;
  alt: string;
  items: string[];
  /** Only where bricksmarvella.in states one. Most categories have none. */
  time?: string;
}

/* ============================ SITE ============================ */

export const site = {
  name: 'Bricks Marvella',
  developer: 'Bricks Ramabhupal Projects LLP',
  group: 'Bricks Infra Group',
  url: 'https://bricksmarvella.in',
  meta: {
    title: 'Luxury 2, 3 & 4 BHK Flats for sale in Tellapur, Hyderabad | Bricks Marvella',
    description:
      'Explore luxury 2, 3 & 4 BHK flats for sale in Tellapur, Hyderabad at Bricks Marvella. Premium living with top-notch amenities.',
  },
} as const;

/** VERBATIM legal copy. Do not reword, abbreviate, or "improve" any of this. */
export const legal = {
  rera: 'P01100007008',
  reraLabel: 'TG RERA No',
  reraUrl: 'https://rera.telangana.gov.in/',
  buildingPermission: '047316/SKP/R1/U6/HMDA/17072021',
  buildingPermissionLabel: 'Building Permission No',
  imageDisclaimer: 'The images provided are for representation purposes only. Actual images may differ.',
  formConsent:
    'I authorise Bricks InfraTech & its representatives to contact me with updates and notifications via Email/SMS/WhatsApp/Call. This will override DND/NDNC.',
} as const;

/* ============================ PHONE — SINGLE SOURCE ============================
 * The old site is internally inconsistent: the numbers it PRINTS in the footer
 * are not the numbers it DIALS, and a fourth is injected by CSS. That is a live
 * lead-loss bug and it is NOT carried forward.
 *
 * ONE placeholder constant is the only phone value in the codebase; `telHref`
 * and `display` are both derived from it so they can never drift apart again.
 * See DECISIONS.md — the contact section and the tel: hrefs agree on these two
 * numbers, which is the strongest evidence available, but the client confirms.
 *
 * TODO(client): confirm `primaryE164` / `secondaryE164`, then set unconfirmed:false.
 * ============================================================================ */
const PHONE_PRIMARY_E164 = '+917288050607';
const PHONE_SECONDARY_E164 = '+917799774959';

function formatIndianPhone(e164: string): string {
  const m = e164.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

function makePhone(e164: string) {
  return { e164, telHref: `tel:${e164}`, display: formatIndianPhone(e164) };
}

export const phone = {
  primary: makePhone(PHONE_PRIMARY_E164),
  secondary: makePhone(PHONE_SECONDARY_E164),
  unconfirmed: true,
} as const;

export const contact = {
  email: 'sales@bricksinfratech.com',
  /** From the homepage contact block. A second, different address appears in the
   *  amenity-page footer — see DECISIONS.md. */
  address: 'Sy No.407/A/1, 100ft Road, Tellapur, Telangana - 502032',
  addressAlt: '100ft Road, Tellapur-Osman Nagar Rd, Tellapur, Hyderabad, Telangana 500019',
  heading: 'CONTACT US/FIND OUR OFFICE',
  mapEmbed:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5689.496131789392!2d78.27982957516636!3d17.44949538344835!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcbed4430a1d4e3%3A0x54d1ef53678f9fd8!2sMarvella%20by%20Bricks%20Infratech!5e1!3m2!1sen!2sin!4v1728453596397!5m2!1sen!2sin',
} as const;

/* ============================ HERO / STATS ============================ */

export const hero = {
  wordmark: 'Bricks Marvella',
  headlineLines: [
    { text: 'Luxury 2, 3 & 4 BHK', italic: false },
    { text: 'apartments in Tellapur', italic: true },
  ],
  sub: 'Two towers, thirty-two floors, four and a half acres by the lake — minutes from the Financial District.',
  /** The old site's visible slider text. */
  sliderText: 'Experience 360° Views',
  legacyHeading: 'EXPERIENCE PERFECT LIFE',
} as const;

export const stats: Stat[] = [
  { value: '2, 2.5, 3 & 4 BHK', label: 'Luxury Apartments' },
  { value: '42,000 sft', label: 'Club House' },
  { value: '32', label: 'Floors' },
  { value: '1385 - 3570 sft', label: 'Unit Sizes' },
  { value: '2', label: 'Towers' },
  { value: '4.5 Acres', label: '75% Open Space' },
];

export const statsHeading = 'All Ingredients For A Perfect Lifestyle';

/** Price points already public on the old site's enquiry dropdown. */
export const priceOptions = [
  '3 BHK - 1795 sqft starting from 1.55 Cr',
  '3 BHK - 2100 sqft starting from 1.77 Cr',
  '3 BHK - 2470 sqft starting from 2.04 Cr',
  '4 BHK - 3570 sqft starting from 2.88 Cr',
] as const;

/* ============================ ABOUT / LOCATION ============================ */

export const about = {
  heading: 'About Project',
  body:
    'Presenting Bricks Marvella, 2, 3 & 4 BHK luxury apartments in Tellapur set beside a picturesque lake. ' +
    'Experience an elevated lifestyle close to the Financial District and Gachibowli, thoughtfully priced to suit your budget. ' +
    'Spread across 4.5 acres, this elegant residential community is designed to feel open and welcoming, with 82% of the space ' +
    'dedicated to green landscapes, open areas, and curated amenities. Complementing the outer volumes, the interior spaces have ' +
    'been intelligently designed for maximum utilisation life, space, and amenities. Finally, here you have a Home that checks all the boxes!',
  pullQuote: 'A Home that checks all the boxes',
  videoId: 'cnJTa4cEjAA',
  videoTitle: 'Presenting Marvella by Bricks Ramabhupal Projects | Premium High-Rise Residence | Tellapur',
} as const;

export const tellapur = {
  heading: 'TELLAPUR, The Future Is Here!',
  tagline: 'Right at the Heart of Growth, but a world away',
  body:
    'Marvella is nestled in the rapidly growing western part of Hyderabad. With the presence of the IT scene in HITEC City to the ' +
    'vibrant social hotspots of Jubilee hills, Tellapur is well-placed and well-connected to the rest Hyderabad, with the Financial ' +
    'District just a short drive away! Be it educational institutes, work spaces, healthcare facilities and places of entertainment, ' +
    'your neighbourhood has everything you need.',
} as const;

export const locationCards: LocationCard[] = [
  {
    title: 'Offices',
    /* The only travel time published anywhere on the site: the Tellapur blog
       post states 'less than 15-20 minutes' to Gachibowli, HITEC City, Kokapet
       and the Financial District — which is what this list is. No other
       category has a stated time, so no other category shows one. */
    time: '15-20 min',
    image: '/images/location/offices',
    alt: 'Office towers in the Financial District near Bricks Marvella, Tellapur',
    items: ['ICAI', 'Polaris', 'UBS', 'Wipro', 'ICICI – Financial Dist', 'TCS', 'Microsoft', 'Amazon',
      'Honeywell', 'Infosys', 'Google', 'Waverock', 'Accenture', 'Cognizant India'],
  },
  {
    title: 'Schools & Institutions',
    image: '/images/location/schools',
    alt: 'A school campus in the neighbourhood surrounding Bricks Marvella',
    items: ['The Gaudium School', 'Manthan School', 'Indus International School', 'St. Xavier’s PG College',
      'Sancta Maria School', 'Epistemo Global', 'Vista School', 'TIFR', 'ISB', 'Kendriya Vidyalaya',
      'Oakridge International School', 'Delhi Public School'],
  },
  {
    title: 'Hospitals',
    image: '/images/location/hospitals',
    alt: 'A hospital near Bricks Marvella in Tellapur, Hyderabad',
    items: ['Kakatiya Hospital', 'Srija Hospital', 'American Oncology Institute', 'Citizen’s Hospital',
      'Pranaam Wellness Center', 'PRK Hospitals', 'Continental Hospital', 'CARE Super Speciality Hospital'],
  },
  {
    title: 'Recreation',
    image: '/images/location/recreation',
    alt: 'Hotels and shopping close to Bricks Marvella',
    items: ['Hyatt Hyderabad (Star Hotel)', 'Ella Suites (Star Hotel)', 'NIAB', 'Inorbit Mall'],
  },
];

export const reflectionOfMastery = {
  heading: 'Reflection of Mastery !',
} as const;

export const cityViews = {
  heading: ['Immerse yourself', 'in the city views'],
  sub: 'Indulge in breathtaking urban panoramas from your safe havens.',
} as const;

/** Cube faces. Captions state only what the source content claims. */
export const droneFaces = [
  { image: '/images/drone/dji_0210', caption: 'Lakeside', alt: 'Aerial view of the Bricks Marvella towers beside the lake at Tellapur' },
  { image: '/images/drone/dji_0217', caption: '360° Open Views', alt: 'Aerial view of Bricks Marvella against the Tellapur skyline' },
  { image: '/images/drone/dji_0272', caption: 'Minutes from the Financial District', alt: 'Aerial view of Bricks Marvella looking towards the Financial District' },
  { image: '/images/drone/dji_0208', caption: '75% Open Space', alt: 'Aerial view of the landscaped open space around Bricks Marvella' },
] as const;

/* ============================ AMENITIES ============================
 * Categories are OUR mapping, not the source's — the old site had a single
 * "Club House" category for all 19. Recorded in DECISIONS.md for correction.
 * ==================================================================== */

export const amenityCategories: AmenityCategory[] = ['Sport & Play', 'Wellness', 'Leisure', 'Community'];

export const amenities: Amenity[] = [
  { slug: 'amphitheatre', title: 'Amphitheatre', image: '/images/amenities/amphitheatre', category: 'Community', alt: 'Open-air amphitheatre at the Bricks Marvella clubhouse' },
  { slug: 'banquet-hall', title: 'Banquet Hall', image: '/images/amenities/banquet-hall', category: 'Community', alt: 'Banquet hall at the Bricks Marvella clubhouse' },
  { slug: 'childrens-play-area', title: "Children's Play Area", image: '/images/amenities/childrens-play-area', category: 'Sport & Play', alt: "Children's play area at Bricks Marvella" },
  { slug: 'basket-ball-court', title: 'Basketball Court', image: '/images/amenities/basket-ball-court', category: 'Sport & Play', alt: 'Basketball court at Bricks Marvella', descriptor: 'Full-size outdoor court' },
  { slug: 'meditation-and-yoga-center', title: 'Meditation & Yoga Centre', image: '/images/amenities/meditation-and-yoga-center', category: 'Wellness', alt: 'Meditation and yoga centre at Bricks Marvella' },
  { slug: 'indoor-games', title: 'Indoor Games', image: '/images/amenities/indoor-games', category: 'Leisure', alt: 'Indoor games room at the Bricks Marvella clubhouse' },
  { slug: 'gymnasium-and-spa', title: 'Gymnasium and Spa', image: '/images/amenities/gymnasium-and-spa', category: 'Wellness', alt: 'Gymnasium and spa at Bricks Marvella', descriptor: 'Within the 42,000 sft clubhouse' },
  { slug: 'cycling-and-jogging-track', title: 'Cycling and Jogging Track', image: '/images/amenities/cycling-and-jogging-track', category: 'Sport & Play', alt: 'Cycling and jogging track through the Bricks Marvella grounds' },
  { slug: 'cricket-practice-pitch', title: 'Cricket Practice Pitch', image: '/images/amenities/cricket-practice-pitch', category: 'Sport & Play', alt: 'Cricket practice pitch at Bricks Marvella' },
  { slug: 'swimming-pool', title: 'Swimming Pool', image: '/images/amenities/swimming-pool', category: 'Wellness', alt: 'Swimming pool at Bricks Marvella' },
  { slug: 'skating-rink', title: 'Skating Rink', image: '/images/amenities/skating-rink', category: 'Sport & Play', alt: 'Skating rink at Bricks Marvella' },
  { slug: 'badminton-court', title: 'Badminton Court', image: '/images/amenities/badminton-court', category: 'Sport & Play', alt: 'Badminton court at Bricks Marvella' },
  { slug: 'tennis-court', title: 'Tennis Court', image: '/images/amenities/tennis-court', category: 'Sport & Play', alt: 'Tennis court at Bricks Marvella' },
  { slug: 'guest-rooms', title: 'Guest Rooms', image: '/images/amenities/guest-rooms', category: 'Community', alt: 'Guest room at Bricks Marvella' },
  { slug: 'gym', title: 'Gym', image: '/images/amenities/gym', category: 'Wellness', alt: 'Gym at Bricks Marvella' },
  { slug: 'movie-theater', title: 'Movie Theater', image: '/images/amenities/movie-theater', category: 'Leisure', alt: 'Private movie theatre at Bricks Marvella' },
  { slug: 'pool-table', title: 'Pool Table', image: '/images/amenities/pool-table', category: 'Leisure', alt: 'Pool table in the Bricks Marvella games room' },
  { slug: 'squash-court', title: 'Squash Court', image: '/images/amenities/squash-court', category: 'Sport & Play', alt: 'Squash court at Bricks Marvella' },
  { slug: 'table-tennis', title: 'Table Tennis', image: '/images/amenities/table-tennis', category: 'Sport & Play', alt: 'Table tennis at Bricks Marvella' },
];

/* ============================ PLANS ============================ */

export const masterPlan = {
  heading: 'Master Plan',
  image: '/plans/master-plan',
  alt: 'Bricks Marvella master plan: two towers, clubhouse and landscaped open space across 4.5 acres',
} as const;

export const floorPlans: FloorPlan[] = [
  { id: 'a-1-2', tower: 'A', units: '1, 2', label: 'Tower A — units 1 and 2', image: '/plans/tower-a-1-2', alt: 'Bricks Marvella Tower A floor plan for units 1 and 2' },
  { id: 'a-4-5-6', tower: 'A', units: '4, 5, 6', label: 'Tower A — units 4, 5 and 6', image: '/plans/tower-a-4-5-6', alt: 'Bricks Marvella Tower A floor plan for units 4, 5 and 6' },
  { id: 'a-6-7', tower: 'A', units: '6, 7', label: 'Tower A — units 6 and 7', image: '/plans/tower-a-6-7', alt: 'Bricks Marvella Tower A floor plan for units 6 and 7' },
  { id: 'a-8-9', tower: 'A', units: '8, 9', label: 'Tower A — units 8 and 9', image: '/plans/tower-a-8-9', alt: 'Bricks Marvella Tower A floor plan for units 8 and 9' },
  { id: 'b-1-2', tower: 'B', units: '1, 2', label: 'Tower B — units 1 and 2', image: '/plans/tower-b-1-2', alt: 'Bricks Marvella Tower B floor plan for units 1 and 2' },
  { id: 'b-3-4', tower: 'B', units: '3, 4', label: 'Tower B — units 3 and 4', image: '/plans/tower-b-3-4', alt: 'Bricks Marvella Tower B floor plan for units 3 and 4' },
  { id: 'b-5-6', tower: 'B', units: '5, 6', label: 'Tower B — units 5 and 6', image: '/plans/tower-b-5-6', alt: 'Bricks Marvella Tower B floor plan for units 5 and 6' },
  { id: 'b-7-8', tower: 'B', units: '7, 8', label: 'Tower B — units 7 and 8', image: '/plans/tower-b-7-8', alt: 'Bricks Marvella Tower B floor plan for units 7 and 8' },
];

/* ============================ SPECIFICATIONS ============================
 * All 21 groups, verbatim from the source accordion.
 * ======================================================================= */

export const specificationsHeading = 'General Specifications';

export const specifications: SpecGroup[] = [
  { title: 'Doors', body: 'Main Door: Manufactured Teak veneered door frame and shutter finished with Good Quality of Melamine Polish and Hardware of Reputed Make. Internal Doors: Manufactured Hardwood Door Frame & Laminate Shutter and Hardware of Reputed Make.' },
  { title: 'Utility Door', body: 'UPVC Door Frame of Reputed profile sections with a combination of float Glass and Laminated MDF panel.' },
  { title: 'French Door', body: 'UPVC Door frame of Reputed profile sections, with float Glass Panelled Shutters and Designer Hardware of reputed, made with provision for Mosquito mesh track.' },
  { title: 'Windows', body: 'UPVC Window of Reputed Profile Sections with float Glass with Suitable Finishes as per Design with provision for mosquito mesh track. (Provision of track for mosquito mesh will be as per Window type and Feasibility. Mosquito Mesh* & Installation for windows and french doors shall be at Extra Cost).' },
  { title: 'Grills', body: 'Aesthetically designed, M.S. grills with Enamel paint finish (shall be provided at extra cost).' },
  { title: 'Internet / Cable TV', body: 'Provision for internet connection in each flat. Telephone provision in MBR & Drawing area TV provision in Master Bedroom, Drawing room. LIFTS: High speed automatic passenger lifts with rescue device with V3F for energy efficiency of reputed make, Entrance with Granite/Tile cladding. SECURITY / BMS: Solar Powered Security Fence around the Compound wall. Sophisticated round-the-clock Security/Surveillance system.' },
  { title: 'Kitchen', body: 'Granite platform* with Stainless Steel Sink*, CP fiitings with height ceramic Tile Dado* over Granite countertop (items mentioned here are optional at extra cost to customers). Provision for fixing of Water purifier, Exhaust Fan/Chimney Separate Municipal water tap (Manjeera or any other water provided by GHMC along with Borewell water). Provision for Washing machine in the utility area' },
  { title: 'Flooring', body: 'Living, Dining, Master Bedroom and Other Bedrooms, Kitchen areas: 800X800 mm size Double charged Vitrified tiles of Reputed make. Balcony: Rustic Ceramic Tiles of Reputed make' },
  { title: 'Utility', body: 'Anti-Skid Ceramic tile of Reputed make' },
  { title: 'Corridors', body: 'Vitrified tiles of Reputed make' },
  { title: 'Dadoing', body: 'All Toilets Glazed/Matt finish Ceramic tiles up to 7′ – 0″ height of Reputed Brand.' },
  { title: 'WTP & STP', body: 'Domestic water made available through an exclusive water softening plant (Not RO plant) A Sewage Treatment plant of adequate capacity as per norms will be provided inside the project, treated sewage water will be used for the landscaping and flushing purpose.' },
  { title: 'Electrical', body: 'Power plug for cooking range chimney, refrigerator, microwave ovens, mixer / grinders in kitchen, Washing machine in Utility Area. Power plug for geysers in all bathrooms. 3 phase supply for each unit and individual Meter Box. Miniature Circuit breakers (MCB) for each distribution board of reputed make. Elegant Modular Electrical switches of Reputed make. Power outlets for Air Conditioners in Living and All Bedrooms.' },
  { title: 'Generator', body: '100% D.G set backup with acoustic enclosure & A.M.F' },
  { title: 'Painting', body: 'Internal Smooth putty finish with 2 Coats of Premium Acrylic Emulsion Paint of Reputed make over a Coat of Primer.' },
  { title: 'External', body: 'Textured finish and Two coats of Exterior Emulsion paint of Reputed make.' },
  { title: 'Bathrooms', body: 'Wash basin / Counter Top. EWC with concealed flush tank of Reputed Make Single lever fixtures with Wall Mixer cum Shower. Provision for Geysers in all Bathrooms. All CP and Sanitary fittings of Reputed make.' },
  { title: 'Fire Safety', body: 'Fire hydrant system (F.H.S) & Fire Sprinkler in all floors and Basement Fire Alarm and public address system in all floors and parking areas.' },
  { title: 'Waste Management', body: 'Garbage chutes will be provided for all towers.' },
  { title: 'Car Wash Facility', body: 'Car Wash facility will be provided in the parking floor level at designated area.' },
  { title: 'LPG Reticulation', body: 'Providing Piped gas from centralised Gas bank to all individual flats with Prepaid gas meters.' },
];

/* ============================ CONSTRUCTION ============================ */

export const construction = {
  eyebrow: 'Construction Updates',
  heading: ['Construction in', 'full swing 2025 to 2026'],
  current: 'July 2026',
  videoId: 'J2ctBmVASO4',
  videoTitle: 'Bricks Marvella Construction Update | July 2026 | Tellapur, Hyderabad',
  ctaLabel: 'Check Current Status',
  ctaHref: '/project-status/',
} as const;

/* ============================ TESTIMONIALS ============================
 * Ported verbatim from the Trustindex/Google widget. Google attribution and
 * the rating are kept — removing them is a trust and ToS problem.
 * ===================================================================== */

export const testimonials = {
  heading: 'Testimonials',
  source: 'Google',
  items: [
    {
      author: 'Phani Gopal Reddy Gudimetla',
      date: '19 June 2026',
      rating: 5,
      avatar: '/images/testimonials/phani',
      body:
        'After exploring several projects, I chose Bricks Marvella for its low-density design, higher undivided land share, ' +
        'excellent connectivity, and spacious layouts. The construction quality stands out, with advanced waterproofing and ' +
        'engineering practices that reflect the builder’s commitment to quality. Positive feedback from residents of previous ' +
        'projects and competitive pricing further reinforced my decision.',
    },
  ],
} as const;

/* ============================ FORM ============================ */

export const leadForm = {
  heading: 'Register Your Interest',
  sub: 'Share your details and our sales team will call you back.',
  fields: {
    name: { name: 'name', label: 'Name', type: 'text', required: true },
    email: { name: 'email', label: 'Email', type: 'email', required: true },
    phone: { name: 'phone', label: 'Phone number', type: 'tel', required: true },
    preference: { name: 'preference', label: 'Your preference', type: 'select', required: true },
  },
  preferencePlaceholder: 'Please select your preference*',
  submitLabel: 'Request Price',
  submittingLabel: 'Sending…',
  successMessage: 'Thank you — our team will call you shortly.',
  errorMessage: 'Something went wrong. Please call us instead.',
} as const;

/* ============================ NAV / FOOTER ============================ */

export const nav = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/#about-project' },
  { label: 'Amenities', href: '/#club-house' },
  { label: 'Master Plan', href: '/#master-plan' },
  { label: 'Floor Plan', href: '/#floor-plan' },
  { label: 'Project Status', href: '/project-status/' },
  { label: 'Location', href: '/#location' },
  { label: 'Specifications', href: '/#general-specifications' },
  { label: 'Blog', href: '/blog/' },
] as const;

/** In-page anchors carried over from the old site — every one must resolve. */
export const anchors = {
  about: 'about-project',
  amenities: 'club-house',
  amenitiesAlt: 'amenities',
  masterPlan: 'master-plan',
  floorPlan: 'floor-plan',
  location: 'location',
  specifications: 'general-specifications',
  construction: 'construction',
  contact: 'contact-form',
  leadForm: 'leadform',
  registerInterest: 'registeryourinterest',
} as const;

/**
 * The numbered index in the nav, in page order.
 *
 * Separate from `nav` above, which mirrors the old site's menu and exists so
 * every URL it published still resolves. This one is the in-page wayfinder and
 * only ever points at sections of the home page.
 */
export const sectionIndex = [
  { n: '01', label: 'The Project', href: `/#${anchors.about}` },
  { n: '02', label: 'Location', href: `/#${anchors.location}` },
  { n: '03', label: 'Amenities', href: `/#${anchors.amenities}` },
  { n: '04', label: 'Master Plan', href: `/#${anchors.masterPlan}` },
  { n: '05', label: 'Residences', href: `/#${anchors.floorPlan}` },
  { n: '06', label: 'Specifications', href: `/#${anchors.specifications}` },
  { n: '07', label: 'Construction', href: `/#${anchors.construction}` },
  { n: '08', label: 'Contact', href: `/#${anchors.contact}` },
] as const;

export const logos = {
  marvella: '/logos/marvella',
  marvellaFlat: '/logos/marvella-flat',
  bricks: '/logos/bricks',
  bricksRamabhupal: '/logos/bricks-ramabhupal',
} as const;

/* ============================ BLOG ============================ */

/** A rendered block from a real post. Generated by scripts/build-blog.mjs. */
export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'heading'; level: number; text: string }
  | { type: 'list'; items: string[] };

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  body: BlogBlock[];
}

/**
 * The live site's own posts, scraped and structured — NOT rewritten. Regenerate
 * with `node scripts/build-blog.mjs` after re-scraping.
 */
export const blogPosts: BlogPost[] = blogPostsJson as BlogPost[];

export const blogMeta = {
  title: 'Bricks Marvella Blog | Luxury Apartments in Tellapur',
  description: 'Insights on luxury apartments, Tellapur, and buying a home in west Hyderabad.',
} as const;
