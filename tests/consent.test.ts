import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getConsent, setConsent, CONSENT_EVENT } from '@/lib/consent'

// lib/consent.ts is client-only and reads `window` lazily, so a minimal stub is
// enough here — the suite runs on the node environment and jsdom is not a
// dependency. EventTarget supplies add/removeEventListener + dispatchEvent.
const CONSENT_KEY = 'tt-consent'
const DAY = 24 * 60 * 60 * 1000

function stubWindow() {
  const store = new Map<string, string>()
  const target = new EventTarget() as EventTarget & { localStorage: unknown }
  target.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  }
  ;(globalThis as { window?: unknown }).window = target
  return store
}

describe('consent', () => {
  let store: Map<string, string>

  beforeEach(() => {
    store = stubWindow()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (globalThis as { window?: unknown }).window
  })

  it('returns null when nothing has been chosen', () => {
    expect(getConsent()).toBeNull()
  })

  it('round-trips a choice and announces it', () => {
    const seen: unknown[] = []
    window.addEventListener(CONSENT_EVENT, (e) => seen.push((e as CustomEvent).detail))

    setConsent('accepted')

    expect(getConsent()).toBe('accepted')
    expect(seen).toEqual(['accepted'])
  })

  it('keeps a choice for just under 24 months', () => {
    setConsent('accepted')
    vi.advanceTimersByTime(729 * DAY)
    expect(getConsent()).toBe('accepted')
  })

  it('lets a choice lapse after 24 months', () => {
    setConsent('accepted')
    vi.advanceTimersByTime(731 * DAY)
    expect(getConsent()).toBeNull()
  })

  it('lapses a rejection too, so it is re-asked rather than assumed', () => {
    setConsent('rejected')
    vi.advanceTimersByTime(731 * DAY)
    expect(getConsent()).toBeNull()
  })

  it('ignores the pre-expiry bare-string format, whose age is unknown', () => {
    store.set(CONSENT_KEY, 'accepted')
    expect(getConsent()).toBeNull()
  })

  it('ignores entries with a missing or malformed timestamp', () => {
    store.set(CONSENT_KEY, JSON.stringify({ value: 'accepted' }))
    expect(getConsent()).toBeNull()

    store.set(CONSENT_KEY, JSON.stringify({ value: 'accepted', ts: 'yesterday' }))
    expect(getConsent()).toBeNull()
  })

  it('ignores a value that is not one of the two choices', () => {
    store.set(CONSENT_KEY, JSON.stringify({ value: 'maybe', ts: Date.now() }))
    expect(getConsent()).toBeNull()
  })

  it('re-answering restarts the 24 months', () => {
    setConsent('accepted')
    vi.advanceTimersByTime(700 * DAY)
    setConsent('accepted')
    vi.advanceTimersByTime(700 * DAY)
    expect(getConsent()).toBe('accepted')
  })
})
