import type { MetadataRoute } from 'next';
import { site, amenities, blogPosts } from '@/lib/content';

/** Every public URL, matching the old site's structure exactly. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${site.url}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${site.url}/project-status/`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${site.url}/blog/`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${site.url}/privacy-policy/`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    ...amenities.map((a) => ({
      url: `${site.url}/portfolio-item/${a.slug}/`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    })),
    ...blogPosts.map((p) => ({
      url: `${site.url}/${p.slug}/`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
