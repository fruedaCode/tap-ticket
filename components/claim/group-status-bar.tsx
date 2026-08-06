'use client'

import { WifiOff } from 'lucide-react'
import { AvatarStack } from '@/components/claim/avatar-stack'
import { numberToPercentage } from '@/lib/currency'
import { useI18n } from '@/lib/i18n'
import type { MemberWithProfile } from '@/lib/types'

export function GroupStatusBar({
  members,
  paidPercentage,
  connected,
}: {
  members: MemberWithProfile[]
  paidPercentage: number
  connected: boolean
}) {
  const { t } = useI18n()
  const pct = Number(numberToPercentage(paidPercentage))

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background">
      <div className="flex items-center gap-3 px-4 py-2">
        <AvatarStack members={members} max={4} />
        <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
          {members.length} {t('splitting')}
        </span>
        {connected ? (
          <span className="flex items-center gap-1.5 text-[13px] text-success">
            <span
              className="size-2 rounded-full bg-success motion-safe:animate-pulse"
              aria-hidden
            />
            {t('Live')}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[13px] text-accent">
            <WifiOff className="size-3.5" aria-hidden />
            {t('Reconnecting')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 px-4 pb-2">
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('Covered')}
          className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 text-[13px] text-muted-foreground tabular-nums">
          {pct}% {t('covered')}
        </span>
      </div>
    </div>
  )
}
