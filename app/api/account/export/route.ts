import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// GDPR Art. 15/20: export everything we hold about the caller as a JSON download.
export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = getAdminSupabase()

  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle()

  // tickets the user owns, with their items, assignments and members
  const { data: ownedTickets } = await admin.from('tickets').select('*').eq('owner_id', user.id)
  const ownedTicketIds = (ownedTickets ?? []).map((t) => t.id)
  const { data: items } = ownedTicketIds.length
    ? await admin.from('ticket_items').select('*').in('ticket_id', ownedTicketIds)
    : { data: [] }
  const itemIds = (items ?? []).map((i) => i.id)
  const { data: assignments } = itemIds.length
    ? await admin.from('item_assignments').select('*').in('item_id', itemIds)
    : { data: [] }
  const { data: ownedMembers } = ownedTicketIds.length
    ? await admin.from('ticket_members').select('*').in('ticket_id', ownedTicketIds)
    : { data: [] }

  // membership rows on other people's tickets
  const { data: memberships } = await admin.from('ticket_members').select('*').eq('user_id', user.id)

  // settlements the user paid, plus settlements recorded on tickets they own
  const { data: ownSettlements } = await admin.from('settlements').select('*').eq('from_user', user.id)
  const { data: ticketSettlements } = ownedTicketIds.length
    ? await admin.from('settlements').select('*').in('ticket_id', ownedTicketIds)
    : { data: [] }
  const settlements = [...(ownSettlements ?? []), ...(ticketSettlements ?? [])].filter(
    (s, i, all) => all.findIndex((o) => o.id === s.id) === i,
  )

  const data = {
    exported_at: new Date().toISOString(),
    profile: profile ?? null,
    owned_tickets: (ownedTickets ?? []).map((t) => ({
      ...t,
      items: (items ?? [])
        .filter((i) => i.ticket_id === t.id)
        .map((i) => ({ ...i, assignments: (assignments ?? []).filter((a) => a.item_id === i.id) })),
      members: (ownedMembers ?? []).filter((m) => m.ticket_id === t.id),
    })),
    memberships: memberships ?? [],
    settlements,
  }

  return NextResponse.json(data, {
    headers: { 'Content-Disposition': 'attachment; filename="tapticket-export.json"' },
  })
}
