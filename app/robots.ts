import type { MetadataRoute } from 'next';
import { site } from '@/lib/content';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // internal reference page — indexing it would compete with real content
      disallow: ['/styleguide', '/api/'],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
