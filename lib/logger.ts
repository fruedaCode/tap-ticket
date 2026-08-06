import 'server-only'

type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

const configured = (
  process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
).toLowerCase()
const threshold = LEVELS[configured as Level] ?? LEVELS.info

function emit(level: Level, scope: string, msg: string, data?: Record<string, unknown>) {
  if (LEVELS[level] < threshold) return
  const line = `[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)} [${scope}] ${msg}`
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  if (data === undefined) fn(line)
  else fn(line, data)
}

/** Server-side leveled logger. Never put secrets in msg/data — log key presence, not values. */
export function getLogger(scope: string) {
  return {
    debug: (msg: string, data?: Record<string, unknown>) => emit('debug', scope, msg, data),
    info: (msg: string, data?: Record<string, unknown>) => emit('info', scope, msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => emit('warn', scope, msg, data),
    error: (msg: string, data?: Record<string, unknown>) => emit('error', scope, msg, data),
  }
}
