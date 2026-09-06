import type { Metadata, Viewport } from 'next';
import { Poiret_One, Jost } from 'next/font/google';
import { site } from '@/lib/content';
import './globals.css';

/**
 * next/font self-hosts and subsets these at build time — no gstatic request,
 * no render-blocking stylesheet. Both are SIL Open Font License 1.1.
 */
/**
 * TWO faces, because the brief's reference is a display type.
 *
 * The direction is TAN Aegean — a thin, wide, geometric display face. It is a
 * commercial licence and is not shipped here. Poiret One is the closest thing
 * on the Open Font License: the same hairline geometry and the same generous
 * width. Like the reference it is DISPLAY ONLY, one weight, no italic — which
 * is exactly why it cannot also set the body. The specification index alone is
 * 21 rows of dense copy, and a hairline face at 17px is unreadable however
 * good the contrast ratio is.
 *
 * So Poiret One carries the headings and the vertical AMENITIES word, and Jost
 * — a geometric sans from the same family of shapes, with a real 100–900
 * variable range — carries everything that has to be read rather than looked
 * at. They share the circular bowls and open apertures, so the pairing reads
 * as one voice at two scales.
 */
const display = Poiret_One({
  subsets: ['latin'],
  weight: '400',            // the family HAS no other weight — see --fw-heading
  variable: '--font-poiret',
  display: 'swap',
});

const text = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-jost',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.meta.title,
  description: site.meta.description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: site.url,
    title: site.meta.title,
    description: site.meta.description,
    siteName: site.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: site.meta.title,
    description: site.meta.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#14120f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${text.variable}`}>
      <body>
        <a href="#main" className="visuallyHidden">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
