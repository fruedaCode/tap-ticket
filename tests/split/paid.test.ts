import { describe, expect, it } from 'vitest'
import { getPercentagePaid, getTicketPaidPercentage, isItemPaid } from '@/lib/split'
import type { ItemAssignment } from '@/lib/types'

const item = { id: 'i1', quantity: 4, price: 8, discount_percentage: 0, discount_amount: 0 }
const a = (user_id: string, payment_type: 'unit' | 'percentage', amount: number): ItemAssignment =>
  ({ id: `${user_id}-${payment_type}-${amount}`, item_id: 'i1', user_id, payment_type, amount })

describe('getPercentagePaid', () => {
  it('sums unit assignments as amount/quantity', () =>
    expect(getPercentagePaid(item, [a('u1', 'unit', 2)])).toBe(0.5))
  it('sums percentage assignments directly', () =>
    expect(getPercentagePaid(item, [a('u1', 'percentage', 0.25)])).toBe(0.25))
  it('mixes unit and percentage', () =>
    expect(getPercentagePaid(item, [a('u1', 'unit', 1), a('u2', 'percentage', 0.5)])).toBe(0.75))
  it('filters by userId when given', () =>
    expect(getPercentagePaid(item, [a('u1', 'unit', 1), a('u2', 'unit', 2)], 'u2')).toBe(0.5))
})

describe('isItemPaid / getTicketPaidPercentage', () => {
  it('paid when fully covered', () =>
    expect(isItemPaid(item, [a('u1', 'unit', 4)])).toBe(true))
  it('not paid when partially covered', () =>
    expect(isItemPaid(item, [a('u1', 'unit', 3)])).toBe(false))
  it('ticket percentage across items', () => {
    const items = [
      { ...item, assignments: [a('u1', 'unit', 4)] },          // fully paid, 8
      { ...item, id: 'i2', assignments: [a('u1', 'unit', 2)] }, // half paid, 4 of 8
    ]
    expect(getTicketPaidPercentage(items)).toBe(0.75)
  })
})
