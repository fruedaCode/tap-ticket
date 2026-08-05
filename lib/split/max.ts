import type { ItemAssignment, TicketItem } from '@/lib/types'
import { getPercentagePaid } from './paid'
import { getUnitThreshold } from './price'

type Item = Pick<TicketItem, 'quantity' | 'price' | 'discount_percentage' | 'discount_amount'>

// Snap float-summation residue (|n| < 1e-9, positive or negative) to exactly 0
const clampZero = (n: number): number => Math.max(0, Math.abs(n) < 1e-9 ? 0 : n)

export const calculateMaxUnitsAvailable = (item: Item, assignments: ItemAssignment[]): number =>
  clampZero(item.quantity - getPercentagePaid(item, assignments) / getUnitThreshold(item))

export const calculateMaxPercentageAvailable = (item: Item, assignments: ItemAssignment[]): number =>
  clampZero(1 - getPercentagePaid(item, assignments))
