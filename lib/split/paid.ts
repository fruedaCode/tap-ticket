import type { ItemAssignment, TicketItem } from '@/lib/types'
import { getFinalPrice, getUnitThreshold } from './price'

type Item = Pick<TicketItem, 'quantity' | 'price' | 'discount_percentage' | 'discount_amount'>

const sumBy = <T>(arr: T[], fn: (t: T) => number) => arr.reduce((acc, t) => acc + fn(t), 0)

export const getPercentagePaid = (item: Item, assignments: ItemAssignment[], userId?: string): number => {
  const threshold = getUnitThreshold(item)
  const toCount = userId === undefined ? assignments : assignments.filter((a) => a.user_id === userId)
  return sumBy(toCount, (a) => (a.payment_type === 'unit' ? a.amount * threshold : a.amount))
}

export const isItemPaid = (item: Item, assignments: ItemAssignment[]): boolean =>
  Math.abs(1 - getPercentagePaid(item, assignments)) < 1e-9

export const getTicketPaidPercentage = (
  items: Array<Item & { assignments: ItemAssignment[] }>,
): number => {
  const total = sumBy(items, (it) => getFinalPrice(it))
  if (total === 0) return 0
  const paid = sumBy(items, (it) => getFinalPrice(it) * getPercentagePaid(it, it.assignments))
  return paid / total
}
