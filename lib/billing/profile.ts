import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getLogger } from '@/lib/logger'
import type { PlanId } from '@/lib/billing/plans'

const log = getLogger('billing/profile')

// Webhook/checkout-side writes to `profiles.plan` and the Stripe attribution
// columns. Always through the service-role client — RLS (migration 0003)
// forbids users from changing these columns themselves.

export type BillingProfilePatch = {
  plan?: PlanId
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  subscriptionStatus?: string | null
  currentPeriodEnd?: Date | null
}

export async function patchBillingProfile(userId: string, patch: BillingProfilePatch): Promise<void> {
  const update: Record<string, unknown> = {}
  if (patch.plan !== undefined) update.plan = patch.plan
  if (patch.stripeCustomerId !== undefined) update.stripe_customer_id = patch.stripeCustomerId
  if (patch.stripeSubscriptionId !== undefined) update.stripe_subscription_id = patch.stripeSubscriptionId
  if (patch.subscriptionStatus !== undefined) update.subscription_status = patch.subscriptionStatus
  if (patch.currentPeriodEnd !== undefined) {
    update.subscription_current_period_end = patch.currentPeriodEnd
      ? patch.currentPeriodEnd.toISOString()
      : null
  }
  if (Object.keys(update).length === 0) return

  const { error } = await getAdminSupabase().from('profiles').update(update).eq('id', userId)
  if (error) log.warn('patchBillingProfile failed', { error: error.message })
}

// Look up a user by their Stripe customer ID. Used by the webhook when the
// event only carries the customer reference (not our user ID).
export async function findUserByStripeCustomerId(customerId: string): Promise<string | null> {
  const { data } = await getAdminSupabase()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return (data?.id as string | undefined) ?? null
}

// Read the stored Stripe customer ID for a user (null when none yet).
export async function readOrInitStripeCustomerId(userId: string): Promise<string | null> {
  const { data } = await getAdminSupabase()
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle()
  return (data?.stripe_customer_id as string | undefined) ?? null
}
