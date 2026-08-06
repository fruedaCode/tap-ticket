import type { InferredTicket } from '@/lib/types'

export type ScanInput = { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }
export interface TicketScanner {
  scan(input: ScanInput): Promise<InferredTicket>
}

export const SCAN_PROMPT = `
    Transform this restaurant ticket image into a JSON object and only return the resulting JSON surrounded by the mark "\`\`\`json" for the beginning of the JSON and "\`\`\`" for the end of the JSON.
    Don't change dates format and read them as follow if date starts with 4 digits, then the format is YYYY/MM/DD, if starts with 2 digits then is DD/MM/YYYY and if starts with 1 digit then is D/M/YY.
    The discount_percentage and discount_field fields are optional because not all the items have discount, so set those fields to null if you can't find the discount.
`

// ported from RN services/types.ts responseSchema
export const RESPONSE_SCHEMA = { type: 'object', properties: { restaurant: { type: 'object', properties: { name: { type: 'string' }, address: { type: 'string' }, phone: { type: 'string' }, NIF: { type: 'string' } }, required: ['name'], additionalProperties: false }, invoice: { type: 'object', properties: { type: { type: 'string' }, operation_number: { type: 'string' }, table: { type: 'string' }, date: { type: 'string', format: 'date-time' }, cashier: { type: 'string' } }, required: [], additionalProperties: false }, items: { type: 'array', items: { type: 'object', properties: { quantity: { type: 'integer' }, description: { type: 'string' }, unitPrice: { type: 'number' }, price: { type: 'number' }, discount_percentage: { type: 'number' }, discount_amount: { type: 'number' } }, required: ['quantity', 'description', 'price'], additionalProperties: false } }, totals: { type: 'object', properties: { base: { type: 'number' }, tax: { type: 'object', properties: { percentage: { type: 'number' }, amount: { type: 'number' } } }, total_without_tax: { type: 'number' }, total_with_tax: { type: 'number' } }, required: [], additionalProperties: false } }, required: ['restaurant', 'invoice', 'items', 'totals'] } as const
