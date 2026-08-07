'use client'

import { Separator } from '@/components/ui/separator'
import { numberToCurrency } from '@/lib/currency'
import { useI18n } from '@/lib/i18n'
import type { UserBill } from '@/lib/split'

export function IndividualBill({
  bill,
  settled = false,
  paid = 0,
}: {
  bill: UserBill
  settled?: boolean
  paid?: number
}) {
  const { lang, t } = useI18n()
  const remaining = Math.max(0, bill.total - paid)

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-sm font-semibold">{t('Your bill')}</h3>
        {settled && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-400">
            {t('Settled')}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {bill.items
          .filter((line) => line.amount > 0)
          .map((line, i) => (
            <div key={`${line.description}-${i}`} className="flex items-baseline gap-2 text-sm">
              <span className="w-10 shrink-0 text-muted-foreground">{line.unit}</span>
              <span className="min-w-0 flex-1 truncate">{line.description}</span>
              <span className="shrink-0">{numberToCurrency(line.amount, lang)} €</span>
            </div>
          ))}
      </div>
      <Separator className="my-2" />
      <div className="flex justify-between text-sm font-semibold">
        <span>{t('Total')}</span>
        <span>{numberToCurrency(bill.total, lang)} €</span>
      </div>
      {bill.total > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('Paid')}</span>
          <span className="tabular-nums">
            {numberToCurrency(Math.min(paid, bill.total), lang)} €
            <span className="text-muted-foreground">
              {' '}({numberToCurrency(remaining, lang)} € {t('pending')})
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
