import nextOnPages from 'next-on-pages';

/** @type {import('next').NextConfig} */
const baseConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    scrollRestoration: true,
  },
  // Enable debugging in development
  env: {
    DEBUG: process.env.NODE_ENV === 'development' ? 'true' : 'false',
  }
};

export default nextOnPages({
  ...baseConfig,
  // Additional Cloudflare Pages specific configuration
  swcMinify: true,
  // Configure paths
  basePath: '',
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || '',
});
