import 'server-only'
import { headers } from 'next/headers'
import { config } from '@/lib/config'

// Resolve the public origin for outbound redirect URLs (Stripe checkout
// success/cancel, portal return). Behind Fly.io's proxy `request.url` would
// be the internal address, so prefer NEXT_PUBLIC_SITE_URL and fall back to
// the forwarded headers.
export async function resolveOrigin(): Promise<string> {
  if (config.stripe.siteUrl) return config.stripe.siteUrl.replace(/\/$/, '')
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  return `${proto}://${host}`
}
