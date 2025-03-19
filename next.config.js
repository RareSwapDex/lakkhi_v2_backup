/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Allow connections from external IPs
  experimental: {
    // Reduce memory usage
    memoryBasedWorkersCount: true
  },
  // Server binding is controlled via env variables in package.json scripts
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};

module.exports = nextConfig; 