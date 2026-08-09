import type { InferredTicket } from '@/lib/types'
import { getLogger } from '@/lib/logger'
import { parseScanResponse } from './parser'
import { RESPONSE_SCHEMA, SCAN_PROMPT, type ScanInput, type TicketScanner } from './types'

// Groq, Scaleway and OVHcloud all speak the OpenAI /chat/completions dialect and
// accept a data-URI image part, so they differ only in base URL, model and key.
// The request body is identical across them on purpose: the three are meant to
// be compared against each other on the same receipts.
export type OpenAICompatibleConfig = {
  /** Display name used in log scope and error messages, e.g. "Groq". */
  name: string
  /** Origin + version prefix, no trailing slash, e.g. "https://api.groq.com/openai/v1". */
  baseUrl: string
  model: string
  apiKey: string
  /** Env var carrying the key, named in the error when it is missing. */
  apiKeyVar: string
}

export class OpenAICompatibleScanner implements TicketScanner {
  private readonly log

  constructor(private readonly cfg: OpenAICompatibleConfig) {
    this.log = getLogger(cfg.name.toLowerCase())
  }

  async scan(input: ScanInput): Promise<InferredTicket> {
    const { name, baseUrl, model, apiKey, apiKeyVar } = this.cfg
    if (!apiKey) throw new Error(`${apiKeyVar} is not set`)
    const startedAt = Date.now()
    this.log.debug('request', { model, imageBytes: Math.round((input.base64.length * 3) / 4) })
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        top_p: 0.7,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `${SCAN_PROMPT} Follow this json schema: ${JSON.stringify(RESPONSE_SCHEMA)}.` },
              { type: 'image_url', image_url: { url: `data:${input.mediaType};base64,${input.base64}` } },
            ],
          },
        ],
      }),
    })
    if (!res.ok) {
      const body = (await res.text()).slice(0, 500)
      this.log.error('API error', { status: res.status, ms: Date.now() - startedAt, body })
      throw new Error(`${name} API error ${res.status}: ${body}`)
    }
    const data = await res.json()
    this.log.debug('response ok', { model, ms: Date.now() - startedAt, usage: data.usage })
    const raw: string = data.choices?.[0]?.message?.content ?? ''
    return parseScanResponse(raw)
  }
}
