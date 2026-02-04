import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "pino-pretty"],
};

export default withSentryConfig(nextConfig, {
  // Sentry organization and project
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress source map upload logs during build
  silent: !process.env.CI,

  // Upload larger set of source maps for better stack traces
  widenClientFileUpload: true,

  // Route to bypass ad-blockers
  tunnelRoute: "/monitoring",

  // Control source map visibility
  sourcemaps: {
    disable: false,
  },
});
