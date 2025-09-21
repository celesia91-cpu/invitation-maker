/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Configure asset prefix based on environment
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://celesia.app' : '',
  basePath: '',
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(/\.test\.js$/, /\.test\.jsx$/, /\.spec\.js$/, /\.spec\.jsx$/);
    }
    return config;
  },
};

module.exports = nextConfig;
