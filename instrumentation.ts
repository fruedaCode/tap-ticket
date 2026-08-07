// Runs once at server startup (Next.js instrumentation hook).
// Logs effective configuration — presence of secrets only, never values.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { getLogger } = await import('@/lib/logger')
  const log = getLogger('startup')
  log.info('server started', {
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL ?? '(default)',
    aiProvider: process.env.MOCK_SCAN === 'true' ? 'mock (MOCK_SCAN=true)' : (process.env.AI_PROVIDER ?? 'groq'),
    groqModel: process.env.GROQ_MODEL ?? 'qwen/qwen3.6-27b',
    groqApiKey: process.env.GROQ_API_KEY ? 'set' : 'MISSING',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'MISSING',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ? 'set' : 'not configured (billing disabled)',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'set' : 'not configured',
  })
}
