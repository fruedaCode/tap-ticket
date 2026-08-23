import { describe, expect, it } from 'vitest'
import { numberToCurrency, numberToPercentage } from '@/lib/currency'

const eur = (lang: string, num: number) =>
  new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format(num)

describe('numberToCurrency', () => {
  it('formats en with the € symbol before the amount', () =>
    expect(numberToCurrency(12.5, 'en')).toBe('€12.50'))
  it('formats es with the € symbol placed per locale', () =>
    expect(numberToCurrency(12.5, 'es')).toBe(eur('es', 12.5)))
  it('formats ca with comma decimals', () => expect(numberToCurrency(3.456, 'ca')).toBe(eur('ca', 3.46)))
  it('rounds half up to 2 decimals', () => expect(numberToCurrency(1.005, 'en')).toBe('€1.01'))
  it('handles zero', () => expect(numberToCurrency(0, 'es')).toBe(eur('es', 0)))
})

describe('numberToPercentage', () => {
  it('converts fraction to integer percent with unit', () => expect(numberToPercentage(0.5, '%')).toBe('50%'))
  it('converts fraction to integer percent without unit', () => expect(numberToPercentage(0.25)).toBe(25))
})
