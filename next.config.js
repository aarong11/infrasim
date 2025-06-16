/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['faiss-node']
  }
}

module.exports = nextConfig
