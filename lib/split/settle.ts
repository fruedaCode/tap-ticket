import type { ItemAssignment, Settlement, SettlementStatus, TicketItem } from '@/lib/types'
import type { UserBill } from './bill'
import { getPercentagePaid, isItemPaid } from './paid'
import { getFinalPrice } from './price'

type PricedItem = Pick<TicketItem, 'quantity' | 'price' | 'discount_percentage' | 'discount_amount'>

// sum of settlements a user has made with the given status
export function getPaidByStatus(settlements: Settlement[], userId: string, status: SettlementStatus): number {
  return settlements
    .filter((s) => s.from_user === userId && s.status === status)
    .reduce((sum, s) => sum + s.amount, 0)
}

// a submitted proof counts as paid: active = pending or confirmed (rejection reopens the debt)
export function getActivePaid(settlements: Settlement[], userId: string): number {
  return settlements
    .filter((s) => s.from_user === userId && s.status !== 'rejected')
    .reduce((sum, s) => sum + s.amount, 0)
}

// what a user still owes: their share minus active settlements
export function getOutstanding(bill: UserBill, settlements: Settlement[]): number {
  return Math.max(0, bill.total - getActivePaid(settlements, bill.userId))
}

// sum of all active settlements across the group
export function getSettledTotal(settlements: Settlement[]): number {
  return settlements
    .filter((s) => s.status !== 'rejected')
    .reduce((sum, s) => sum + s.amount, 0)
}

// waterfall attribution of each member's active payments across their claimed shares,
// in ticket order (payments are not item-attributed, so this is the attribution rule).
// returns "itemId:userId" pairs whose share is already covered — those claims are locked
export function getCoveredClaims(
  items: Array<PricedItem & { id: string; assignments: ItemAssignment[] }>,
  settlements: Settlement[],
): Set<string> {
  const remaining = new Map<string, number>()
  for (const s of settlements) {
    if (s.status === 'rejected') continue
    remaining.set(s.from_user, (remaining.get(s.from_user) ?? 0) + s.amount)
  }

  const covered = new Set<string>()
  for (const item of items) {
    const price = getFinalPrice(item)
    const claimantIds = [...new Set(item.assignments.map((a) => a.user_id))].filter(
      (id) => getPercentagePaid(item, item.assignments, id) > 0,
    )
    for (const id of claimantIds) {
      const share = getPercentagePaid(item, item.assignments, id) * price
      const left = remaining.get(id) ?? 0
      if (left + 0.005 >= share) covered.add(`${item.id}:${id}`)
      remaining.set(id, Math.max(0, left - share))
    }
  }
  return covered
}

// items that are fully assigned AND paid for: every claimant's share is covered
export function getSettledItemIds(
  items: Array<PricedItem & { id: string; assignments: ItemAssignment[] }>,
  settlements: Settlement[],
): Set<string> {
  const covered = getCoveredClaims(items, settlements)
  const settled = new Set<string>()
  for (const item of items) {
    if (!isItemPaid(item, item.assignments)) continue
    const claimantIds = [...new Set(item.assignments.map((a) => a.user_id))].filter(
      (id) => getPercentagePaid(item, item.assignments, id) > 0,
    )
    if (claimantIds.length > 0 && claimantIds.every((id) => covered.has(`${item.id}:${id}`))) {
      settled.add(item.id)
    }
  }
  return settled
}
