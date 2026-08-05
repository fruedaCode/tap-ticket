import { describe, expect, it } from 'vitest'
import { getFinalPrice, getUnitPrice, getUnitThreshold } from '@/lib/split'

const base = { quantity: 2, price: 10, discount_percentage: 0, discount_amount: 0 }

describe('getFinalPrice', () => {
  it('returns price when no discount', () => expect(getFinalPrice(base)).toBe(10))
  it('subtracts discount_amount first', () =>
    expect(getFinalPrice({ ...base, discount_amount: 3, discount_percentage: 50 })).toBe(7))
  it('applies discount_percentage when no amount', () =>
    expect(getFinalPrice({ ...base, discount_percentage: 10 })).toBe(9))
})
it('getUnitPrice divides by quantity', () => expect(getUnitPrice(base)).toBe(5))
it('getUnitThreshold is 1/quantity', () => expect(getUnitThreshold(base)).toBe(0.5))
