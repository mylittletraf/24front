// Sentry is initialized lazily and only when a DSN is configured, so an empty
// NEXT_PUBLIC_SENTRY_DSN keeps the integration a complete no-op.
let initialized = false;

async function ensureSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;
  const Sentry = await import("@sentry/nextjs");
  if (!initialized) {
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
    initialized = true;
  }
  return Sentry;
}

export function captureError(error: unknown): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    if (process.env.NODE_ENV !== "production") console.error(error);
    return;
  }
  void ensureSentry()
    .then((sentry) => sentry?.captureException(error))
    .catch(() => undefined);
}
