import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getLogger } from '@/lib/logger'
import { PLAN_CATALOGUE, getRollingWeekWindow, type PlanId, type PlanLimit } from '@/lib/billing/plans'

const log = getLogger('billing/usage')

// Weekly quota math + DB reads. A "scan" is a `tickets` row owned by the
// user created within the rolling 7-day window — failed scans are rolled
// back by /api/scan, so only successful scans consume quota.

export type WeeklyUsage = {
  count: number
  limit: PlanLimit
  remaining: number // Number.POSITIVE_INFINITY when unlimited
  windowStart: Date
  windowEnd: Date
}

export { getRollingWeekWindow }

// Count the user's scans in the rolling window. Uses the admin (secret-key)
// client so the same read works from user-context routes and webhooks.
export async function countRecentScans(userId: string, now: Date = new Date()): Promise<number> {
  const { start } = getRollingWeekWindow(now)
  const { count, error } = await getAdminSupabase()
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .gte('created_at', start.toISOString())
  if (error) {
    // Fail-open on transient DB errors — better to let a paying user scan
    // than to lock them out over a flaky read.
    log.warn('countRecentScans failed', { error: error.message })
    return 0
  }
  return count ?? 0
}

export async function getWeeklyUsage(
  userId: string,
  plan: PlanId,
  now: Date = new Date(),
): Promise<WeeklyUsage> {
  const limit = PLAN_CATALOGUE[plan].weeklyLimit
  const { start, end } = getRollingWeekWindow(now)
  const count = limit === 'unlimited' ? 0 : await countRecentScans(userId, now)
  const remaining = limit === 'unlimited' ? Number.POSITIVE_INFINITY : Math.max(0, limit - count)
  return { count, limit, remaining, windowStart: start, windowEnd: end }
}

// Read the billing-relevant profile field for a user. Goes through the admin
// client so it works from both user-context routes and webhooks.
export async function readBillingPlan(userId: string): Promise<PlanId> {
  const { data } = await getAdminSupabase()
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .maybeSingle()
  return ((data?.plan as PlanId | undefined) ?? 'free')
}

// Full billing snapshot for the /plans page: plan + Stripe attribution +
// weekly usage. Read through the user's own client (RLS allows reading any
// profile) so no elevated privileges are needed for the page itself.
export type BillingSnapshot = {
  plan: PlanId
  stripeCustomerId: string | null
  subscriptionStatus: string | null
  currentPeriodEnd: Date | null
  usage: WeeklyUsage
}

export async function readBillingSnapshot(
  userSupabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<BillingSnapshot> {
  const { data } = await userSupabase
    .from('profiles')
    .select('plan, stripe_customer_id, subscription_status, subscription_current_period_end')
    .eq('id', userId)
    .maybeSingle()

  const plan = ((data?.plan as PlanId | undefined) ?? 'free')
  const usage = await getWeeklyUsage(userId, plan, now)
  return {
    plan,
    stripeCustomerId: (data?.stripe_customer_id as string | null) ?? null,
    subscriptionStatus: (data?.subscription_status as string | null) ?? null,
    currentPeriodEnd: data?.subscription_current_period_end
      ? new Date(data.subscription_current_period_end as string)
      : null,
    usage,
  }
}
