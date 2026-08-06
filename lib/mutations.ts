import type { SupabaseClient } from '@supabase/supabase-js'
import type { Invoice, PaymentType, Restaurant, TicketItemWithAssignments, Totals } from '@/lib/types'

// upsert one user's share of one item
export async function setItemAmount(
  supabase: SupabaseClient,
  itemId: string,
  userId: string,
  paymentType: PaymentType,
  amount: number,
) {
  const { error } = await supabase
    .from('item_assignments')
    .upsert({ item_id: itemId, user_id: userId, payment_type: paymentType, amount }, { onConflict: 'item_id,user_id' })
  if (error) throw error
}

// split item evenly among N; selected user takes 1/N, rest 0 (RN handleSplitItem)
export async function splitItem(supabase: SupabaseClient, item: TicketItemWithAssignments, n: number, userId: string) {
  const { error } = await supabase.from('ticket_items').update({ split_among: n }).eq('id', item.id)
  if (error) throw error
  const { error: aErr } = await supabase.from('item_assignments').upsert(
    item.assignments.map((a) => ({
      item_id: item.id,
      user_id: a.user_id,
      payment_type: 'percentage' as const,
      amount: a.user_id === userId ? 1 / n : 0,
    })),
    { onConflict: 'item_id,user_id' },
  )
  if (aErr) throw aErr
}

export async function unsplitItem(supabase: SupabaseClient, item: TicketItemWithAssignments) {
  const { error } = await supabase.from('ticket_items').update({ split_among: 0 }).eq('id', item.id)
  if (error) throw error
  const { error: aErr } = await supabase.from('item_assignments').upsert(
    item.assignments.map((a) => ({ item_id: item.id, user_id: a.user_id, payment_type: 'unit' as const, amount: 0 })),
    { onConflict: 'item_id,user_id' },
  )
  if (aErr) throw aErr
}

export async function updateTicketFields(
  supabase: SupabaseClient,
  ticketId: string,
  fields: { restaurant?: Restaurant; invoice?: Invoice; totals?: Totals },
) {
  const { error } = await supabase.from('tickets').update(fields).eq('id', ticketId)
  if (error) throw error
}

export async function updateItemFields(
  supabase: SupabaseClient,
  itemId: string,
  fields: Partial<Pick<TicketItemWithAssignments, 'quantity' | 'description' | 'price' | 'discount_percentage' | 'discount_amount'>>,
) {
  const { error } = await supabase.from('ticket_items').update(fields).eq('id', itemId)
  if (error) throw error
}

export async function deleteTicket(supabase: SupabaseClient, ticketId: string, imgPath: string) {
  // storage removes must come before the row delete: the delete policies key off the ticket row
  await supabase.storage.from('ticket-images').remove([imgPath])
  const { data: proofs } = await supabase.storage.from('settlement-proofs').list(ticketId)
  if (proofs?.length) {
    await supabase.storage.from('settlement-proofs').remove(proofs.map((p) => `${ticketId}/${p.name}`))
  }
  const { error } = await supabase.from('tickets').delete().eq('id', ticketId)
  if (error) throw error
}

export async function removeMember(supabase: SupabaseClient, ticketId: string, userId: string) {
  const { error } = await supabase.from('ticket_members').delete().eq('ticket_id', ticketId).eq('user_id', userId)
  if (error) throw error
}

export async function markSeen(supabase: SupabaseClient, ticketId: string, userId: string) {
  await supabase.from('ticket_members').update({ seen: true }).eq('ticket_id', ticketId).eq('user_id', userId)
}

export async function joinTicket(supabase: SupabaseClient, ticketId: string, token: string) {
  const { error } = await supabase.rpc('join_ticket', { p_ticket_id: ticketId, p_token: token })
  if (error) throw error
}

export async function addMemberByEmail(supabase: SupabaseClient, ticketId: string, email: string) {
  const { error } = await supabase.rpc('add_member_by_email', { p_ticket_id: ticketId, p_email: email })
  if (error) throw error
}

const PROOF_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_PROOF_BYTES = 10 * 1024 * 1024

// upload the proof photo for a settlement; returns the storage path to store on the row
export async function uploadSettlementProof(
  supabase: SupabaseClient,
  ticketId: string,
  settlementId: string,
  file: File,
): Promise<string> {
  if (!PROOF_TYPES.has(file.type)) throw new Error('unsupported type')
  if (file.size > MAX_PROOF_BYTES) throw new Error('image too large')
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${ticketId}/${settlementId}.${ext}`
  const { error } = await supabase.storage.from('settlement-proofs').upload(path, file, { contentType: file.type })
  if (error) throw error
  return path
}

export async function createSettlement(
  supabase: SupabaseClient,
  settlement: { id: string; ticketId: string; fromUserId: string; amount: number; proofPath: string },
) {
  const { error } = await supabase.from('settlements').insert({
    id: settlement.id,
    ticket_id: settlement.ticketId,
    from_user: settlement.fromUserId,
    amount: settlement.amount,
    proof_path: settlement.proofPath,
  })
  if (error) {
    // best-effort cleanup; may be blocked by RLS for non-owners (owner-only delete policy)
    await supabase.storage.from('settlement-proofs').remove([settlement.proofPath])
    throw error
  }
}

// another member confirms or rejects a claimed payment (RLS blocks the payer)
export async function resolveSettlement(supabase: SupabaseClient, id: string, status: 'confirmed' | 'rejected') {
  const { error } = await supabase.from('settlements').update({ status }).eq('id', id)
  if (error) throw error
}
