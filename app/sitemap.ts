import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tapticket.es";

// Public, indexable pages only. App pages (tickets, trips, scan, account,
// join) are private/user-specific and excluded — see app/robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/plans`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/legal/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/legal/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/legal/cookies`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/legal/aviso-legal`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
