export function numberToCurrency(num: number, lang: string): string {
  // EPSILON pre-round preserves round-half-up (1.005 → 1.01) before Intl formats
  const rounded = Math.round((num + Number.EPSILON) * 100) / 100
  return new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format(rounded)
}

export function numberToPercentage(num: number, unit?: string): string | number {
  return unit ? `${Math.round(num * 100)}${unit}` : Math.round(num * 100)
}
