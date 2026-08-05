import { describe, expect, it } from 'vitest'
import { calculateMaxPercentageAvailable, calculateMaxUnitsAvailable } from '@/lib/split'

const item = { id: 'i1', quantity: 4, price: 8, discount_percentage: 0, discount_amount: 0 }
const assignments = [
  { id: 'x', item_id: 'i1', user_id: 'u1', payment_type: 'unit' as const, amount: 1 },
]

it('max units available', () => expect(calculateMaxUnitsAvailable(item, assignments)).toBe(3))
it('max percentage available', () => expect(calculateMaxPercentageAvailable(item, assignments)).toBe(0.75))
