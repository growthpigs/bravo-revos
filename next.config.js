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
  // Webpack optimizations to prevent cache corruption
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Reduce memory pressure and prevent cache corruption
      config.cache = {
        type: 'memory', // Use memory cache instead of filesystem to prevent corruption
        maxGenerations: 1, // Clear cache more aggressively
      };

      // Prevent webpack from running out of memory
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }
    return config;
  },
  // Increase memory for Node.js
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
}

module.exports = nextConfig
