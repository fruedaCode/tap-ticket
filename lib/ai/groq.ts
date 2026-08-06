import type { InferredTicket } from '@/lib/types'
import { getLogger } from '@/lib/logger'
import { parseScanResponse } from './parser'
import { RESPONSE_SCHEMA, SCAN_PROMPT, type ScanInput, type TicketScanner } from './types'

const log = getLogger('groq')

const MODEL = process.env.GROQ_MODEL ?? 'qwen/qwen3.6-27b'

export class GroqScanner implements TicketScanner {
  async scan(input: ScanInput): Promise<InferredTicket> {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set')
    const startedAt = Date.now()
    log.debug('request', { model: MODEL, imageBytes: Math.round((input.base64.length * 3) / 4) })
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
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
      log.error('API error', { status: res.status, ms: Date.now() - startedAt, body })
      throw new Error(`Groq API error ${res.status}: ${body}`)
    }
    const data = await res.json()
    log.debug('response ok', { model: MODEL, ms: Date.now() - startedAt, usage: data.usage })
    const raw: string = data.choices?.[0]?.message?.content ?? ''
    return parseScanResponse(raw)
  }
}
