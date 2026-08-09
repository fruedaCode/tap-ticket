// The real 'server-only' package throws on import outside a React Server
// Component, which would make every server module untestable. vitest.config.ts
// aliases it here so tests can import lib/ai/*, lib/logger, etc.
export {}
