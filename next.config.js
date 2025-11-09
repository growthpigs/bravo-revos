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
}

module.exports = nextConfig
