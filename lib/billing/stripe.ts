import 'server-only'
import Stripe from 'stripe'
import { config } from '@/lib/config'

// Lazy singleton so importing this module never throws when STRIPE_SECRET_KEY
// is unset — only callers that actually talk to Stripe hit `getStripe()`.
let client: Stripe | null = null

export function getStripe(): Stripe {
  if (client) return client
  if (!config.stripe.secretKey) {
    throw new Error(
      'Stripe is not configured. Set STRIPE_SECRET_KEY (and the price IDs) to enable subscription billing.',
    )
  }
  // Pin the API version explicitly so library upgrades don't silently change
  // webhook payload shapes underneath us. Pinned to the SDK's own default.
  client = new Stripe(config.stripe.secretKey, {
    apiVersion: '2026-07-29.dahlia',
    typescript: true,
  })
  return client
}

export function isStripeConfigured(): boolean {
  return Boolean(config.stripe.secretKey)
}
