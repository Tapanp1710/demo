import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav/Nav';
import Footer from '@/components/Footer/Footer';
import StickyCTA from '@/components/StickyCTA/StickyCTA';
import { blogPosts, blogMeta } from '@/lib/content';
import styles from './blog.module.css';

export const metadata: Metadata = {
  title: blogMeta.title,
  description: blogMeta.description,
  alternates: { canonical: '/blog/' },
  openGraph: { title: blogMeta.title, description: blogMeta.description, url: '/blog/' },
};

export default function BlogIndex() {
  return (
    <>
      <Nav standalone />

      <main id="main" className={styles.page} data-ground="light">
        <header className={styles.head}>
          <p className={styles.eyebrow}>Journal</p>
          <h1 className={styles.title}>Blog</h1>
          <p className={styles.sub}>{blogMeta.description}</p>
        </header>

        <ul className={styles.list}>
          {blogPosts.map((post) => (
            <li key={post.slug} className={styles.item}>
              <Link href={`/${post.slug}/`} className={styles.link}>
                <h2 className={styles.postTitle}>{post.title}</h2>
                <p className={styles.excerpt}>{post.excerpt}</p>
                <span className={styles.more}>Read more →</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <Footer />
      <StickyCTA />
    </>
  );
}
