/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Force empty asset prefix for static exports
  assetPrefix: '',
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
