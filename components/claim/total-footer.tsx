'use client'

import { Button } from '@/components/ui/button'
import { numberToCurrency } from '@/lib/currency'
import { useI18n } from '@/lib/i18n'
import type { UserBill } from '@/lib/split'

export function TotalFooter({ bill, onReview }: { bill: UserBill; onReview: () => void }) {
  const { lang, t } = useI18n()
  const total = `${numberToCurrency(bill.total, lang)} €`

  return (
    <div className="bg-card shadow-[0_-1px_0_0_var(--border)]">
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-baseline justify-between pb-2">
          <span className="text-[13px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            {t('Your total')}
          </span>
          <span
            aria-label={`${t('Your total')}: ${total}`}
            className="text-[32px] leading-none font-bold tracking-[-0.02em] tabular-nums"
          >
            {total}
          </span>
        </div>
        <Button type="button" onClick={onReview} className="h-13 w-full text-base">
          {t('Review & settle')}
        </Button>
      </div>
    </div>
  )
}
