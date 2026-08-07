import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { config } from '@/lib/config'
import { getStripe, isStripeConfigured } from '@/lib/billing/stripe'
import { patchBillingProfile, findUserByStripeCustomerId } from '@/lib/billing/profile'
import { planForStripePriceId } from '@/lib/billing/plans'
import { getLogger } from '@/lib/logger'

const log = getLogger('billing/webhook')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Stripe → us. The webhook secret comes from the dashboard (or
// `stripe listen` locally). We MUST verify the signature against the raw
// (un-parsed) request body — Next.js' `req.text()` gives us that. This route
// is in the proxy's PUBLIC_PATHS: the HMAC signature replaces the cookie gate.
//
// Events we care about:
//   * checkout.session.completed        — user finished paying
//   * customer.subscription.created/updated — plan switches, status flips
//   * customer.subscription.deleted     — drop the user back to free
//
// Every handler is idempotent (it just upserts the latest state into
// `profiles`), so Stripe's at-least-once delivery is safe.
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'billing_unavailable' }, { status: 503 })
  }
  if (!config.stripe.webhookSecret) {
    log.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 })
  }

  const rawBody = await req.text()
  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret)
  } catch (err) {
    log.warn('signature verification failed', { error: (err as Error).message })
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event, stripe)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event)
        break
      default:
        log.info('ignored event', { type: event.type, id: event.id })
    }
  } catch (err) {
    // Return 500 so Stripe retries — persistent failures show up in the
    // Stripe dashboard's Events tab.
    log.error('handler threw', { type: event.type, id: event.id, error: (err as Error).message })
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutCompleted(event: Stripe.Event, stripe: Stripe): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session
  const userId = (session.metadata?.userId as string | undefined) ?? null
  const customerId =
    typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null)
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : (session.subscription?.id ?? null)

  if (!subscriptionId) {
    log.warn('checkout.completed without subscription', { id: session.id })
    return
  }

  // Pull the live subscription for canonical state — checkout.session.completed
  // can fire before the customer.subscription.* event.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  await applySubscriptionState(subscription, { userId, customerId })
}

async function handleSubscriptionEvent(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription
  await applySubscriptionState(subscription, {
    userId: (subscription.metadata?.userId as string | undefined) ?? null,
    customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
  })
}

type Resolution = {
  userId: string | null
  customerId: string | null
}

async function applySubscriptionState(
  subscription: Stripe.Subscription,
  hint: Resolution,
): Promise<void> {
  // Prefer subscription metadata (set at checkout); fall back to the stored
  // stripe_customer_id binding.
  let userId = hint.userId
  if (!userId && hint.customerId) {
    userId = await findUserByStripeCustomerId(hint.customerId)
  }
  if (!userId) {
    log.warn('could not resolve user for subscription', {
      subscriptionId: subscription.id,
      customerId: hint.customerId,
    })
    return
  }

  // Single-plan subscriptions: exactly one item carries the priced product.
  const firstItem = subscription.items.data[0]
  const priceId = firstItem?.price.id ?? null
  const plan = planForStripePriceId(priceId)
  const currentPeriodEndUnix = readCurrentPeriodEnd(subscription, firstItem)

  // Cancellation: drop back to free. Keep stripe_customer_id so the user can
  // re-subscribe through the same customer record.
  if (subscription.status === 'canceled') {
    await patchBillingProfile(userId, {
      plan: 'free',
      stripeSubscriptionId: null,
      subscriptionStatus: 'canceled',
      currentPeriodEnd: currentPeriodEndUnix ? new Date(currentPeriodEndUnix * 1000) : null,
    })
    return
  }

  // `past_due` keeps the paid plan during Stripe's automatic payment retries;
  // `incomplete` holds it until the initial payment goes through.
  const ENTITLED: Stripe.Subscription.Status[] = ['active', 'trialing', 'past_due']
  const isEntitled = (ENTITLED as readonly string[]).includes(subscription.status)

  await patchBillingProfile(userId, {
    plan: isEntitled && plan ? plan : 'free',
    stripeCustomerId: hint.customerId ?? undefined,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: currentPeriodEndUnix ? new Date(currentPeriodEndUnix * 1000) : null,
  })
}

function readCurrentPeriodEnd(
  subscription: Stripe.Subscription,
  firstItem: Stripe.SubscriptionItem | undefined,
): number | null {
  // Newer API versions: per-item billing window.
  const fromItem = firstItem
    ? (firstItem as unknown as { current_period_end?: number }).current_period_end
    : undefined
  if (typeof fromItem === 'number') return fromItem
  // Older versions: subscription-root field.
  const fromRoot = (subscription as unknown as { current_period_end?: number }).current_period_end
  return typeof fromRoot === 'number' ? fromRoot : null
}
