import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Required for the PostHog reverse proxy: without it Next 308-redirects
  // /ingest/decide -> /ingest/decide/, which breaks feature-flag bootstrap.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const posthogHost =
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
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
