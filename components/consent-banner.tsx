'use client'

// GDPR/ePrivacy consent banner: shown once until the user accepts or rejects
// analytics cookies. Reject is as prominent as Accept. Renders nothing on the
// server and before mount to avoid hydration mismatches.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CONSENT_EVENT, getConsent, setConsent } from '@/lib/consent'
import { useI18n } from '@/lib/i18n'
import { COMPANY } from '@/lib/legal/company'

export function ConsentBanner() {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (getConsent() === null) queueMicrotask(() => setVisible(true))
    // hide if consent is set elsewhere (e.g. another component reusing the banner)
    const onConsentChange = () => setVisible(false)
    window.addEventListener(CONSENT_EVENT, onConsentChange)
    return () => window.removeEventListener(CONSENT_EVENT, onConsentChange)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-md p-4">
      <div className="rounded-xl border bg-card p-4 shadow-lg">
        {/* First layer: the AEPD expects it to name the controller, the purpose
            and the third party involved, with the detail one click away. */}
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{COMPANY.name}</span>{' '}
          {t('uses analytics cookies (PostHog) to measure how the app is used. You can accept or reject them; rejecting limits nothing.')}{' '}
          <Link href="/legal/cookies" className="font-medium text-foreground underline underline-offset-4">
            {t('More information')}
          </Link>
        </p>
        <div className="flex gap-2 pt-3">
          <Button variant="outline" className="min-h-11 flex-1" onClick={() => setConsent('rejected')}>
            {t('Reject')}
          </Button>
          <Button className="min-h-11 flex-1" onClick={() => setConsent('accepted')}>
            {t('Accept')}
          </Button>
        </div>
      </div>
    </div>
  )
}
