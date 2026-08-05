import { expect, it } from 'vitest'
import { calculateMaxPercentageAvailable, calculateMaxUnitsAvailable } from '@/lib/split'

const item = { id: 'i1', quantity: 4, price: 8, discount_percentage: 0, discount_amount: 0 }
const assignments = [
  { id: 'x', item_id: 'i1', user_id: 'u1', payment_type: 'unit' as const, amount: 1 },
]

it('max units available', () => expect(calculateMaxUnitsAvailable(item, assignments)).toBe(3))
it('max percentage available', () => expect(calculateMaxPercentageAvailable(item, assignments)).toBe(0.75))
it('fully assigned quantity-7 item clamps max units to exactly 0', () => {
  const q7 = { ...item, quantity: 7 }
  const full = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7'].map((u) => ({
    id: u, item_id: 'i1', user_id: u, payment_type: 'unit' as const, amount: 1,
  }))
  expect(calculateMaxUnitsAvailable(q7, full)).toBe(0)
})
