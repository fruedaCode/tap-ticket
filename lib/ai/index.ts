import 'server-only'
import { createGroqScanner } from './groq'
import { MistralScanner } from './mistral'
import { MockScanner } from './mock'
import { createOvhScanner } from './ovh'
import { createScalewayScanner } from './scaleway'
import type { TicketScanner } from './types'

// They exist side by side so they can be compared on the same receipts — switch
// with AI_PROVIDER. See the provider table in the README.
//
// The default is deliberately an EU provider: 'groq' is US-hosted, and an unset
// AI_PROVIDER must not quietly start shipping receipt photos out of the EU, which
// /legal/privacy §5 states does not happen.
export function getScanner(): TicketScanner {
  if (process.env.MOCK_SCAN === 'true') return new MockScanner()
  const provider = process.env.AI_PROVIDER ?? 'mistral'
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
