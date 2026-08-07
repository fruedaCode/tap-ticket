import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getScanner } from '@/lib/ai'
import { getLogger } from '@/lib/logger'
import { readBillingPlan, getWeeklyUsage } from '@/lib/billing/usage'

const log = getLogger('scan')

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 10 * 1024 * 1024
const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function shareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return [...bytes].map((b) => TOKEN_ALPHABET[b % 62]).join('')
}

// roll back a half-finished scan: the storage remove must come FIRST — the delete policy is
// owner-only via is_ticket_owner(name::uuid), which goes false once the ticket row is gone;
// the tickets delete then cascades members/items (owner delete policy passes for the caller)
async function cleanupFailedScan(supabase: Awaited<ReturnType<typeof createClient>>, ticketId: string) {
  log.warn('rolling back failed scan', { ticketId })
  const { error: storageError } = await supabase.storage.from('ticket-images').remove([ticketId])
  if (storageError) log.error('rollback: storage remove failed', { ticketId, error: storageError.message })
  const { error: deleteError } = await supabase.from('tickets').delete().eq('id', ticketId) // cascades members/items
  if (deleteError) log.error('rollback: ticket delete failed', { ticketId, error: deleteError.message })
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Per-user weekly scan quota. Plans + limits live in lib/billing/plans.ts.
  // Checked before any work so hitting the cap costs no AI call or DB writes.
  const plan = await readBillingPlan(user.id)
  const usage = await getWeeklyUsage(user.id, plan)
  if (usage.limit !== 'unlimited' && usage.remaining <= 0) {
    log.info('scan limit reached', { userId: user.id, plan, used: usage.count })
    return NextResponse.json(
      { error: 'scan_limit_reached', plan, limit: usage.limit, used: usage.count },
      { status: 402 },
    )
  }

  const form = await request.formData()
  const file = form.get('image')
  if (!(file instanceof File)) return NextResponse.json({ error: 'missing image' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'unsupported type' }, { status: 415 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'image too large' }, { status: 413 })

  log.info('scan started', { userId: user.id, bytes: file.size, type: file.type })
  const buffer = Buffer.from(await file.arrayBuffer())

  // 1) ticket row, id generated route-side, NO .select() (RLS: SELECT requires membership that doesn't exist yet)
  const ticketId = crypto.randomUUID()
  const { error: ticketError } = await supabase
    .from('tickets')
    .insert({ id: ticketId, owner_id: user.id, share_token: shareToken(), img_path: '', restaurant: {}, invoice: {}, totals: {} })
  if (ticketError) {
    log.error('ticket insert failed', { ticketId, error: ticketError.message })
    return NextResponse.json({ error: ticketError.message }, { status: 500 })
  }
  log.debug('ticket row created', { ticketId })

  // 1.5) owner membership MUST come before any ticket update / items insert (RLS requires membership)
  const { error: memberError } = await supabase
    .from('ticket_members')
    .insert({ ticket_id: ticketId, user_id: user.id, role: 'owner', seen: false })
  if (memberError) {
    log.error('owner membership insert failed', { ticketId, error: memberError.message })
    await cleanupFailedScan(supabase, ticketId)
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  // 2) upload the image (object name = ticket UUID; storage insert policy enforces UUID-shaped names)
  const imgPath = ticketId
  const { error: uploadError } = await supabase.storage
    .from('ticket-images')
    .upload(imgPath, buffer, { contentType: file.type })
  if (uploadError) {
    log.error('image upload failed', { ticketId, error: uploadError.message })
    await cleanupFailedScan(supabase, ticketId)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }
  log.debug('image uploaded', { ticketId, bytes: file.size })

  // 3) AI scan
  let inferred
  const aiStartedAt = Date.now()
  try {
    inferred = await getScanner().scan({ base64: buffer.toString('base64'), mediaType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' })
  } catch (e) {
    log.error('AI scan failed', { ticketId, ms: Date.now() - aiStartedAt, error: String(e) })
    await cleanupFailedScan(supabase, ticketId)
    return NextResponse.json({ error: `scan failed: ${e}` }, { status: 502 })
  }
  log.debug('AI scan ok', { ticketId, ms: Date.now() - aiStartedAt, items: inferred.items.length })

  // 4) fill the ticket, items + default owner assignment (owner membership already inserted at 1.5)
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ restaurant: inferred.restaurant, invoice: inferred.invoice, totals: inferred.totals, img_path: imgPath })
    .eq('id', ticketId)
  if (updateError) {
    log.error('ticket update failed', { ticketId, error: updateError.message })
    await cleanupFailedScan(supabase, ticketId)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const { data: items, error: itemsError } = await supabase
    .from('ticket_items')
    .insert(
      inferred.items.map((it, i) => ({
        ticket_id: ticketId,
        position: i,
        quantity: it.quantity,
        description: it.description,
        price: it.price,
        discount_percentage: it.discount_percentage ?? 0,
        discount_amount: it.discount_amount ?? 0,
      })),
    )
    .select('id')
  if (itemsError || !items) {
    log.error('items insert failed', { ticketId, error: itemsError?.message ?? 'no rows returned' })
    await cleanupFailedScan(supabase, ticketId)
    return NextResponse.json({ error: itemsError?.message ?? 'items failed' }, { status: 500 })
  }

  const { error: assignError } = await supabase
    .from('item_assignments')
    .insert(items.map((it) => ({ item_id: it.id, user_id: user.id, payment_type: 'unit', amount: 0 })))
  if (assignError) {
    log.error('assignments insert failed', { ticketId, error: assignError.message })
    await cleanupFailedScan(supabase, ticketId)
    return NextResponse.json({ error: assignError.message }, { status: 500 })
  }

  log.info('scan completed', { ticketId, items: items.length, ms: Date.now() - startedAt })
  return NextResponse.json({ ticketId })
}
