"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// Initializes PostHog only when a project key is configured; otherwise this
// component is a pass-through and the app runs without analytics.
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
      capture_pageview: true,
    });
  }, []);

  return <>{children}</>;
}
