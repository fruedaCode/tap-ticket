'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { isPushSupported, subscribeToPush } from '@/lib/push-client'

// Push opt-in prompt shown on the tickets page once after login. Hidden when
// the browser doesn't support push, the permission was already decided, or a
// subscription already exists; dismissing snoozes it (the account page has a
// permanent toggle).
const DISMISS_KEY = 'push_prompt_dismissed_at'
const DISMISS_DAYS = 7

function dismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    return Date.now() - Number(raw) < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function PushPromptCard() {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)
  const [enabling, setEnabling] = useState(false)

  useEffect(() => {
    if (!isPushSupported() || Notification.permission !== 'default' || dismissedRecently()) return
    let cancelled = false
    navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled && !subscription) setVisible(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {}
    setVisible(false)
  }

  const enable = async () => {
    setEnabling(true)
    try {
      const ok = await subscribeToPush()
      if (ok) setVisible(false)
      else toast.error(t('Could not enable notifications'))
    } finally {
      setEnabling(false)
    }
  }

  return (
    <div className="mx-4 mt-2 flex items-start gap-3 rounded-xl border bg-card p-3">
      <Bell className="size-5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t('Enable notifications')}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('Get notified when you are added to a ticket or trip')}
        </p>
        <Button type="button" size="sm" className="mt-2" disabled={enabling} onClick={enable}>
          {t('Enable notifications')}
        </Button>
      </div>
      <button
        type="button"
        aria-label={t('Dismiss')}
        onClick={dismiss}
        className="rounded-md p-1 text-muted-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
