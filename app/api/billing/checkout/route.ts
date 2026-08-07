import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getStripe, isStripeConfigured } from '@/lib/billing/stripe'
import { PLAN_CATALOGUE, type PaidPlanId } from '@/lib/billing/plans'
import { patchBillingProfile, readOrInitStripeCustomerId } from '@/lib/billing/profile'
import { resolveOrigin } from '@/lib/util/origin'
import { getLogger } from '@/lib/logger'

const log = getLogger('billing/checkout')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAID_PLANS: ReadonlySet<string> = new Set(['standard', 'pro'])
const ACTIVE_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing', 'past_due'])

// Creates a Stripe Checkout Session and returns its hosted URL. The client
// redirects to it; on success/cancel Stripe sends the user back to /plans
// where the page reads the freshly-updated `profiles` row written by the
// webhook.
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

  // Users with a live subscription must switch plans via /api/billing/change-plan
  // — a second Checkout Session would stack a duplicate subscription.
  const { data: profile } = await getAdminSupabase()
    .from('profiles')
    .select('stripe_subscription_id, subscription_status')
    .eq('id', user.id)
    .maybeSingle()
  if (
    profile?.stripe_subscription_id &&
    ACTIVE_STATUSES.has((profile.subscription_status as string) ?? '')
  ) {
    return NextResponse.json({ error: 'already_subscribed' }, { status: 409 })
  }

  const origin = await resolveOrigin()
  const stripe = getStripe()

  // Reuse the existing Stripe customer if we have one; create + persist
  // otherwise. Doing it here (rather than letting Checkout auto-create one)
  // avoids duplicate customers when the user opens checkout multiple times
  // before completing it.
  let customerId = await readOrInitStripeCustomerId(user.id)
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: user.id },
    })
    customerId = customer.id
    await patchBillingProfile(user.id, { stripeCustomerId: customerId })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // `userId`/`plan` are echoed back in webhook events under
    // `subscription.metadata` (mirrored via `subscription_data`) so the
    // webhook can route the update without an extra round-trip.
    metadata: { userId: user.id, plan: planId },
    subscription_data: {
      metadata: { userId: user.id, plan: planId },
    },
    success_url: `${origin}/plans?checkout=success`,
    cancel_url: `${origin}/plans?checkout=cancelled`,
    allow_promotion_codes: true,
    automatic_tax: { enabled: false },
  })

  if (!session.url) {
    log.error('checkout session has no url', { sessionId: session.id })
    return NextResponse.json({ error: 'checkout_unavailable' }, { status: 502 })
  }

  return NextResponse.json({ url: session.url })
}
