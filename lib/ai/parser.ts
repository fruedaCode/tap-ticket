import type { InferredTicket } from '@/lib/types'

function sanitizeString(input: string): string {
  return input.replace(/\b\d+,\d+\b/g, (m) => m.replace(',', '.'))
}

export function parseScanResponse(raw: string): InferredTicket {
  const sanitized = sanitizeString(raw)
  const match = sanitized.match(/```json\s*({[\s\S]*?})\s*```/)
  const jsonString = match ? match[1] : sanitized
  try {
    return JSON.parse(jsonString) as InferredTicket
  } catch (error) {
    throw new Error(`Failed to parse AI response: ${error}`)
  }
}
