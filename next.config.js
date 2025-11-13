/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // Use NEXT_PUBLIC_SUPABASE_URL environment variable instead of hardcoding
        // This supports both dev and production Supabase projects
        hostname: '*.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/dashboard/offerings',
        destination: '/dashboard/products-services',
        permanent: true,
      },
      {
        source: '/dashboard/lead-magnets',
        destination: '/dashboard/offers',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
