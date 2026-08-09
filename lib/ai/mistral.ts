import type { InferredTicket } from '@/lib/types'
import { getLogger } from '@/lib/logger'
import { parseScanResponse } from './parser'
import { RESPONSE_SCHEMA, type ScanInput, type TicketScanner } from './types'

const log = getLogger('mistral')

// Mistral Document AI, not chat completions: a document-extraction endpoint that
// takes a JSON Schema and answers with a matching JSON string, so there is no
// ```json fence to unwrap. Mistral is a French company processing in the EU.
const OCR_URL = 'https://api.mistral.ai/v1/ocr'

// Same schema the other providers are given, so all four are asked for one shape.
// The root gets additionalProperties:false, which document_annotation_format wants.
const ANNOTATION_SCHEMA = { ...RESPONSE_SCHEMA, additionalProperties: false }

// The annotation is already JSON. parseScanResponse (fence stripping + decimal
// comma repair) is kept only as the fallback for a malformed one.
function parseAnnotation(annotation: string): InferredTicket {
  try {
    return JSON.parse(annotation) as InferredTicket
  } catch {
    return parseScanResponse(annotation)
  }
}

export class MistralScanner implements TicketScanner {
  async scan(input: ScanInput): Promise<InferredTicket> {
    const apiKey = process.env.MISTRAL_API_KEY ?? ''
    if (!apiKey) throw new Error('MISTRAL_API_KEY is not set')
    const model = process.env.MISTRAL_MODEL ?? 'mistral-ocr-latest'
    const startedAt = Date.now()
    log.debug('request', { model, imageBytes: Math.round((input.base64.length * 3) / 4) })
    const res = await fetch(OCR_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        document: { type: 'image_url', image_url: `data:${input.mediaType};base64,${input.base64}` },
        document_annotation_format: {
          type: 'json_schema',
          json_schema: {
            name: 'ticket',
            schema: ANNOTATION_SCHEMA,
            // Not strict: strict mode requires every property to appear in
            // `required`, but RESPONSE_SCHEMA deliberately leaves most optional.
            // Forcing them would fill tickets with nulls the other three providers
            // never send, which would skew the comparison.
            strict: false,
          },
        },
        // we only want the extraction, not the page images echoed back
        include_image_base64: false,
      }),
    })
    if (!res.ok) {
      const body = (await res.text()).slice(0, 500)
      log.error('API error', { status: res.status, ms: Date.now() - startedAt, body })
      throw new Error(`Mistral API error ${res.status}: ${body}`)
    }
    const data = await res.json()
    log.debug('response ok', { model, ms: Date.now() - startedAt, usage: data.usage_info })
    const annotation: unknown = data.document_annotation
    if (typeof annotation !== 'string' || annotation.length === 0) {
      throw new Error('Mistral returned no document_annotation')
    }
    return parseAnnotation(annotation)
  }
}
