import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
};

// Sentry stays dormant until a DSN is provided. Source-map upload needs a
// real org and project; with those missing the upload is disabled instead of
// failing the build on invented values.
const configWithSentry = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      sourcemaps: {
        disable:
          !process.env.SENTRY_ORG || !process.env.SENTRY_PROJECT
            ? true
            : undefined,
      },
    })
  : nextConfig;

export default configWithSentry;
