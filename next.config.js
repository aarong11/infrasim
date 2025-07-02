/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['faiss-node']
  },
  // Allow any hostname for Cloudflare tunnel compatibility
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
  // Configure hostname handling
  async rewrites() {
    return [];
  },
}

module.exports = nextConfig
