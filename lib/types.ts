export type PaymentType = 'unit' | 'percentage'

// ---- AI inference result (ported from RN services/types.ts) ----
export type Restaurant = { name: string; address: string; phone: string; NIF: string }
export type Invoice = { type: string; operation_number: string; table: string; date: string; cashier: string }
export type InferredItem = {
  quantity: number
  description: string
  unitPrice?: number | null
  price: number
  discount_percentage?: number | null
  discount_amount?: number | null
}
export type Totals = { base: number; tax: { percentage: number; amount: number }; total_without_tax: number; total_with_tax: number }
export type InferredTicket = { restaurant: Restaurant; invoice: Invoice; items: InferredItem[]; totals: Totals }

// ---- DB rows ----
export type Profile = { id: string; email: string; display_name: string | null; photo_url: string | null }
// co-member display data comes from the public_member_profiles view (migration 0005),
// which deliberately omits email and billing columns
export type MemberProfile = Pick<Profile, 'id' | 'display_name' | 'photo_url'>
export type Ticket = {
  id: string
  owner_id: string
  share_token: string
  restaurant: Restaurant
  invoice: Invoice
  totals: Totals
  img_path: string
  trip_id: string | null
  created_at: string
}
export type TicketItem = {
  id: string
  ticket_id: string
  position: number
  quantity: number
  description: string
  price: number
  discount_percentage: number
  discount_amount: number
  split_among: number
}
export type ItemAssignment = {
  id: string
  item_id: string
  user_id: string
  payment_type: PaymentType
  amount: number
}
export type MemberRole = 'owner' | 'member'
export type TicketMember = { ticket_id: string; user_id: string; role: MemberRole; seen: boolean }
export type Trip = {
  id: string
  owner_id: string
  name: string
  created_at: string
  updated_at: string
}
export type TripMember = { trip_id: string; user_id: string; role: MemberRole }
export type SettlementStatus = 'pending' | 'confirmed' | 'rejected'
export type Settlement = {
  id: string
  ticket_id: string
  from_user: string
  amount: number
  proof_path: string
  status: SettlementStatus
  created_at: string
  resolved_at: string | null
}

// ---- View models ----
export type TicketItemWithAssignments = TicketItem & { assignments: ItemAssignment[] }
export type MemberWithProfile = TicketMember & { profile: MemberProfile }
export type TicketDetail = Ticket & {
  items: TicketItemWithAssignments[]
  members: MemberWithProfile[]
  settlements: Settlement[]
}

// ---- Trip view models (aggregation computed by lib/trips/overview.ts) ----
export type TripMemberWithProfile = TripMember & { profile: MemberProfile }
export type TripTicketStatus = 'complete' | 'partial' | 'open'
export type TripTicketSummary = {
  ticket: Ticket
  // ISO date: parsed invoice.date with created_at fallback; null when neither parses
  date: string | null
  total: number
  assigned: number
  status: TripTicketStatus
}
export type TripMemberShare = {
  member: TripMemberWithProfile
  share: number
  share_pct: number // fraction 0..1, like getTicketPaidPercentage
}
export type TripOverview = {
  trip: Trip
  total: number
  assigned: number
  unassigned: number
  progress_pct: number // fraction 0..1
  date_start: string | null // ISO; null when no ticket has a parseable date
  date_end: string | null
  members: TripMemberShare[] // every trip member, even with share 0
  tickets: TripTicketSummary[] // sorted by date desc, undated tickets last
}
