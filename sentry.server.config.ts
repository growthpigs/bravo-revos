// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Filter out console.log breadcrumbs to reduce noise
  beforeBreadcrumb(breadcrumb) {
    // Filter out debug console logs that are too noisy
    if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
      const message = breadcrumb.message || '';

      // Keep important logs
      if (
        message.includes('[ERROR]') ||
        message.includes('[WARN]') ||
        message.includes('❌') ||
        message.includes('Failed')
      ) {
        return breadcrumb;
      }

      // Filter out debug logs
      if (
        message.includes('[DEBUG]') ||
        message.includes('[HGC_') ||
        message.includes('[WorkflowExecutor]') ||
        message.includes('[MarketingConsole]')
      ) {
        return null;
      }
    }

    return breadcrumb;
  },
});
