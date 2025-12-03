/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force new build ID to invalidate Vercel cache
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  // Add headers to prevent aggressive caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig
