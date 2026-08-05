export function numberToCurrency(num: number, lang: string): string {
  const fixed = (Math.round((num + Number.EPSILON) * 100) / 100).toFixed(2)
  return lang === 'en' ? fixed : fixed.replace('.', ',')
}

export function numberToPercentage(num: number, unit?: string): string | number {
  return unit ? `${Math.round(num * 100)}${unit}` : Math.round(num * 100)
}
