import path from 'node:path';

/** @type {import('next').NextConfig} */
const resolvedAssetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || '';
const outputFileTracingRoot = path.resolve(process.cwd(), '..');

const baseConfig = {
  output: 'export',
  trailingSlash: false,
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

let withCloudflare = (config) => config;

if (!process.env.NEXT_DISABLE_CLOUDFLARE_ADAPTER) {
  try {
    const mod = await import('@cloudflare/next-on-pages');
    if (typeof mod?.default === 'function') {
      withCloudflare = mod.default;
    }
  } catch (error) {
    const reason = error?.message ?? error;
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[next-on-pages] adapter unavailable, using base Next config. Reason:', reason);
    }
  }
}

export default withCloudflare({
  ...baseConfig,
  outputFileTracingRoot,
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
