// This script is executed by Vercel during the build process
const fs = require('fs');
const path = require('path');

console.log('Running Vercel build script...');

// Create a next.config.js file if it doesn't exist
const nextConfigPath = path.join(__dirname, 'next.config.js');
if (!fs.existsSync(nextConfigPath)) {
  console.log('Creating next.config.js file...');
  const nextConfigContent = `
const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
`;
  fs.writeFileSync(nextConfigPath, nextConfigContent);
  console.log('Created next.config.js file successfully.');
} else {
  console.log('next.config.js already exists, skipping creation.');
}

// Continue with the normal Next.js build process
console.log('Proceeding with Next.js build process...');

// This script doesn't need to do anything special for now
// The actual build is handled by Next.js build
process.exit(0); // Exit successfully 