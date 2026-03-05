import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "pino-pretty"],
  experimental: {
    // lucide-react is already auto-optimized by default in Next.js 16.
    // This explicit entry is a belt-and-suspenders declaration per PERF-03.
    optimizePackageImports: ["lucide-react"],
  },
  async redirects() {
    return [
      // payments Portal moves — more specific paths first
      { source: "/dashboard/forecasting", destination: "/payments/forecast", permanent: true },
      { source: "/dashboard", destination: "/payments/dashboard", permanent: true },
      { source: "/analytics", destination: "/payments/analytics", permanent: true },
      { source: "/subscriptions/:path*", destination: "/payments/subscriptions/:path*", permanent: true },
      { source: "/subscriptions", destination: "/payments/subscriptions", permanent: true },
      { source: "/transactions", destination: "/payments/transactions", permanent: true },
      { source: "/suggestions", destination: "/payments/suggestions", permanent: true },
      { source: "/reminders", destination: "/payments/reminders", permanent: true },
      // fin Vault moves
      { source: "/import/batch", destination: "/vault/load", permanent: true },
      { source: "/import", destination: "/vault/load", permanent: true },
    ];
  },
};

// Sentry must be the outermost wrapper; bundle analyzer is chained inside it.
export default withSentryConfig(withBundleAnalyzer(nextConfig), {
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
