'use client'

import { useEffect, useState } from 'react'
import { Loader2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/lib/i18n'
import { FEEDBACK_MAX_COMMENT } from '@/lib/feedback'
import { cn } from '@/lib/utils'

type RewardStatus = {
  rewardsUsed: number
  maxRewards: number
  rewardScans: number
}

export function FeedbackDialog({
  open,
  onOpenChange,
  onSubmitted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted?: () => void
}) {
  const { t } = useI18n()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<RewardStatus | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch('/api/feedback')
      .then(async (res) => {
        if (cancelled || !res.ok) return
        setStatus((await res.json()) as RewardStatus)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open])

  const handleSubmit = async () => {
    if (rating < 1) return
    setBusy(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      })
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { rewarded: boolean }
      toast.success(data.rewarded ? t('Thanks! +2 extra scans added') : t('Thanks for your feedback!'))
      setRating(0)
      setComment('')
      onOpenChange(false)
      onSubmitted?.()
    } catch {
      toast.error(t('Could not send feedback. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  const rewardsLeft = status ? status.maxRewards - status.rewardsUsed : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Send feedback')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label id="feedback-rating-label">{t('How was your experience?')}</Label>
          <div className="flex gap-1" role="group" aria-labelledby="feedback-rating-label">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={rating >= value}
                aria-label={`${value}/5`}
                onClick={() => setRating(value)}
                className="rounded-md p-1.5 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Star
                  aria-hidden
                  className={cn(
                    'size-7',
                    rating >= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground',
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="feedback-comment">{t('Tell us more (optional)')}</Label>
          <Textarea
            id="feedback-comment"
            name="feedback-comment"
            maxLength={FEEDBACK_MAX_COMMENT}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {status && rewardsLeft !== null && rewardsLeft > 0 && (
          <p className="text-sm text-muted-foreground">
            {t('Leave a comment and get 2 extra scans')} — {t('Rewards claimed')}: {status.rewardsUsed}/{status.maxRewards}
          </p>
        )}
        {status && rewardsLeft === 0 && (
          <p className="text-sm text-muted-foreground">{t('You already claimed all feedback rewards — thanks!')}</p>
        )}

        <DialogFooter>
          <Button type="button" disabled={busy || rating < 1} onClick={handleSubmit}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {t('Submit feedback')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
