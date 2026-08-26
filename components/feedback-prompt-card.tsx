'use client'

import { useEffect, useState } from 'react'
import { MessageSquareHeart, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeedbackDialog } from '@/components/feedback-dialog'
import { useI18n } from '@/lib/i18n'

// Feedback prompt shown on the tickets page once the user owns a few tickets —
// by then they've seen real scan results and are in a browsing state, not
// mid-task. Hidden once all rewards are claimed; dismissing snoozes it.
const DISMISS_KEY = 'feedback_prompt_dismissed_at'
const DISMISS_DAYS = 30
const MIN_OWNED_TICKETS = 3

function dismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    return Date.now() - Number(raw) < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function FeedbackPromptCard({ ownedTickets }: { ownedTickets: number }) {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (ownedTickets < MIN_OWNED_TICKETS || dismissedRecently()) return
    let cancelled = false
    fetch('/api/feedback')
      .then(async (res) => {
        if (cancelled || !res.ok) return
        const status = (await res.json()) as { rewardsUsed: number; maxRewards: number }
        if (status.rewardsUsed < status.maxRewards) setVisible(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [ownedTickets])

  if (!visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {}
    setVisible(false)
  }

  return (
    <div className="mx-4 mt-2 flex items-start gap-3 rounded-xl border bg-card p-3">
      <MessageSquareHeart className="size-5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t('Enjoying Tap Ticket?')}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('Leave a comment and get 2 extra scans')}</p>
        <Button type="button" size="sm" className="mt-2" onClick={() => setDialogOpen(true)}>
          {t('Send feedback')}
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
      <FeedbackDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmitted={() => setVisible(false)} />
    </div>
  )
}
