import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Nav from '@/components/Nav/Nav';
import Footer from '@/components/Footer/Footer';
import StickyCTA from '@/components/StickyCTA/StickyCTA';
import GroundProvider from '@/components/GroundProvider/GroundProvider';
import { blogPosts, site } from '@/lib/content';
import styles from './post.module.css';

/**
 * Blog posts live at the root, exactly where the old site put them
 * (/why-luxury-apartments…/), so no URL changes and no redirects are needed.
 * Only known slugs are generated; anything else 404s.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} | ${site.name}`,
    description: post.excerpt,
    alternates: { canonical: `/${post.slug}/` },
    openGraph: { title: post.title, description: post.excerpt, url: `/${post.slug}/`, type: 'article' },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <>
      <GroundProvider />
      <Nav standalone />

      <main id="main" className={styles.page} data-ground="light">
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">{site.name}</Link>
          <span aria-hidden="true">/</span>
          <Link href="/blog/">Blog</Link>
        </nav>

        <article className={styles.article}>
          <h1 className={styles.title}>{post.title}</h1>

          {post.body.map((block, i) => {
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

        <p className={styles.back}><Link href="/blog/">← All posts</Link></p>
      </main>

      <Footer />
      <StickyCTA />
    </>
  );
}
