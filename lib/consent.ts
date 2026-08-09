'use client'

// Analytics consent storage (GDPR/ePrivacy). Client-only: every function is a
// no-op / returns null during SSR.
// The choice lives in localStorage['tt-consent']; changes are announced via the
// 'tt-consent-change' window event so the banner and the PostHog provider can
// react without a reload.

import { useSyncExternalStore } from 'react'

export type Consent = 'accepted' | 'rejected'

const CONSENT_KEY = 'tt-consent'
export const CONSENT_EVENT = 'tt-consent-change'

// Consent does not last forever: the AEPD's cookie guidance expects it to be
// renewed periodically and works with 24 months as the ceiling. Past that the
// stored choice stops counting, getConsent() reports "not chosen" and the
// banner asks again. /legal/cookies states this period to the user.
const CONSENT_MAX_AGE_MS = 730 * 24 * 60 * 60 * 1000

// Timestamped so the age above can be checked. Written as JSON; the original
// format was the bare string 'accepted' / 'rejected'.
type StoredConsent = { value: Consent; ts: number }

function isConsent(value: unknown): value is Consent {
  return value === 'accepted' || value === 'rejected'
}

function readStored(): StoredConsent | null {
  const raw = window.localStorage.getItem(CONSENT_KEY)
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // A bare string from the pre-expiry format. Its age is unknown, so it
    // cannot be honoured as valid consent — those users are asked once more.
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const { value, ts } = parsed as Partial<StoredConsent>
  if (!isConsent(value) || typeof ts !== 'number') return null
  return { value, ts }
}

export function getConsent(): Consent | null {
  if (typeof window === 'undefined') return null
  const stored = readStored()
  if (!stored) return null
  // Deliberately does not delete the lapsed entry: this runs as the
  // useSyncExternalStore snapshot, i.e. during render. setConsent overwrites it
  // as soon as the user answers the banner again.
  if (Date.now() - stored.ts > CONSENT_MAX_AGE_MS) return null
  return stored.value
}

export function setConsent(value: Consent) {
  if (typeof window === 'undefined') return
  const stored: StoredConsent = { value, ts: Date.now() }
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(stored))
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: value }))
}

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange)
  return () => window.removeEventListener(CONSENT_EVENT, onChange)
}

// undefined on the server and during hydration — localStorage is unreachable
// there, and it must not be confused with "the user has not chosen yet" (null).
const serverSnapshot = () => undefined

export function useConsent(): Consent | null | undefined {
  return useSyncExternalStore(subscribe, getConsent, serverSnapshot)
}
