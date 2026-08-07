// Centralized env wiring for optional third-party integrations.
// Stripe is optional: when STRIPE_SECRET_KEY is empty the app keeps working
// with billing disabled (billing routes return 503, upgrade CTAs hide).

function env(name: string): string {
  return process.env[name] ?? ''
}

export const config = {
  stripe: {
    secretKey: env('STRIPE_SECRET_KEY'),
    webhookSecret: env('STRIPE_WEBHOOK_SECRET'),
    standardPriceId: env('STRIPE_PRICE_STANDARD'),
    proPriceId: env('STRIPE_PRICE_PRO'),
    siteUrl: env('NEXT_PUBLIC_SITE_URL'),
  },
}
