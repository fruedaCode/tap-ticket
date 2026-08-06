'use client'

import { Check } from 'lucide-react'
import { numberToCurrency } from '@/lib/currency'
import { useI18n } from '@/lib/i18n'
import { getFinalPrice, getPercentagePaid, getUnitPrice, isItemPaid } from '@/lib/split'
import type { TicketItemWithAssignments } from '@/lib/types'
import { cn } from '@/lib/utils'

export function TicketItems({
  items,
  selectedUserId,
  onPress,
}: {
  items: TicketItemWithAssignments[]
  selectedUserId: string
  onPress: (item: TicketItemWithAssignments) => void
}) {
  const { lang } = useI18n()

  return (
    <div className="divide-y rounded-xl border bg-card">
      {items.map((item) => {
        const paid = isItemPaid(item, item.assignments)
        const userAmount = getFinalPrice(item) * getPercentagePaid(item, item.assignments, selectedUserId)
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onPress(item)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/50"
          >
            <div className="min-w-0 flex-1">
              <p className={cn('truncate font-medium', paid && 'line-through opacity-60')}>{item.description}</p>
              <p className={cn('text-sm text-muted-foreground', paid && 'line-through opacity-60')}>
                {item.quantity} × {numberToCurrency(getUnitPrice(item), lang)} €
              </p>
            </div>
            {userAmount > 0 && (
              <span className="shrink-0 text-sm font-medium">{numberToCurrency(userAmount, lang)} €</span>
            )}
            {paid && <Check className="size-5 shrink-0 text-green-600" />}
          </button>
        )
      })}
    </div>
  )
}
