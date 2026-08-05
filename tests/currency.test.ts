import { describe, expect, it } from 'vitest'
import { numberToCurrency, numberToPercentage } from '@/lib/currency'

describe('numberToCurrency', () => {
  it('uses dot decimals for en', () => expect(numberToCurrency(12.5, 'en')).toBe('12.50'))
  it('uses comma decimals for es', () => expect(numberToCurrency(12.5, 'es')).toBe('12,50'))
  it('uses comma decimals for ca', () => expect(numberToCurrency(3.456, 'ca')).toBe('3,46'))
  it('rounds half up to 2 decimals', () => expect(numberToCurrency(1.005, 'en')).toBe('1.01'))
  it('handles zero', () => expect(numberToCurrency(0, 'es')).toBe('0,00'))
})

describe('numberToPercentage', () => {
  it('converts fraction to integer percent with unit', () => expect(numberToPercentage(0.5, '%')).toBe('50%'))
  it('converts fraction to integer percent without unit', () => expect(numberToPercentage(0.25)).toBe(25))
})
