import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getStripe, isStripeConfigured } from '@/lib/billing/stripe'
import { PLAN_CATALOGUE, type PaidPlanId } from '@/lib/billing/plans'
import { getLogger } from '@/lib/logger'

const log = getLogger('billing/change-plan')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAID_PLANS: ReadonlySet<string> = new Set(['standard', 'pro'])
const ACTIVE_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing', 'past_due'])

// Switches an EXISTING subscription to another paid plan by swapping the
// price on its single item. Stripe prorates the change: upgrades are
// invoiced immediately for the difference, downgrades generate a credit
// applied to the next invoice. The webhook (customer.subscription.updated)
// syncs the new plan into `profiles`.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'billing_unavailable' }, { status: 503 })
  }

  let planId: PaidPlanId
  try {
    const body = (await request.json()) as { plan?: unknown }
    if (typeof body.plan !== 'string' || !PAID_PLANS.has(body.plan)) throw new Error()
    planId = body.plan as PaidPlanId
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const priceId = PLAN_CATALOGUE[planId].stripePriceId
  if (!priceId) {
    log.error('plan has no stripe price id', { plan: planId })
    return NextResponse.json({ error: 'plan_unavailable' }, { status: 503 })
  }

  const { data: profile } = await getAdminSupabase()
    .from('profiles')
    .select('plan, stripe_subscription_id, subscription_status')
    .eq('id', user.id)
    .maybeSingle()
  const subscriptionId = profile?.stripe_subscription_id as string | null
  const status = profile?.subscription_status as string | null
  if (!subscriptionId || !status || !ACTIVE_STATUSES.has(status)) {
    // No subscription to modify — the client should use checkout instead.
    return NextResponse.json({ error: 'no_active_subscription' }, { status: 409 })
  }
  if (profile?.plan === planId) {
    return NextResponse.json({ ok: true })
  }

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const item = subscription.items.data[0]
  if (!item) {
    log.error('subscription has no items', { subscriptionId })
    return NextResponse.json({ error: 'subscription_invalid' }, { status: 502 })
  }
  if (item.price.id === priceId) {
    return NextResponse.json({ ok: true })
  }

  await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: item.id, price: priceId }],
    // Invoice prorations immediately: an upgrade charges the prorated
    // difference now; a downgrade credits the unused time to the customer
    // balance, applied to the next invoice.
    proration_behavior: 'always_invoice',
  })

  log.info('plan changed', { userId: user.id, subscriptionId, plan: planId })
  return NextResponse.json({ ok: true })
}
