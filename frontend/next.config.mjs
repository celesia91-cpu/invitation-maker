import nextOnPages from 'next-on-pages';

/** @type {import('next').NextConfig} */
const resolvedAssetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || (process.env.NODE_ENV === 'production' ? 'https://celesia.app' : '');

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
  assetPrefix: resolvedAssetPrefix,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(/\.test\.js$/, /\.test\.jsx$/, /\.spec\.js$/, /\.spec\.jsx$/);
    }
    return config;
  },
});
