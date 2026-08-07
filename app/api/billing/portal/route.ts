import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, isStripeConfigured } from '@/lib/billing/stripe'
import { readOrInitStripeCustomerId } from '@/lib/billing/profile'
import { resolveOrigin } from '@/lib/util/origin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Creates a Stripe Customer Portal session (manage/cancel subscription,
// update payment method) and returns its hosted URL.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'billing_unavailable' }, { status: 503 })
  }

  const customerId = await readOrInitStripeCustomerId(user.id)
  if (!customerId) {
    return NextResponse.json({ error: 'no_customer' }, { status: 409 })
  }

  const origin = await resolveOrigin()
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/plans`,
  })

  return NextResponse.json({ url: session.url })
}
