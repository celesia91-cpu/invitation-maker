/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Optimize for Cloudflare Pages
  experimental: {
    // This will help with client-side routing
    scrollRestoration: true,
  },
  // Disable unnecessary features for static export
  productionBrowserSourceMaps: false,
  optimizeFonts: false,
  // Configure paths for static export
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://invitation-maker-api.celesia91.workers.dev' : '',
  basePath: '',
  // Debug mode for development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.devtool = 'source-map';
    }
    return config;
  },
};

module.exports = nextConfig;
