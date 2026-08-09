import { OpenAICompatibleScanner } from './openai-compatible'

// Scaleway Generative APIs — French company, Paris/Amsterdam regions, so receipt
// images never leave the EU. Model IDs come from Scaleway's supported-models list
// (multimodal ones: mistral-small-3.2-24b-instruct-2506, pixtral-12b-2409,
// gemma-3-27b-it).
export function createScalewayScanner() {
  return new OpenAICompatibleScanner({
    name: 'Scaleway',
    baseUrl: process.env.SCALEWAY_BASE_URL ?? 'https://api.scaleway.ai/v1',
    model: process.env.SCALEWAY_MODEL ?? 'mistral-small-3.2-24b-instruct-2506',
    apiKey: process.env.SCALEWAY_API_KEY ?? '',
    apiKeyVar: 'SCALEWAY_API_KEY',
  })
}
