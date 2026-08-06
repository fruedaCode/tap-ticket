import { describe, expect, it } from 'vitest'
import { parseScanResponse } from '@/lib/ai/parser'

const ticketJson = `{"restaurant":{"name":"Bar X","address":"C/ Y 1","phone":"93","NIF":"B1"},"invoice":{"type":"SIMPLIFICADA","operation_number":"1","table":"3","date":"04/12/2024","cashier":"Ana"},"items":[{"quantity":2,"description":"Caña","unitPrice":2.5,"price":5,"discount_percentage":null,"discount_amount":null}],"totals":{"base":4.55,"tax":{"percentage":10,"amount":0.45},"total_without_tax":4.55,"total_with_tax":5}}`

it('extracts fenced json', () => {
  const t = parseScanResponse(`Here you go:\n\`\`\`json\n${ticketJson}\n\`\`\`\nDone`)
  expect(t.restaurant.name).toBe('Bar X')
  expect(t.items[0].discount_amount).toBeNull()
})

it('parses unfenced json', () => {
  const t = parseScanResponse(ticketJson)
  expect(t.totals.total_with_tax).toBe(5)
})

it('sanitizes european decimals', () => {
  const european = ticketJson.replace('"price":5,', '"price":5,00,')
  const t = parseScanResponse(`\`\`\`json\n${european}\n\`\`\``)
  expect(t.items[0].price).toBe(5.0)
})

it('throws on garbage', () => expect(() => parseScanResponse('not json at all')).toThrow())
