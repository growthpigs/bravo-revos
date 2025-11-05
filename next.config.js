/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdoikmuoiccqllqdpoew.supabase.co',
      },
    ],
  },
}

module.exports = nextConfig
