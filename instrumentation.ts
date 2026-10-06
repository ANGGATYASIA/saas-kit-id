// Minimal Sentry bootstrap. Runs only when SENTRY_DSN is set; otherwise
// this file is a no-op and error tracking is simply off.
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0,
    });
  }
}
