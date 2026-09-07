import { en } from "@/lib/i18n/en";
import { es } from "@/lib/i18n/es";
import { FAQ_ITEMS } from "./faq";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tapticket.es";

const dictFor = { en, es } as const;

export type LandingJsonLdLang = keyof typeof dictFor;

// Structured data for the public landing pages (/ and /en). Every string comes
// from the same i18n dicts that render the visible page, so the markup Google
// reads always matches the content visitors see.
export function buildLandingJsonLd(lang: LandingJsonLdLang) {
  const t = (key: string) => dictFor[lang][key] ?? en[key] ?? key;
  const url = lang === "en" ? `${siteUrl}/en` : siteUrl;

  const steps = [
    {
      name: t("Snap the receipt"),
      text: t("Take a photo of the ticket. AI reads every line item and its price."),
    },
    {
      name: t("Share the link"),
      text: t("Friends join from their phones in seconds, no app install needed."),
    },
    {
      name: t("Claim your items"),
      text: t("Everyone taps what they had, in realtime. Partial splits are handled for you."),
    },
    {
      name: t("Settle up"),
      text: t("See exactly who owes what and track payments until everyone is squared."),
    },
  ];

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}#app`,
        name: "TapTicket",
        url,
        inLanguage: lang,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        description: t(
          "Snap a photo and AI reads every line. Share a link, friends claim what they had, and the math is done for you.",
        ),
        featureList: [
          t("Take a photo of the ticket. AI reads every line item and its price."),
          t("Friends join from their phones in seconds, no app install needed."),
          t("Everyone taps what they had, in realtime. Partial splits are handled for you."),
          t("See exactly who owes what and track payments until everyone is squared."),
        ],
        offers: {
          "@type": "Offer",
          price: 0,
          priceCurrency: "EUR",
        },
      },
      {
        "@type": "HowTo",
        "@id": `${url}#howto`,
        name: t("How it works"),
        inLanguage: lang,
        step: steps.map((step, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: step.name,
          text: step.text,
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        inLanguage: lang,
        mainEntity: FAQ_ITEMS.map((item) => ({
          "@type": "Question",
          name: t(item.q),
          acceptedAnswer: {
            "@type": "Answer",
            text: t(item.a),
          },
        })),
      },
    ],
  };
}
