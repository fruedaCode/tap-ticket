import { OpenAICompatibleScanner } from './openai-compatible'

// US-hosted. Kept as the baseline the EU providers are compared against —
// see the provider table in the README.
export function createGroqScanner() {
  return new OpenAICompatibleScanner({
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: process.env.GROQ_MODEL ?? 'qwen/qwen3.6-27b',
    apiKey: process.env.GROQ_API_KEY ?? '',
    apiKeyVar: 'GROQ_API_KEY',
  })
}
