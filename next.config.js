const webpack = require('webpack');

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
    // Add polyfills for Node.js modules
    config.plugins.push(
      new webpack.ProvidePlugin({
        process: 'process/browser',
      })
    );
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      assert: require.resolve('assert'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      zlib: require.resolve('browserify-zlib'),
      process: require.resolve('process/browser'),
    };
    
    // Enable module path aliases from tsconfig.json
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src')
    };
    
    return config;
  },
  // Handle issues with the @solana/wallet-adapter packages
  transpilePackages: [
    '@solana/web3.js',
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-wallets',
    '@solana/wallet-adapter-react-ui',
    '@solana-mobile/wallet-adapter-mobile',
  ],
};

module.exports = nextConfig; 