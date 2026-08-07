'use client'

import { WifiOff } from 'lucide-react'
import { AvatarStack } from '@/components/claim/avatar-stack'
import { numberToCurrency, numberToPercentage } from '@/lib/currency'
import { useI18n } from '@/lib/i18n'
import type { MemberWithProfile } from '@/lib/types'

export function GroupStatusBar({
  members,
  paidPercentage,
  settledAmount,
  totalAmount,
  connected,
}: {
  members: MemberWithProfile[]
  paidPercentage: number
  settledAmount: number
  totalAmount: number
  connected: boolean
}) {
  const { lang, t } = useI18n()
  const pct = Number(numberToPercentage(paidPercentage))
  // confirmed settlements may exceed the assigned share (overpayment) — cap the bar at 100%
  const settledPct = totalAmount > 0 ? Number(numberToPercentage(Math.min(1, settledAmount / totalAmount))) : 0
  const money = (n: number) => `${numberToCurrency(n, lang)} €`

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
      <div className="flex flex-col gap-1 px-4 pb-2">
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('Covered')}
          className="relative h-1 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-success transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${settledPct}%` }}
          />
        </div>
        <div className="flex items-center gap-3 text-[13px] text-muted-foreground tabular-nums">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" aria-hidden />
            {money(settledAmount)} {t('settled')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" aria-hidden />
            {money(paidPercentage * totalAmount)} {t('covered')}
          </span>
        </div>
      </div>
    </div>
  )
}
