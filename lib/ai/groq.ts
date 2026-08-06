import type { InferredTicket } from '@/lib/types'
import { parseScanResponse } from './parser'
import { RESPONSE_SCHEMA, SCAN_PROMPT, type ScanInput, type TicketScanner } from './types'

const MODEL = process.env.GROQ_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct'

export class GroqScanner implements TicketScanner {
  async scan(input: ScanInput): Promise<InferredTicket> {
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
    if (!res.ok) throw new Error(`Groq API error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const raw: string = data.choices?.[0]?.message?.content ?? ''
    return parseScanResponse(raw)
  }
}
