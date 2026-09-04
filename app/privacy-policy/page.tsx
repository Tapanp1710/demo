import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav/Nav';
import Footer from '@/components/Footer/Footer';
import { site } from '@/lib/content';
import privacy from '@/lib/privacy-policy.json';
import styles from './privacy.module.css';

/** The site's own privacy policy, ported verbatim. Legal copy — never reworded. */

type Block =
  | { type: 'p'; text: string }
  | { type: 'heading'; level: number; text: string }
  | { type: 'list'; items: string[] };

export const metadata: Metadata = {
  title: `Privacy Policy — ${site.name}`,
  description: `How ${site.name} collects, uses and protects your information.`,
  alternates: { canonical: '/privacy-policy/' },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  const blocks = privacy as Block[];

  return (
    <>
      <Nav standalone />

      <main id="main" className={styles.page} data-ground="light">
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">{site.name}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Privacy Policy</span>
        </nav>

        <h1 className={styles.title}>Privacy Policy</h1>

        <article className={styles.article}>
          {blocks.map((block, i) => {
            if (block.type === 'heading') {
              const Tag = (block.level === 2 ? 'h2' : block.level === 3 ? 'h3' : 'h4') as 'h2' | 'h3' | 'h4';
              return <Tag key={i} className={styles.subhead}>{block.text}</Tag>;
            }
            if (block.type === 'list') {
              return (
                <ul key={i} className={styles.list}>
                  {block.items.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              );
            }
            return <p key={i} className={styles.para}>{block.text}</p>;
          })}
        </article>
      </main>

      <Footer />
    </>
  );
}
