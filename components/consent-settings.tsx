'use client'

// Lets the user change their analytics choice after the banner is gone. GDPR
// art. 7(3) requires withdrawing consent to be as easy as giving it, so this
// lives on the cookie policy page, which every consent surface links to.

import { Button } from '@/components/ui/button'
import { setConsent, useConsent } from '@/lib/consent'
import { useI18n } from '@/lib/i18n'

export function ConsentSettings() {
  const { t } = useI18n()
  // undefined until hydrated: rendering a guessed state would flash the wrong
  // choice back at the user.
  const consent = useConsent()

  const status =
    consent === undefined
      ? ''
      : consent === 'accepted'
        ? t('Analytics is on')
        : consent === 'rejected'
          ? t('Analytics is off')
          : t('You have not chosen yet')

  return (
    <div className="mt-6 rounded-xl border bg-card p-4">
      <p className="text-sm font-medium">{t('Analytics preference')}</p>
      <p className="min-h-5 pt-1 text-sm text-muted-foreground">{status}</p>
      <div className="flex flex-wrap gap-2 pt-3">
        <Button variant="outline" className="min-h-11" onClick={() => setConsent('rejected')}>
          {t('Reject analytics')}
        </Button>
        <Button className="min-h-11" onClick={() => setConsent('accepted')}>
          {t('Accept analytics')}
        </Button>
      </div>
    </div>
  )
}
