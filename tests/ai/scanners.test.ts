import { afterEach, expect, it, vi } from 'vitest'
import { getScanner } from '@/lib/ai'
import { MistralScanner } from '@/lib/ai/mistral'
import { OpenAICompatibleScanner } from '@/lib/ai/openai-compatible'

const ticketJson = `{"restaurant":{"name":"Bar X","address":"C/ Y 1","phone":"93","NIF":"B1"},"invoice":{"type":"SIMPLIFICADA","operation_number":"1","table":"3","date":"04/12/2024","cashier":"Ana"},"items":[{"quantity":2,"description":"Caña","unitPrice":2.5,"price":5,"discount_percentage":null,"discount_amount":null}],"totals":{"base":4.55,"tax":{"percentage":10,"amount":0.45},"total_without_tax":4.55,"total_with_tax":5}}`

const input = { base64: 'aGVsbG8=', mediaType: 'image/jpeg' } as const

function mockFetch(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function lastBody(fetchMock: ReturnType<typeof vi.fn>) {
  return JSON.parse(fetchMock.mock.calls[0][1].body)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const openAiConfig = {
  name: 'Testly',
  baseUrl: 'https://api.testly.example/v1',
  model: 'vision-1',
  apiKey: 'k-123',
  apiKeyVar: 'TESTLY_API_KEY',
}

it('openai-compatible: posts the image as a data URI to /chat/completions', async () => {
  const fetchMock = mockFetch({ choices: [{ message: { content: `\`\`\`json\n${ticketJson}\n\`\`\`` } }] })
  const ticket = await new OpenAICompatibleScanner(openAiConfig).scan(input)

  expect(fetchMock.mock.calls[0][0]).toBe('https://api.testly.example/v1/chat/completions')
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer k-123')
  const body = lastBody(fetchMock)
  expect(body.model).toBe('vision-1')
  expect(body.messages[0].content[1].image_url.url).toBe('data:image/jpeg;base64,aGVsbG8=')
  expect(ticket.restaurant.name).toBe('Bar X')
})

it('openai-compatible: surfaces the provider name and status on an API error', async () => {
  mockFetch({ error: 'nope' }, false, 429)
  await expect(new OpenAICompatibleScanner(openAiConfig).scan(input)).rejects.toThrow(/Testly API error 429/)
})

it('openai-compatible: names the missing env var rather than calling the API', async () => {
  const fetchMock = mockFetch({})
  await expect(new OpenAICompatibleScanner({ ...openAiConfig, apiKey: '' }).scan(input)).rejects.toThrow(
    'TESTLY_API_KEY is not set',
  )
  expect(fetchMock).not.toHaveBeenCalled()
})

it('mistral: posts to the OCR endpoint with a json_schema annotation format', async () => {
  vi.stubEnv('MISTRAL_API_KEY', 'm-123')
  const fetchMock = mockFetch({ document_annotation: ticketJson })
  const ticket = await new MistralScanner().scan(input)

  expect(fetchMock.mock.calls[0][0]).toBe('https://api.mistral.ai/v1/ocr')
  const body = lastBody(fetchMock)
  expect(body.model).toBe('mistral-ocr-latest')
  expect(body.document).toEqual({ type: 'image_url', image_url: 'data:image/jpeg;base64,aGVsbG8=' })
  expect(body.document_annotation_format.type).toBe('json_schema')
  expect(body.document_annotation_format.json_schema.schema.additionalProperties).toBe(false)
  expect(ticket.items[0].description).toBe('Caña')
})

it('mistral: falls back to fence-stripping if the annotation is not clean json', async () => {
  vi.stubEnv('MISTRAL_API_KEY', 'm-123')
  mockFetch({ document_annotation: `\`\`\`json\n${ticketJson}\n\`\`\`` })
  const ticket = await new MistralScanner().scan(input)
  expect(ticket.totals.total_with_tax).toBe(5)
})

it('mistral: fails loudly when the response carries no annotation', async () => {
  vi.stubEnv('MISTRAL_API_KEY', 'm-123')
  mockFetch({ pages: [] })
  await expect(new MistralScanner().scan(input)).rejects.toThrow('no document_annotation')
})

it('getScanner: MOCK_SCAN wins over the configured provider', async () => {
  vi.stubEnv('MOCK_SCAN', 'true')
  vi.stubEnv('AI_PROVIDER', 'nonsense')
  const ticket = await getScanner().scan(input)
  expect(ticket.items.length).toBeGreaterThan(0)
})

it.each([
  ['groq', 'https://api.groq.com/openai/v1/chat/completions'],
  ['scaleway', 'https://api.scaleway.ai/v1/chat/completions'],
  ['ovh', 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions'],
  ['mistral', 'https://api.mistral.ai/v1/ocr'],
])('getScanner: %s routes to its own endpoint', async (provider, url) => {
  vi.stubEnv('MOCK_SCAN', 'false')
  vi.stubEnv('AI_PROVIDER', provider)
  vi.stubEnv('GROQ_API_KEY', 'k')
  vi.stubEnv('SCALEWAY_API_KEY', 'k')
  vi.stubEnv('OVH_API_KEY', 'k')
  vi.stubEnv('MISTRAL_API_KEY', 'k')
  const fetchMock = mockFetch({
    choices: [{ message: { content: ticketJson } }],
    document_annotation: ticketJson,
  })
  await getScanner().scan(input)
  expect(fetchMock.mock.calls[0][0]).toBe(url)
})

it('getScanner: rejects an unknown provider instead of silently using groq', () => {
  vi.stubEnv('MOCK_SCAN', 'false')
  vi.stubEnv('AI_PROVIDER', 'openai')
  expect(() => getScanner()).toThrow('Unknown AI_PROVIDER: openai')
})
