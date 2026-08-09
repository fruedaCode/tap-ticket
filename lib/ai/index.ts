import 'server-only'
import { createGroqScanner } from './groq'
import { MistralScanner } from './mistral'
import { MockScanner } from './mock'
import { createOvhScanner } from './ovh'
import { createScalewayScanner } from './scaleway'
import type { TicketScanner } from './types'

// 'groq' is US-hosted; the other three keep receipt images inside the EU. They
// exist side by side so they can be compared on the same receipts — switch with
// AI_PROVIDER. See the provider table in the README.
export function getScanner(): TicketScanner {
  if (process.env.MOCK_SCAN === 'true') return new MockScanner()
  const provider = process.env.AI_PROVIDER ?? 'groq'
  switch (provider) {
    case 'groq':
      return createGroqScanner()
    case 'mistral':
      return new MistralScanner()
    case 'scaleway':
      return createScalewayScanner()
    case 'ovh':
      return createOvhScanner()
    default:
      throw new Error(`Unknown AI_PROVIDER: ${provider}`)
  }
}
