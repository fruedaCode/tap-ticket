import type {
  Ticket,
  TicketItemWithAssignments,
  Trip,
  TripMemberWithProfile,
  TripOverview,
  TripTicketStatus,
} from '@/lib/types'
import { getTicketPaidPercentage, getTicketTotal, groupItemsByUser } from '@/lib/split'

export type TripTicketInput = Ticket & { items: TicketItemWithAssignments[] }

const makeDate = (year: number, month: number, day: number): Date | null => {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(year, month - 1, day)
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

// invoice.date is free-form text produced by the AI scan (lib/ai/types.ts):
// year-first (YYYY/MM/DD) when it starts with 4 digits, otherwise day-first
// (DD/MM/YYYY or D/M/YY); ISO strings fall through to the Date parser
export const parseTicketDate = (raw: string | null | undefined): Date | null => {
  if (!raw) return null
  const match = raw.trim().match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})/)
  if (match) {
    const [, a, b, c] = match
    if (a.length === 4) return makeDate(+a, +b, +c)
    return makeDate(c.length === 2 ? 2000 + +c : +c, +b, +a)
  }
  const date = new Date(raw)
  return Number.isNaN(+date) ? null : date
}

// ticket date: invoice.date with created_at fallback; null when neither parses
export const getTicketDate = (ticket: Pick<Ticket, 'invoice' | 'created_at'>): Date | null =>
  parseTicketDate(ticket.invoice?.date) ?? parseTicketDate(ticket.created_at)

export const getTripOverview = (
  trip: Trip,
  members: TripMemberWithProfile[],
  tickets: TripTicketInput[],
): TripOverview => {
  const allItems = tickets.flatMap((t) => t.items)
  const total = getTicketTotal(allItems)
  const shareByUser = new Map(groupItemsByUser(allItems).map((b) => [b.userId, b.total]))

  const summaries = tickets.map((ticket) => {
    const ticketTotal = getTicketTotal(ticket.items)
    const assigned = ticketTotal * getTicketPaidPercentage(ticket.items)
    const status: TripTicketStatus =
      assigned <= 0 ? 'open' : assigned >= ticketTotal - 1e-9 ? 'complete' : 'partial'
    return { ticket, date: getTicketDate(ticket), total: ticketTotal, assigned, status }
  })
  // date desc, undated tickets last
  summaries.sort((a, b) => {
    if (a.date === null) return b.date === null ? 0 : 1
    if (b.date === null) return -1
    return +b.date - +a.date
  })

  const dates = summaries.flatMap((s) => (s.date ? [+s.date] : []))
  const assigned = summaries.reduce((acc, s) => acc + s.assigned, 0)

  return {
    trip,
    total,
    assigned,
    unassigned: total - assigned,
    progress_pct: total > 0 ? assigned / total : 0,
    date_start: dates.length ? new Date(Math.min(...dates)).toISOString() : null,
    date_end: dates.length ? new Date(Math.max(...dates)).toISOString() : null,
    members: members.map((member) => {
      const share = shareByUser.get(member.user_id) ?? 0
      return { member, share, share_pct: total > 0 ? share / total : 0 }
    }),
    tickets: summaries.map((s) => ({ ...s, date: s.date ? s.date.toISOString() : null })),
  }
}
