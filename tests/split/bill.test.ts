import { expect, it } from 'vitest'
import { groupItemsByUser } from '@/lib/split'

const items = [
  {
    id: 'i1', quantity: 4, description: 'Beer', price: 8, discount_percentage: 0, discount_amount: 0, split_among: 0,
    assignments: [
      { id: 'a1', item_id: 'i1', user_id: 'u1', payment_type: 'unit' as const, amount: 3 },
      { id: 'a2', item_id: 'i1', user_id: 'u2', payment_type: 'unit' as const, amount: 1 },
    ],
  },
  {
    id: 'i2', quantity: 1, description: 'Pizza', price: 10, discount_percentage: 0, discount_amount: 0, split_among: 2,
    assignments: [
      { id: 'a3', item_id: 'i2', user_id: 'u1', payment_type: 'percentage' as const, amount: 0.5 },
      { id: 'a4', item_id: 'i2', user_id: 'u2', payment_type: 'percentage' as const, amount: 0.5 },
    ],
  },
]

it('groups amounts and units per user', () => {
  const bills = groupItemsByUser(items)
  const u1 = bills.find((b) => b.userId === 'u1')!
  const u2 = bills.find((b) => b.userId === 'u2')!
  expect(u1.items).toEqual([
    { description: 'Beer', amount: 6, unit: '3' },
    { description: 'Pizza', amount: 5, unit: '50%' },
  ])
  expect(u2.items).toEqual([
    { description: 'Beer', amount: 2, unit: '1' },
    { description: 'Pizza', amount: 5, unit: '50%' },
  ])
  expect(u1.total).toBe(11)
  expect(u2.total).toBe(7)
})
