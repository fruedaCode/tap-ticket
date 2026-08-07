import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// lib/billing/plans.ts reads price IDs from env at module load, so each test
// group re-imports it with a fresh module registry + stubbed env.

async function importPlans() {
  return import('@/lib/billing/plans')
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('PLAN_CATALOGUE', () => {
  it('defines free, standard and pro with the expected weekly limits and prices', async () => {
    const { PLAN_CATALOGUE } = await importPlans()
    expect(PLAN_CATALOGUE.free).toMatchObject({ weeklyLimit: 4, priceCents: 0 })
    expect(PLAN_CATALOGUE.standard).toMatchObject({ weeklyLimit: 10, priceCents: 250 })
    expect(PLAN_CATALOGUE.pro).toMatchObject({ weeklyLimit: 'unlimited', priceCents: 1000 })
  })

  it('exposes stripe price IDs only when the env vars are configured', async () => {
    const { PLAN_CATALOGUE } = await importPlans()
    expect(PLAN_CATALOGUE.standard.stripePriceId).toBeUndefined()
    expect(PLAN_CATALOGUE.pro.stripePriceId).toBeUndefined()

    vi.resetModules()
    vi.stubEnv('STRIPE_PRICE_STANDARD', 'price_std')
    vi.stubEnv('STRIPE_PRICE_PRO', 'price_pro')
    const configured = await importPlans()
    expect(configured.PLAN_CATALOGUE.standard.stripePriceId).toBe('price_std')
    expect(configured.PLAN_CATALOGUE.pro.stripePriceId).toBe('price_pro')
  })
})

describe('isPaidPlan', () => {
  it('classifies plans correctly', async () => {
    const { isPaidPlan } = await importPlans()
    expect(isPaidPlan('free')).toBe(false)
    expect(isPaidPlan('standard')).toBe(true)
    expect(isPaidPlan('pro')).toBe(true)
  })
})

describe('planForStripePriceId', () => {
  it('maps configured price IDs back to plans and rejects unknown ones', async () => {
    vi.stubEnv('STRIPE_PRICE_STANDARD', 'price_std')
    vi.stubEnv('STRIPE_PRICE_PRO', 'price_pro')
    const { planForStripePriceId } = await importPlans()
    expect(planForStripePriceId('price_std')).toBe('standard')
    expect(planForStripePriceId('price_pro')).toBe('pro')
    expect(planForStripePriceId('price_nope')).toBeNull()
    expect(planForStripePriceId(null)).toBeNull()
  })
})

describe('getRollingWeekWindow', () => {
  it('returns a 7-day window ending at now', async () => {
    const { getRollingWeekWindow } = await importPlans()
    const now = new Date('2026-08-07T12:00:00Z')
    const { start, end } = getRollingWeekWindow(now)
    expect(end).toEqual(now)
    expect(start.toISOString()).toBe('2026-07-31T12:00:00.000Z')
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000)
  })
})
