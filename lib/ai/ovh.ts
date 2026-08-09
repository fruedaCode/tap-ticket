import { OpenAICompatibleScanner } from './openai-compatible'

// OVHcloud AI Endpoints — French company, France-hosted. Qwen2.5-VL is the same
// model family as the Groq baseline (qwen3.6), so this is the EU option whose
// extraction behaviour should look most like today's.
export function createOvhScanner() {
  return new OpenAICompatibleScanner({
    name: 'OVHcloud',
    baseUrl: process.env.OVH_BASE_URL ?? 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',
    model: process.env.OVH_MODEL ?? 'Qwen2.5-VL-72B-Instruct',
    apiKey: process.env.OVH_API_KEY ?? '',
    apiKeyVar: 'OVH_API_KEY',
  })
}
