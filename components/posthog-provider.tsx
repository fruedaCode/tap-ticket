'use client'

// PostHog client-side integration.
// - Initialized once with a same-origin reverse proxy (api_host: "/ingest", see
//   rewrites in next.config.ts) so ad blockers don't drop events.
// - Pageviews are captured manually because App Router soft navigations would
//   be missed by the built-in capture_pageview.
// - identify/reset follow the Supabase auth session (client-side, via
//   onAuthStateChange). When NEXT_PUBLIC_POSTHOG_KEY is empty the provider
//   renders children untouched and nothing is tracked.

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { Suspense, useEffect, useRef, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'

// NOTE: read env vars via literal process.env.NEXT_PUBLIC_* references here.
// Next.js inlines NEXT_PUBLIC_* vars into the client bundle at BUILD time by
// statically replacing literal references only — a dynamic lookup like
// process.env[name] (as lib/config.ts does) would evaluate to undefined in
// the browser.
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ''
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

// ui_host makes "Open in PostHog" links inside captured events resolve to the
// right cloud region; it is NOT used for ingestion.
function toUiHost(ingestHost: string): string {
  if (/eu\.i\.posthog\.com$/i.test(ingestHost)) return 'https://eu.posthog.com'
  return 'https://us.posthog.com'
}

let initialised = false
if (posthogKey && !initialised) {
  posthog.init(posthogKey, {
    api_host: '/ingest',
    ui_host: toUiHost(posthogHost),
    capture_pageview: false,
    autocapture: true,
    capture_pageleave: true,
    person_profiles: 'identified_only',
    loaded: (ph) => {
      if (process.env.NODE_ENV !== 'production') ph.debug(false)
    },
  })
  initialised = true
}

// Dedupes high-cardinality URLs so PostHog doesn't get one page per ticket id.
function normalisePath(pathname: string): string {
  return pathname.replace(/^\/tickets\/[^/]+(\/.*)?$/, '/tickets/:id$1')
}

function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    if (!pathname) return
    const query = searchParams?.toString()
    const fullPath = query ? `${pathname}?${query}` : pathname
    posthog.capture('$pageview', {
      $pathname: normalisePath(pathname),
      full_path: fullPath,
    })
  }, [pathname, searchParams])
  return null
}

function IdentityTracker() {
  const { lang } = useI18n()
  const lastIdentifiedRef = useRef<string | null>(null)

  useEffect(() => {
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
  }, [lang])

  return null
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  if (!posthogKey) return <>{children}</>
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      <IdentityTracker />
      {children}
    </PHProvider>
  )
}
