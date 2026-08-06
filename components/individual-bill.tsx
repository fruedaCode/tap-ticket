'use client'

import { Separator } from '@/components/ui/separator'
import { numberToCurrency } from '@/lib/currency'
import { useI18n } from '@/lib/i18n'
import type { UserBill } from '@/lib/split'

export function IndividualBill({ bill }: { bill: UserBill }) {
  const { lang, t } = useI18n()

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="pb-2 text-sm font-semibold">{t('Your bill')}</h3>
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
    </div>
  )
}
