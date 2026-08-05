import type { ItemAssignment, TicketItem } from '@/lib/types'
import { numberToPercentage } from '@/lib/currency'
import { getFinalPrice } from './price'
import { getPercentagePaid } from './paid'

export type BillLine = { description: string; amount: number; unit: string }
export type UserBill = { userId: string; items: BillLine[]; total: number }

type Item = Pick<TicketItem, 'quantity' | 'description' | 'price' | 'discount_percentage' | 'discount_amount'> & {
  assignments: ItemAssignment[]
}

export const groupItemsByUser = (items: Item[]): UserBill[] => {
  const byUser = new Map<string, BillLine[]>()
  for (const item of items) {
    for (const a of item.assignments) {
      const line: BillLine = {
        description: item.description,
        amount: getFinalPrice(item) * getPercentagePaid(item, [a]),
        unit: a.payment_type === 'percentage' ? numberToPercentage(a.amount, '%').toString() : a.amount.toString(),
      }
      byUser.set(a.user_id, [...(byUser.get(a.user_id) ?? []), line])
    }
  }
  return [...byUser.entries()].map(([userId, lines]) => ({
    userId,
    items: lines,
    total: lines.reduce((acc, l) => acc + l.amount, 0),
  }))
}
