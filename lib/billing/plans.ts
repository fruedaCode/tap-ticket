// Plan catalogue — the single source of truth for "what is a plan" and "how
// many scans per week does it allow". The UI (/plans) and the enforcement
// layer (/api/scan) both read from here so they can't drift.
//
// Prices are in EUR cents (€2.50 -> 250) so the UI can format them via
// `Intl.NumberFormat(locale, { style: 'currency' })`.
import { config } from '@/lib/config'

export type PaidPlanId = 'standard' | 'pro'
export type PlanId = 'free' | PaidPlanId

export type PlanLimit = number | 'unlimited'

export type PlanDefinition = {
  id: PlanId
  // Weekly scan quota (rolling 7-day window). `unlimited` skips the counter.
  weeklyLimit: PlanLimit
  // Price in EUR cents per month. 0 for free.
  priceCents: number
  // Stripe price ID — only on paid plans; empty when the env var is not
  // configured (the UI hides the upgrade button in that case).
  stripePriceId?: string
}

export const PLAN_CATALOGUE: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    weeklyLimit: 4,
    priceCents: 0,
  },
  standard: {
    id: 'standard',
    weeklyLimit: 10,
    priceCents: 250,
    stripePriceId: config.stripe.standardPriceId || undefined,
  },
  pro: {
    id: 'pro',
    weeklyLimit: 'unlimited',
    priceCents: 1000,
    stripePriceId: config.stripe.proPriceId || undefined,
  },
}

export function isPaidPlan(plan: PlanId): plan is PaidPlanId {
  return plan === 'standard' || plan === 'pro'
}

// Rolling 7-day quota window: [now - 7d, now]. Kept here (pure) so tests and
// the enforcement layer share the exact same math.
export function getRollingWeekWindow(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return { start, end: now }
}

// Translate a Stripe price ID back into our plan ID. Used by the webhook to
// decide which plan to write into `profiles` after a subscription event.
export function planForStripePriceId(priceId: string | null): PaidPlanId | null {
  if (!priceId) return null
  if (priceId === config.stripe.standardPriceId) return 'standard'
  if (priceId === config.stripe.proPriceId) return 'pro'
  return null
}
