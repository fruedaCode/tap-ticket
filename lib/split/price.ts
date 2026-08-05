import type { TicketItem } from '@/lib/types'

type PricedItem = Pick<TicketItem, 'quantity' | 'price' | 'discount_percentage' | 'discount_amount'>

export const getFinalPrice = (item: PricedItem): number => {
  if (item.discount_amount > 0) return item.price - item.discount_amount
  if (item.discount_percentage > 0) return item.price - item.price * (item.discount_percentage / 100)
  return item.price
}

export const getUnitThreshold = (item: Pick<TicketItem, 'quantity'>): number => 1 / item.quantity
export const getUnitPrice = (item: PricedItem): number => item.price / item.quantity
