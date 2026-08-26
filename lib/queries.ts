import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ItemAssignment,
  MemberRole,
  Ticket,
  TicketDetail,
  TicketItem,
  TicketItemWithAssignments,
  MemberWithProfile,
  Trip,
  TripMemberWithProfile,
  TripOverview,
} from '@/lib/types'
import { getTripOverview, type TripTicketInput } from '@/lib/trips'

// list rows embed assignments as `item_assignments` (supabase join), not `assignments`
export type TicketListItem = TicketItem & { item_assignments: ItemAssignment[] }

// normalize a supabase-embedded item row to the assignments key the split/trips helpers use
const withAssignments = ({ item_assignments, ...item }: TicketListItem): TicketItemWithAssignments => ({
  ...item,
  assignments: item_assignments,
})
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
    ? await supabase.from('public_member_profiles').select('*').in('id', userIds)
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
      profile: (profiles ?? []).find((p) => p.id === m.user_id) ?? { id: m.user_id, display_name: null, photo_url: null },
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

export type TripListRow = {
  membership: { trip_id: string; role: MemberRole }
  trip: Trip
  memberCount: number
  tickets: TripTicketInput[]
}

export async function fetchTripList(supabase: SupabaseClient): Promise<TripListRow[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: memberships, error } = await supabase
    .from('trip_members')
    .select('trip_id, role, trips(*)')
    .eq('user_id', user.id)
  if (error) throw error
  const rows = (memberships ?? []).filter((m) => m.trips)
  const tripIds = rows.map((m) => m.trip_id)
  const { data: members } = tripIds.length
    ? await supabase.from('trip_members').select('trip_id').in('trip_id', tripIds)
    : { data: [] }
  const { data: tickets } = tripIds.length
    ? await supabase.from('tickets').select('*').in('trip_id', tripIds)
    : { data: [] }
  const ticketIds = (tickets ?? []).map((t) => t.id)
  const { data: items } = ticketIds.length
    ? await supabase.from('ticket_items').select('*, item_assignments(*)').in('ticket_id', ticketIds)
    : { data: [] }
  return rows.map((m) => ({
    membership: { trip_id: m.trip_id, role: m.role as MemberRole },
    trip: m.trips as unknown as Trip,
    memberCount: (members ?? []).filter((tm) => tm.trip_id === m.trip_id).length,
    tickets: (tickets ?? [])
      .filter((t) => t.trip_id === m.trip_id)
      .map((t): TripTicketInput => ({
        ...(t as Ticket),
        items: ((items ?? []) as TicketListItem[]).filter((i) => i.ticket_id === t.id).map(withAssignments),
      })),
  }))
}

// aggregation is pure (lib/trips): this returns the overview directly, tickets
// already sorted by date desc with undated ones last
export async function fetchTripDetail(supabase: SupabaseClient, tripId: string): Promise<TripOverview> {
  const { data: trip, error } = await supabase.from('trips').select('*').eq('id', tripId).single()
  if (error) throw error
  const { data: members } = await supabase.from('trip_members').select('*').eq('trip_id', tripId)
  const userIds = (members ?? []).map((m) => m.user_id)
  const { data: profiles } = userIds.length
    ? await supabase.from('public_member_profiles').select('*').in('id', userIds)
    : { data: [] }
  const { data: tickets } = await supabase.from('tickets').select('*').eq('trip_id', tripId)
  const ticketIds = (tickets ?? []).map((t) => t.id)
  const { data: items } = ticketIds.length
    ? await supabase.from('ticket_items').select('*, item_assignments(*)').in('ticket_id', ticketIds).order('position')
    : { data: [] }
  return getTripOverview(
    trip as Trip,
    (members ?? []).map((m): TripMemberWithProfile => ({
      ...m,
      profile: (profiles ?? []).find((p) => p.id === m.user_id) ?? { id: m.user_id, display_name: null, photo_url: null },
    })),
    (tickets ?? []).map((t): TripTicketInput => ({
      ...(t as Ticket),
      items: ((items ?? []) as TicketListItem[]).filter((i) => i.ticket_id === t.id).map(withAssignments),
    })),
  )
}

// the user's standalone tickets (RLS already scopes to member tickets) — the
// "add existing ticket to a trip" candidates
export async function fetchTripCandidates(supabase: SupabaseClient): Promise<Ticket[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .is('trip_id', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Ticket[]
}
