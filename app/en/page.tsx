import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";
import { buildLandingJsonLd } from "@/lib/seo/jsonld";

const title = "TapTicket — Scan a receipt with AI and split the bill";
const description =
  "Scan any receipt with AI, share a link and friends claim what they had. Split restaurant and bar bills fairly in seconds — no app install, no calculator.";

export const metadata: Metadata = {
  // `absolute` opts out of the root layout's "%s · TapTicket" template, which
  // would duplicate the brand.
  title: { absolute: title },
  description,
  alternates: {
    canonical: "/en",
    languages: {
      es: "/",
      en: "/en",
      "x-default": "/",
    },
  },
  openGraph: {
    title,
    description,
    locale: "en_US",
  },
  twitter: {
    title,
    description,
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildLandingJsonLd("en")),
        }}
      />
      <LandingPage />
    </>
  );
}
