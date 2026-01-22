const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16 uses Turbopack - use serverExternalPackages instead of webpack externals
  serverExternalPackages: [
    'gpt-tokenizer',    // tries to load encoder.json at build time
    'gpt-3-encoder',    // tries to load encoder.json at build time
    'gologin',          // puppeteer + native deps cause serverless issues
    'puppeteer-core',   // native deps cause serverless issues
    'when',             // contains vertx JVM dependency
    'requestretry',     // depends on when
    'pdf-parse',        // requires @napi-rs/canvas with DOM APIs
    '@napi-rs/canvas',  // native canvas binding
    'canvas',           // fallback canvas package
  ],
  // Disable Turbopack for build (webpack still needed for complex externals)
  // Turbopack can't handle vertx resolution fallbacks
  experimental: {
    turbo: {
      // Turbopack-specific resolve aliases
      resolveAlias: {
        'vertx': false,
        'bufferutil': false,
        'utf-8-validate': false,
      },
    },
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
  // Disable instrumentationHook - causes ENOENT on Vercel when .env doesn't exist
  // experimental: {
  //   instrumentationHook: true,
  // },
}

// Temporarily disable Sentry wrapping - debugging build issues
// The .env stat check in Sentry causes ENOENT on Vercel builds
const DISABLE_SENTRY = !process.env.SENTRY_AUTH_TOKEN;

if (DISABLE_SENTRY) {
  module.exports = nextConfig;
} else {
  const hasSentryAuth = true;
  module.exports = require('@sentry/nextjs').withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: "badaboost",
  project: "bravo-revos",

  // Skip source map upload if no auth token (prevents build failures)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Disable telemetry
  telemetry: false,

  // Disable source maps completely when no auth token
  sourcemaps: {
    disable: !hasSentryAuth,
  },
}, {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: hasSentryAuth,

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
    automaticVercelMonitors: hasSentryAuth,
  });
}
