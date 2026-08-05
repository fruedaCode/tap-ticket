import type { ItemAssignment, TicketItem } from '@/lib/types'
import { getPercentagePaid } from './paid'
import { getUnitThreshold } from './price'

type Item = Pick<TicketItem, 'quantity' | 'price' | 'discount_percentage' | 'discount_amount'>

export const calculateMaxUnitsAvailable = (item: Item, assignments: ItemAssignment[]): number =>
  item.quantity - getPercentagePaid(item, assignments) / getUnitThreshold(item)

export const calculateMaxPercentageAvailable = (item: Item, assignments: ItemAssignment[]): number =>
  1 - getPercentagePaid(item, assignments)
