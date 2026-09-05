import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond } from 'next/font/google';
import { site } from '@/lib/content';
import './globals.css';

/**
 * next/font self-hosts and subsets these at build time — no gstatic request,
 * no render-blocking stylesheet. Both are SIL Open Font License 1.1.
 */
/**
 * ONE face for the whole site — headings, body, nav, forms, everything.
 *
 * Cormorant Garamond: an old-style serif with a small x-height, light stems
 * and enough contrast in its capitals to carry a display line. The reference
 * sets both its display and its running text in a single garalde, which is
 * what this is; Bodoni Moda and Jost are gone.
 *
 * 300 is real here — the variable range covers it, so --fw-light means what it
 * says again.
 */
const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

/* The text face IS the display face. Kept as its own binding so any component
   reading --font-text keeps working and a second face can be reintroduced
   without touching them. */
const text = display;

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
