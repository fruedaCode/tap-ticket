import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getStripe, isStripeConfigured } from '@/lib/billing/stripe'

export async function DELETE() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  // remove the caller's receipt images first — orphaned storage objects would survive the user delete
  const { data: ownedTickets } = await admin.from('tickets').select('id, img_path').eq('owner_id', user.id)
  const imgPaths = (ownedTickets ?? []).map((t) => t.img_path).filter((p): p is string => typeof p === 'string' && p.length > 0)
  if (imgPaths.length > 0) {
    const { error: storageError } = await admin.storage.from('ticket-images').remove(imgPaths)
    if (storageError) console.error('account delete: failed to remove receipt images', storageError)
  }
  // same for settlement proofs — both the user's own proofs and proofs on tickets they own
  const ownedTicketIds = (ownedTickets ?? []).map((t) => t.id)
  const proofFilters = [`from_user.eq.${user.id}`]
  if (ownedTicketIds.length > 0) proofFilters.push(`ticket_id.in.(${ownedTicketIds.join(',')})`)
  const { data: settlements } = await admin.from('settlements').select('proof_path').or(proofFilters.join(','))
  const proofPaths = (settlements ?? []).map((s) => s.proof_path).filter((p): p is string => typeof p === 'string' && p.length > 0)
  if (proofPaths.length > 0) {
    const { error: proofsError } = await admin.storage.from('settlement-proofs').remove(proofPaths)
    if (proofsError) console.error('account delete: failed to remove settlement proofs', proofsError)
  }
  // best-effort Stripe cleanup — a failed customer delete must not block erasure
  const { data: profile } = await admin.from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle()
  if (profile?.stripe_customer_id && isStripeConfigured()) {
    try {
      await getStripe().customers.del(profile.stripe_customer_id)
    } catch (stripeError) {
      console.error('account delete: failed to delete stripe customer', stripeError)
    }
  }
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
