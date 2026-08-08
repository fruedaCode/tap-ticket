import 'server-only'

// Server-side PostHog (posthog-node) singleton.
// Fire-and-forget: capture() never blocks requests and swallows/logs errors.
// When NEXT_PUBLIC_POSTHOG_KEY is empty every call is a no-op.

import { PostHog } from 'posthog-node'
import { config } from '@/lib/config'
import { getLogger } from '@/lib/logger'

const log = getLogger('posthog')

// Singleton so batches actually batch across module reloads.
let client: PostHog | null | undefined

function getClient(): PostHog | null {
  if (client !== undefined) return client
  const { key, host } = config.posthog
  if (!key) {
    client = null
    return null
  }
  try {
    client = new PostHog(key, {
      host,
      flushAt: 20,
      // Short-lived Next.js runtime: flush faster than the default 30s.
      flushInterval: 10_000,
    })
  } catch (err) {
    log.error('failed to init posthog-node', { error: String(err) })
    client = null
  }
  return client
}

export type CaptureArgs = {
  distinctId: string
  event: string
  properties?: Record<string, unknown>
  groups?: Record<string, string>
}

/** Fire-and-forget capture; errors are logged and swallowed so PostHog can't stall requests. */
export function capture(args: CaptureArgs): void {
  const ph = getClient()
  if (!ph) return
  try {
    ph.capture({
      distinctId: args.distinctId,
      event: args.event,
      properties: args.properties,
      groups: args.groups,
    })
  } catch (err) {
    log.error('capture failed', { event: args.event, error: String(err) })
  }
}

/** Flushes the final batch; call from process shutdown handlers. */
export async function shutdownPostHog(): Promise<void> {
  if (!client) return
  try {
    await client.shutdown()
  } catch (err) {
    log.error('shutdown failed', { error: String(err) })
  }
}
