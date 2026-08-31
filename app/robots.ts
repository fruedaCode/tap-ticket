import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tapticket.es";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/api/", "/auth/", "/join", "/scan", "/tickets", "/trips"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
