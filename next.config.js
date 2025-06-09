/** @type {import('next').NextConfig} */
const webpack = require('webpack');
const path = require('path');

const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle node: scheme imports
    config.resolve.alias = {
      ...config.resolve.alias,
      'node:fs': 'fs',
      'node:fs/promises': 'fs/promises', 
      'node:path': 'path',
      'node:util': 'util',
      'node:os': 'os'
    };

    // Provide fallbacks for browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        'fs/promises': false,
        path: require.resolve('path-browserify'),
        util: require.resolve('util/'),
        os: require.resolve('os-browserify/browser'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
        crypto: require.resolve('crypto-browserify'),
        url: require.resolve('url/'),
        querystring: require.resolve('querystring-es3'),
        assert: require.resolve('assert/')
      };

      // Ignore server-only modules on client
      config.plugins.push(
        new webpack.IgnorePlugin({ 
          resourceRegExp: /^faiss-node$/ 
        }),
        new webpack.IgnorePlugin({ 
          resourceRegExp: /^pickleparser$/ 
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /^@langchain\/community\/vectorstores\/faiss$/
        })
      );
    }

    return config;
  },
  
  experimental: {
    serverComponentsExternalPackages: ['faiss-node', 'pickleparser']
  }
}

module.exports = nextConfig
