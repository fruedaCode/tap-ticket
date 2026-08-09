'use client'

// PostHog client-side integration.
// - Initialized once with a same-origin reverse proxy (api_host: "/ingest", see
//   rewrites in next.config.ts) so ad blockers don't drop events.
// - Consent-gated (GDPR/ePrivacy): posthog.init() is NOT called until the user
//   accepts analytics. Deferring the whole init — rather than only opting out of
//   capture — is what guarantees zero contact with PostHog before consent: the
//   SDK fetches its remote config on init regardless of the opt-out flag.
//   Rejecting later opts out, which also wipes PostHog's local persistence.
// - Pageviews are captured manually because App Router soft navigations would
//   be missed by the built-in capture_pageview.
// - identify/reset follow the Supabase auth session (client-side, via
//   onAuthStateChange). When NEXT_PUBLIC_POSTHOG_KEY is empty the provider
//   renders children untouched and nothing is tracked.

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { Suspense, useEffect, useRef, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getConsent, useConsent } from '@/lib/consent'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'

// NOTE: read env vars via literal process.env.NEXT_PUBLIC_* references here.
// Next.js inlines NEXT_PUBLIC_* vars into the client bundle at BUILD time by
// statically replacing literal references only — a dynamic lookup like
// process.env[name] (as lib/config.ts does) would evaluate to undefined in
// the browser.
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ''
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'

// ui_host makes "Open in PostHog" links inside captured events resolve to the
// right cloud region; it is NOT used for ingestion.
function toUiHost(ingestHost: string): string {
  if (/eu\.i\.posthog\.com$/i.test(ingestHost)) return 'https://eu.posthog.com'
  return 'https://us.posthog.com'
}

// Only ever called once the user has accepted analytics — see ConsentGate.
let initialised = false
function initPostHog() {
  if (initialised || !posthogKey) return
  initialised = true
  posthog.init(posthogKey, {
    api_host: '/ingest',
    ui_host: toUiHost(posthogHost),
    capture_pageview: false,
    // copied text can carry personal data (names, amounts) — never capture it
    autocapture: { capture_copied_text: false },
    capture_pageleave: true,
    person_profiles: 'identified_only',
    // belt and braces: even reached early, nothing is captured without the
    // explicit opt_in_capturing() below
    opt_out_capturing_by_default: true,
    disable_session_recording: true,
    loaded: (ph) => {
      if (process.env.NODE_ENV !== 'production') ph.debug(false)
      if (getConsent() === 'accepted') ph.opt_in_capturing()
    },
  })
}

// opt_out_capturing() stops capture but LEAVES the distinct_id / device_id /
// session id PostHog already wrote (verified against posthog-js 1.414). Real
// withdrawal has to remove them too — and /legal/cookies promises exactly that.
// The opt-out flag itself lives under a "__ph_opt_in_out_*" key, which this
// deliberately does not touch.
function clearPostHogStorage() {
  if (initialised) {
    // disable_persistence first: a loaded SDK flushes its store asynchronously
    // and would otherwise re-create the key moments after the sweep below.
    posthog.set_config({ disable_persistence: true })
    posthog.reset(true)
  }
  const isPostHogKey = (name: string) => name.startsWith('ph_')
  Object.keys(window.localStorage)
    .filter(isPostHogKey)
    .forEach((key) => window.localStorage.removeItem(key))
  document.cookie
    .split('; ')
    .map((cookie) => cookie.split('=')[0])
    .filter(isPostHogKey)
    .forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; path=/`
    })
}

// Starts PostHog on acceptance; in every other settled state stops capture and
// erases what it already stored.
function ConsentGate() {
  const consent = useConsent()
  useEffect(() => {
    // undefined = not hydrated yet, so nothing is known and nothing is done.
    if (consent === undefined) return
    if (consent === 'accepted') {
      if (initialised) {
        // undo the disable_persistence set by a previous rejection
        posthog.set_config({ disable_persistence: false })
        posthog.opt_in_capturing()
      } else {
        initPostHog()
      }
    } else {
      // 'rejected', or null — never chosen, or a choice that has aged out of
      // CONSENT_MAX_AGE_MS. No valid consent means no analytics storage either,
      // so a lapsed acceptance clears the ids it left behind.
      if (initialised) posthog.opt_out_capturing()
      clearPostHogStorage()
    }
  }, [consent])
  return null
}

// Dedupes high-cardinality URLs so PostHog doesn't get one page per ticket id.
function normalisePath(pathname: string): string {
  return pathname.replace(/^\/tickets\/[^/]+(\/.*)?$/, '/tickets/:id$1')
}

function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const consent = useConsent()
  useEffect(() => {
    if (consent !== 'accepted' || !pathname) return
    const query = searchParams?.toString()
    const fullPath = query ? `${pathname}?${query}` : pathname
    posthog.capture('$pageview', {
      $pathname: normalisePath(pathname),
      full_path: fullPath,
    })
  }, [consent, pathname, searchParams])
  return null
}

function IdentityTracker() {
  const { lang } = useI18n()
  const consent = useConsent()
  const lastIdentifiedRef = useRef<string | null>(null)

  useEffect(() => {
    if (consent !== 'accepted') return
    const supabase = createClient()

    const syncIdentity = (user: { id: string; email?: string } | null) => {
      if (user) {
        if (lastIdentifiedRef.current === user.id) return
        posthog.identify(user.id, { email: user.email ?? undefined, locale: lang })
        lastIdentifiedRef.current = user.id
      } else if (lastIdentifiedRef.current) {
        posthog.reset() // sign-out / session expiry
        lastIdentifiedRef.current = null
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => syncIdentity(session?.user ?? null))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => syncIdentity(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [consent, lang])

  return null
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  if (!posthogKey) return <>{children}</>
  return (
    <PHProvider client={posthog}>
      {/* first: its effect must run posthog.init() before the trackers fire */}
      <ConsentGate />
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      <IdentityTracker />
      {children}
    </PHProvider>
  )
}
