const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mark tokenizer packages as external to prevent encoder.json build-time loading
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude problematic packages from server bundles
      config.externals = config.externals || [];
      config.externals.push('gpt-tokenizer');  // tries to load encoder.json at build time
      config.externals.push('gpt-3-encoder');  // tries to load encoder.json at build time
      config.externals.push('gologin');        // puppeteer + native deps cause serverless issues
      config.externals.push('puppeteer-core'); // native deps cause serverless issues
    }

    // Fix for gologin dependencies - optional modules that don't exist in browser/serverless
    config.resolve = config.resolve || {};
    config.resolve.fallback = config.resolve.fallback || {};
    config.resolve.fallback.vertx = false;        // JVM dependency in when/requestretry
    config.resolve.fallback.bufferutil = false;   // Optional ws performance module
    config.resolve.fallback['utf-8-validate'] = false;  // Optional ws validation module

    return config;
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
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
  async headers() {
    return [
      {
        // Prevent caching of build-info.json so users always see current build
        source: '/build-info.json',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ]
  },
  // Enable Next.js instrumentation hook for Sentry
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: "badaboost",
  project: "bravo-revos",
}, {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Transpiles SDK to be compatible with IE11 (increases bundle size)
  transpileClientSDK: true,

  // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors.
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
