import SmoothScroll from '@/components/SmoothScroll/SmoothScroll';
import GroundProvider from '@/components/GroundProvider/GroundProvider';
import Nav from '@/components/Nav/Nav';
import Hero from '@/components/Hero/Hero';
import About from '@/components/About/About';
// REMOVED FROM THE PAGE — do not re-add. The component files are being
// deleted, so these imports stay commented out or the build breaks.
// import DroneCube from '@/components/DroneCube/DroneCube';
// import ParallaxOpener from '@/components/ParallaxOpener/ParallaxOpener';
import ArcCarousel from '@/components/ArcCarousel/ArcCarousel';
import MasterPlan from '@/components/MasterPlan/MasterPlan';
import FloorPlans from '@/components/FloorPlans/FloorPlans';
import Location from '@/components/Location/Location';
import Specifications from '@/components/Specifications/Specifications';
import Testimonials from '@/components/Testimonials/Testimonials';
import Footer from '@/components/Footer/Footer';
import StickyCTA from '@/components/StickyCTA/StickyCTA';
import { site, legal, amenities, floorPlans, contact, phone } from '@/lib/content';
import styles from './page.module.css';

/** Only the dates and photo counts reach the client — not the 16 KB manifest. */

/**
 * Section order follows the source site so every anchor and every piece of
 * content keeps its place. Grounds alternate stage → light → stage … driven by
 * the data-ground attribute each section sets; GroundProvider reads them.
 */

// REMOVED FROM THE PAGE — do not re-add. These fed ParallaxOpener only.
// Line comments, not a block: the region contains its own */ terminators.
//
// /* Opener `src` values carry their width suffix, and `dim` is the real intrinsic
//    size of that exact file — the amenity sources range 1.33 to 1.78 in aspect,
//    and the drone set is emitted at 600 rather than 560. */
// type Dim = [number, number];
//
// const AMENITY_OPENER = [
//   { src: '/images/amenities/swimming-pool-560', alt: 'Swimming pool at Bricks Marvella', dim: [560, 315] as Dim, x: 4, y: 12, w: 22, front: false, rate: 0.7 },
//   { src: '/images/amenities/gym-560', alt: 'Gym at Bricks Marvella', dim: [560, 315] as Dim, x: 68, y: 6, w: 20, front: true, rate: 1.3 },
//   { src: '/images/amenities/banquet-hall-560', alt: 'Banquet hall at the Bricks Marvella clubhouse', dim: [560, 315] as Dim, x: 30, y: 30, w: 24, front: false, rate: 0.85 },
//   { src: '/images/amenities/tennis-court-560', alt: 'Tennis court at Bricks Marvella', dim: [560, 420] as Dim, x: 78, y: 44, w: 18, front: true, rate: 1.15, mobile: false },
//   { src: '/images/amenities/movie-theater-560', alt: 'Private movie theatre at Bricks Marvella', dim: [560, 315] as Dim, x: 12, y: 52, w: 19, front: true, rate: 1.25, mobile: false },
//   { src: '/images/amenities/skating-rink-560', alt: 'Skating rink at Bricks Marvella', dim: [560, 373] as Dim, x: 52, y: 4, w: 16, front: false, rate: 0.75, mobile: false },
// ];
//
// /* The floor plans are only emitted at 900px and up — downscaling a drawing
//    destroys its legibility — so this composition draws on the drone set. */
// const RESIDENCES_OPENER = [
//   { src: '/images/drone/dji_0210-600', alt: 'Aerial view of the Bricks Marvella towers beside the lake at Tellapur', dim: [600, 450] as Dim, x: 6, y: 14, w: 24, front: false, rate: 0.72 },
//   { src: '/images/amenities/guest-rooms-560', alt: 'Guest room interior at Bricks Marvella', dim: [560, 315] as Dim, x: 66, y: 10, w: 22, front: true, rate: 1.28 },
//   { src: '/images/drone/dji_0217-600', alt: 'Aerial view of Bricks Marvella against the Tellapur skyline', dim: [600, 450] as Dim, x: 34, y: 40, w: 26, front: false, rate: 0.88 },
//   { src: '/images/drone/dji_0272-600', alt: 'Aerial view of Bricks Marvella looking towards the Financial District', dim: [600, 450] as Dim, x: 74, y: 50, w: 20, front: true, rate: 1.12, mobile: false },
// ];
//
// const SPEC_OPENER = [
//   { src: '/images/amenities/guest-rooms-560', alt: 'Guest room interior at Bricks Marvella', dim: [560, 315] as Dim, x: 8, y: 16, w: 23, front: false, rate: 0.75 },
//   { src: '/images/amenities/indoor-games-560', alt: 'Indoor games room at the Bricks Marvella clubhouse', dim: [560, 315] as Dim, x: 64, y: 8, w: 21, front: true, rate: 1.3 },
//   { src: '/images/amenities/gymnasium-and-spa-560', alt: 'Gymnasium and spa at Bricks Marvella', dim: [560, 315] as Dim, x: 38, y: 44, w: 22, front: false, rate: 0.9 },
//   { src: '/images/amenities/pool-table-560', alt: 'Pool table in the Bricks Marvella games room', dim: [560, 315] as Dim, x: 76, y: 48, w: 18, front: true, rate: 1.18, mobile: false },
// ];

/** Structured data, built only from facts already published on the site. */
function StructuredData() {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: site.name,
    url: site.url,
    description: site.meta.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: contact.address,
      addressLocality: 'Tellapur',
      addressRegion: 'Telangana',
      addressCountry: 'IN',
    },
    telephone: phone.primary.e164,
    email: contact.email,
    numberOfRooms: amenities.length,
    amenityFeature: amenities.map((a) => ({ '@type': 'LocationFeatureSpecification', name: a.title, value: true })),
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'RERA', value: legal.rera },
      { '@type': 'PropertyValue', name: 'Building Permission', value: legal.buildingPermission },
      { '@type': 'PropertyValue', name: 'Floors', value: '32' },
      { '@type': 'PropertyValue', name: 'Towers', value: '2' },
      { '@type': 'PropertyValue', name: 'Site area', value: '4.5 Acres' },
      { '@type': 'PropertyValue', name: 'Floor plans', value: String(floorPlans.length) },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

/**
 * Holds one full-height section still for an extra screen of scrolling.
 * Carries `data-ground` for the section it wraps — see page.module.css.
 */
function Hold({ ground, children }: { ground: 'stage' | 'light'; children: React.ReactNode }) {
  return <div className={styles.hold} data-ground={ground}>{children}</div>;
}

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <GroundProvider />
      <Nav />
      <StructuredData />

      <main id="main" className={styles.main}>
        {/* Hero, MasterPlan and FloorPlans own scroll tracks
            already and hold longer than one screen — they are not wrapped. */}
        <Hero />
        
        {/* The stat band's six figures now flank the master plan. */}
        <Hold ground="stage"><About /></Hold>
        {/* <DroneCube /> */}

        {/* <ParallaxOpener word="Amenities" images={AMENITY_OPENER} ground="stage" /> */}
        <Hold ground="stage"><ArcCarousel /></Hold>

        <MasterPlan />
        {/* <ParallaxOpener word="Residences" images={RESIDENCES_OPENER} ground="light" /> */}
        <FloorPlans />

        <Hold ground="stage"><Location /></Hold>

        {/* <ParallaxOpener word="Specifications" images={SPEC_OPENER} ground="light" /> */}
        <Hold ground="light"><Specifications /></Hold>

        {/* The construction updates live on /project-status/ now. */}
        {/* <Hold ground="light"><Testimonials /></Hold> */}
        {/* The lead form is a dialog now — see components/ContactDialog. */}
      </main>

      <Footer />
      <StickyCTA />
    </>
  );
}
