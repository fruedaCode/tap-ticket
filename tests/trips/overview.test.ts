import { expect, it } from 'vitest'
import { getTripOverview, type TripTicketInput } from '@/lib/trips'
import type {
  ItemAssignment,
  TicketItemWithAssignments,
  Trip,
  TripMemberWithProfile,
} from '@/lib/types'

const trip: Trip = {
  id: 'trip1',
  owner_id: 'u1',
  name: 'Lisbon',
  created_at: '2024-12-01T00:00:00Z',
  updated_at: '2024-12-01T00:00:00Z',
}

const member = (userId: string, role: 'owner' | 'member' = 'member'): TripMemberWithProfile => ({
  trip_id: trip.id,
  user_id: userId,
  role,
  profile: { id: userId, display_name: userId, photo_url: null },
})

const assignment = (id: string, itemId: string, userId: string, paymentType: 'unit' | 'percentage', amount: number): ItemAssignment => ({
  id,
  item_id: itemId,
  user_id: userId,
  payment_type: paymentType,
  amount,
})

const item = (id: string, ticketId: string, price: number, assignments: ItemAssignment[]): TicketItemWithAssignments => ({
  id,
  ticket_id: ticketId,
  position: 0,
  quantity: 1,
  description: id,
  price,
  discount_percentage: 0,
  discount_amount: 0,
  split_among: 0,
  assignments,
})

const ticket = (id: string, invoiceDate: string, createdAt: string, items: TicketItemWithAssignments[]): TripTicketInput => ({
  id,
  owner_id: 'u1',
  share_token: `tok-${id}`,
  restaurant: { name: '', address: '', phone: '', NIF: '' },
  invoice: { type: '', operation_number: '', table: '', date: invoiceDate, cashier: '' },
  totals: { base: 0, tax: { percentage: 0, amount: 0 }, total_without_tax: 0, total_with_tax: 0 },
  img_path: '',
  trip_id: trip.id,
  created_at: createdAt,
  items,
})

it('aggregates totals, shares and per-ticket status across tickets', () => {
  const a = ticket('tk1', '04/12/2024', '2024-12-04T10:00:00Z', [
    item('a1', 'tk1', 10, [assignment('as1', 'a1', 'u1', 'unit', 1)]),
  ])
  const b = ticket('tk2', '05/12/2024', '2024-12-05T10:00:00Z', [
    item('b1', 'tk2', 20, [assignment('as2', 'b1', 'u2', 'percentage', 0.5)]),
  ])
  const overview = getTripOverview(trip, [member('u1', 'owner'), member('u2'), member('u3')], [a, b])

  expect(overview.total).toBe(30)
  expect(overview.assigned).toBe(20)
  expect(overview.unassigned).toBe(10)
  expect(overview.progress_pct).toBeCloseTo(2 / 3)

  const u1 = overview.members.find((m) => m.member.user_id === 'u1')!
  const u2 = overview.members.find((m) => m.member.user_id === 'u2')!
  expect(u1.share).toBe(10)
  expect(u2.share).toBe(10)
  expect(u1.share_pct).toBeCloseTo(1 / 3)
  expect(u2.share_pct).toBeCloseTo(1 / 3)

  // sorted by date desc: tk2 (05/12) before tk1 (04/12)
  expect(overview.tickets.map((t) => t.ticket.id)).toEqual(['tk2', 'tk1'])
  expect(overview.tickets[0].status).toBe('partial')
  expect(overview.tickets[0].assigned).toBe(10)
  expect(overview.tickets[1].status).toBe('complete')
  expect(overview.tickets[1].assigned).toBe(10)

  expect(overview.date_start).toBe(new Date(2024, 11, 4).toISOString())
  expect(overview.date_end).toBe(new Date(2024, 11, 5).toISOString())
})

it('handles a trip with zero tickets', () => {
  const overview = getTripOverview(trip, [member('u1', 'owner'), member('u2')], [])
  expect(overview.total).toBe(0)
  expect(overview.assigned).toBe(0)
  expect(overview.unassigned).toBe(0)
  expect(overview.progress_pct).toBe(0)
  expect(overview.date_start).toBeNull()
  expect(overview.date_end).toBeNull()
  expect(overview.tickets).toEqual([])
  expect(overview.members.every((m) => m.share === 0 && m.share_pct === 0)).toBe(true)
})

it('marks a ticket with no assignments as open', () => {
  const t = ticket('tk1', '04/12/2024', '2024-12-04T10:00:00Z', [item('a1', 'tk1', 10, [])])
  const overview = getTripOverview(trip, [member('u1', 'owner')], [t])
  expect(overview.tickets[0].status).toBe('open')
  expect(overview.tickets[0].assigned).toBe(0)
  expect(overview.assigned).toBe(0)
  expect(overview.progress_pct).toBe(0)
})

it('includes members with zero share', () => {
  const t = ticket('tk1', '04/12/2024', '2024-12-04T10:00:00Z', [
    item('a1', 'tk1', 10, [assignment('as1', 'a1', 'u1', 'unit', 1)]),
  ])
  const overview = getTripOverview(trip, [member('u1', 'owner'), member('u2')], [t])
  const u2 = overview.members.find((m) => m.member.user_id === 'u2')!
  expect(u2.share).toBe(0)
  expect(u2.share_pct).toBe(0)
})

it('sorts undated tickets last and excludes them from the date range', () => {
  const dated = ticket('tk1', '04/12/2024', '2024-12-04T10:00:00Z', [item('a1', 'tk1', 10, [])])
  const undated = ticket('tk2', '', 'not-a-date', [item('b1', 'tk2', 5, [])])
  // no invoice date: falls back to created_at
  const fallback = ticket('tk3', '', '2024-12-03T10:00:00Z', [item('c1', 'tk3', 8, [])])
  const overview = getTripOverview(trip, [member('u1', 'owner')], [undated, dated, fallback])

  expect(overview.tickets.map((t) => t.ticket.id)).toEqual(['tk1', 'tk3', 'tk2'])
  expect(overview.tickets[2].date).toBeNull()
  expect(overview.date_start).toBe(new Date(2024, 11, 3).toISOString())
  expect(overview.date_end).toBe(new Date(2024, 11, 4).toISOString())
})
