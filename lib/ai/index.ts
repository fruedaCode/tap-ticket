import 'server-only'
import { GroqScanner } from './groq'
import { MockScanner } from './mock'
import type { TicketScanner } from './types'

export function getScanner(): TicketScanner {
  if (process.env.MOCK_SCAN === 'true') return new MockScanner()
  const provider = process.env.AI_PROVIDER ?? 'groq'
  switch (provider) {
    case 'groq':
      return new GroqScanner()
    default:
      throw new Error(`Unknown AI_PROVIDER: ${provider}`)
  }
}
