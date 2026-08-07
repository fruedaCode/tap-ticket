import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isStripeConfigured } from '@/lib/billing/stripe'
import { readBillingSnapshot } from '@/lib/billing/usage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Billing snapshot for the signed-in user, consumed by the /plans page.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const snapshot = await readBillingSnapshot(supabase, user.id)
  return NextResponse.json({
    plan: snapshot.plan,
    subscriptionStatus: snapshot.subscriptionStatus,
    currentPeriodEnd: snapshot.currentPeriodEnd?.toISOString() ?? null,
    hasCustomer: snapshot.stripeCustomerId !== null,
    billingEnabled: isStripeConfigured(),
    usage: {
      count: snapshot.usage.count,
      limit: snapshot.usage.limit === 'unlimited' ? 'unlimited' : snapshot.usage.limit,
      remaining:
        snapshot.usage.remaining === Number.POSITIVE_INFINITY ? 'unlimited' : snapshot.usage.remaining,
    },
  })
}
