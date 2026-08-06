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
export type Ticket = {
  id: string
  owner_id: string
  share_token: string
  restaurant: Restaurant
  invoice: Invoice
  totals: Totals
  img_path: string
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
export type MemberWithProfile = TicketMember & { profile: Profile }
export type TicketDetail = Ticket & {
  items: TicketItemWithAssignments[]
  members: MemberWithProfile[]
  settlements: Settlement[]
}
