/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
  // Force clean build - cache busting
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
}

module.exports = nextConfig
