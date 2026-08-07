import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getStripe, isStripeConfigured } from '@/lib/billing/stripe'
import { getLogger } from '@/lib/logger'

const log = getLogger('billing/cancel')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACTIVE_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing', 'past_due'])

// Cancels the user's subscription IMMEDIATELY and refunds the unused part of
// the current period to their card, proportionally to the remaining days.
// The webhook (customer.subscription.deleted) drops the user back to `free`.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'billing_unavailable' }, { status: 503 })
  }

  const { data: profile } = await getAdminSupabase()
    .from('profiles')
    .select('stripe_subscription_id, subscription_status')
    .eq('id', user.id)
    .maybeSingle()
  const subscriptionId = profile?.stripe_subscription_id as string | null
  const status = profile?.subscription_status as string | null
  if (!subscriptionId || !status || !ACTIVE_STATUSES.has(status)) {
    return NextResponse.json({ error: 'no_active_subscription' }, { status: 409 })
  }

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const item = subscription.items.data[0]
  const periodStart = item?.current_period_start
  const periodEnd = item?.current_period_end

  // Compute the prorated refund BEFORE cancelling: unused fraction of the
  // period × amount actually paid on the latest invoice.
  let refundAmount = 0
  let chargeId: string | null = null
  let paymentIntentId: string | null = null
  const latestInvoice =
    typeof subscription.latest_invoice === 'string'
      ? subscription.latest_invoice
      : (subscription.latest_invoice?.id ?? null)
  if (latestInvoice && periodStart && periodEnd && periodEnd > periodStart) {
    const invoice = await stripe.invoices.retrieve(latestInvoice)
    const now = Math.floor(Date.now() / 1000)
    const unusedRatio = Math.min(1, Math.max(0, (periodEnd - now) / (periodEnd - periodStart)))
    refundAmount = Math.round(invoice.amount_paid * unusedRatio)
    if (refundAmount > 0) {
      const payments = await stripe.invoicePayments.list({ invoice: invoice.id, limit: 10 })
      const paid = payments.data.find((p) => p.status === 'paid') ?? payments.data[0]
      const charge = paid?.payment.charge
      const pi = paid?.payment.payment_intent
      chargeId = typeof charge === 'string' ? charge : (charge?.id ?? null)
      paymentIntentId = typeof pi === 'string' ? pi : (pi?.id ?? null)
    }
  }

  await stripe.subscriptions.cancel(subscriptionId)

  if (refundAmount > 0 && (chargeId || paymentIntentId)) {
    await stripe.refunds.create({
      ...(chargeId ? { charge: chargeId } : { payment_intent: paymentIntentId! }),
      amount: refundAmount,
    })
    log.info('prorated refund issued', { userId: user.id, subscriptionId, refundAmount })
  } else if (refundAmount > 0) {
    log.warn('could not locate charge for prorated refund', { subscriptionId, refundAmount })
  }

  log.info('subscription cancelled', { userId: user.id, subscriptionId })
  return NextResponse.json({ ok: true, refunded: refundAmount })
}
