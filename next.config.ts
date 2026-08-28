import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Static CSP (no nonces): every public page is prerendered and cached at the
// Fly edge, and nonce-based CSP would force dynamic rendering on all routes.
// script-src keeps 'unsafe-inline' because the App Router embeds inline RSC
// payload scripts; React dev mode additionally needs 'unsafe-eval'.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  // Supabase (auth/rest/realtime) and PostHog (fallback if the /ingest
  // reverse proxy is bypassed; ui_host links point at these hosts too)
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://eu.i.posthog.com https://eu-assets.i.posthog.com https://us.i.posthog.com https://us-assets.i.posthog.com",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    // camera stays self-scoped: /scan needs it for QR scanning
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Required for the PostHog reverse proxy: without it Next 308-redirects
  // /ingest/decide -> /ingest/decide/, which breaks feature-flag bootstrap.
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Auth-flow pages must never be served from the shared edge cache
      // (they were previously cached for a year via s-maxage=31536000).
      {
        source: "/login",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/auth/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
  async rewrites() {
    // EU default must match components/posthog-provider.tsx: with an unset
    // NEXT_PUBLIC_POSTHOG_HOST a US default here would proxy analytics out of
    // the EU, which /legal/privacy does not declare.
    const posthogHost =
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
    // PostHog serves static assets (recorder.js, array/<token>/config.js) from
    // a DIFFERENT origin (us-assets.i.posthog.com) than ingest (us.i.posthog.com).
    // Order matters: specific rewrites MUST come before the catch-all.
    const assetsHost = posthogHost.replace(
      /^https?:\/\/(us|eu)\.i\.posthog\.com$/,
      "https://$1-assets.i.posthog.com",
    );
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${assetsHost}/static/:path*`,
      },
      {
        source: "/ingest/array/:path*",
        destination: `${assetsHost}/array/:path*`,
      },
      { source: "/ingest/:path*", destination: `${posthogHost}/:path*` },
    ];
  },
};

export default nextConfig;
