import type { Metadata, Viewport } from 'next';
import { Bodoni_Moda, Jost } from 'next/font/google';
import { site } from '@/lib/content';
import './globals.css';

/**
 * next/font self-hosts and subsets these at build time — no gstatic request,
 * no render-blocking stylesheet. Both are SIL Open Font License 1.1.
 */
/**
 * Bodoni Moda, not Cormorant Garamond. Cormorant is an old-style face with
 * gentle contrast; the brief wants the high-contrast luxury serif — hairline
 * thin strokes against heavy stems, ball terminals. Bodoni Moda is the
 * freely-licensed face in that genre.
 *
 * It is variable over 400-900, so `--fw-light: 300` clamps to 400 wherever the
 * display face uses it. That is the intent: 400 is already the thin-hairline
 * cut, and anything lighter would not survive on the deep stage ground.
 */
const display = Bodoni_Moda({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-bodoni',
  display: 'swap',
});

/**
 * Jost, not Inter. Inter is a UI face — engineered to be neutral in a
 * dashboard, which on a brand site reads as competent software rather than as
 * anything. Jost is geometric and Futura-derived, and geometric sans under a
 * didone is the century-old pairing from fashion and architectural printing.
 *
 * Its variable range covers 300, so --fw-light means 300 here even though the
 * display face clamps it to 400.
 */
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
