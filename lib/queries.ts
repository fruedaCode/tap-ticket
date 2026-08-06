import type { SupabaseClient } from '@supabase/supabase-js'
import type { ItemAssignment, Ticket, TicketDetail, TicketItem, TicketItemWithAssignments, MemberWithProfile } from '@/lib/types'

// list rows embed assignments as `item_assignments` (supabase join), not `assignments`
export type TicketListItem = TicketItem & { item_assignments: ItemAssignment[] }
export type TicketListRow = {
  membership: { ticket_id: string; seen: boolean; role: 'owner' | 'member' }
  ticket: Ticket
  items: TicketListItem[]
}

export async function fetchTicketDetail(supabase: SupabaseClient, ticketId: string): Promise<TicketDetail> {
  const { data: ticket, error } = await supabase.from('tickets').select('*').eq('id', ticketId).single()
  if (error) throw error
  const { data: items } = await supabase.from('ticket_items').select('*').eq('ticket_id', ticketId).order('position')
  const itemIds = (items ?? []).map((i) => i.id)
  const { data: assignments } = itemIds.length
    ? await supabase.from('item_assignments').select('*').in('item_id', itemIds)
    : { data: [] }
  const { data: members } = await supabase.from('ticket_members').select('*').eq('ticket_id', ticketId)
  const userIds = (members ?? []).map((m) => m.user_id)
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('*').in('id', userIds)
    : { data: [] }
  const { data: settlements } = await supabase
    .from('settlements')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at')
  return {
    ...ticket,
    items: (items ?? []).map((i): TicketItemWithAssignments => ({
      ...i,
      assignments: (assignments ?? []).filter((a) => a.item_id === i.id),
    })),
    members: (members ?? []).map((m): MemberWithProfile => ({
      ...m,
      profile: (profiles ?? []).find((p) => p.id === m.user_id) ?? { id: m.user_id, email: '', display_name: null, photo_url: null },
    })),
    settlements: settlements ?? [],
  }
}

export async function fetchTicketList(supabase: SupabaseClient): Promise<TicketListRow[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: memberships, error } = await supabase
    .from('ticket_members')
    .select('ticket_id, seen, role, tickets(*)')
    .eq('user_id', user.id)
    .order('seen', { ascending: true })
  if (error) throw error
  const rows = (memberships ?? []).filter((m) => m.tickets)
  const ticketIds = rows.map((m) => m.ticket_id)
  const { data: items } = ticketIds.length
    ? await supabase.from('ticket_items').select('*, item_assignments(*)').in('ticket_id', ticketIds)
    : { data: [] }
  return rows.map((m) => ({
    membership: { ticket_id: m.ticket_id, seen: m.seen, role: m.role },
    ticket: m.tickets as unknown as Ticket,
    items: ((items ?? []) as TicketListItem[]).filter((i) => i.ticket_id === m.ticket_id),
  }))
}
