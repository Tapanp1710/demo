import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * The old WordPress site served every URL with a trailing slash
   * (/portfolio-item/gym/, /project-status/, /blog/). The domain ranks
   * commercially, so URLs are preserved exactly rather than redirected.
   */
  trailingSlash: true,

  async headers() {
    return [
      {
        // Fingerprinted, immutable derivatives from scripts/fetch-assets.mjs
        source: '/:dir(images|plans|logos|status|videos)/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
