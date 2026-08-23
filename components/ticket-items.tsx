'use client'

import { ReceiptItemRow } from '@/components/claim/receipt-item-row'
import { useI18n } from '@/lib/i18n'
import type { MemberWithProfile, TicketItemWithAssignments } from '@/lib/types'

export function TicketItems({
  items,
  selectedUserId,
  onPress,
  members = [],
  flashIds,
  settledItemIds,
}: {
  items: TicketItemWithAssignments[]
  selectedUserId: string
  onPress: (item: TicketItemWithAssignments) => void
  members?: MemberWithProfile[]
  flashIds?: ReadonlySet<string>
  settledItemIds?: ReadonlySet<string>
}) {
  const { t } = useI18n()

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">{t('No items yet')}</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border bg-card">
      {items.map((item) => (
        <ReceiptItemRow
          key={item.id}
          item={item}
          viewerId={selectedUserId}
          members={members}
          onPress={onPress}
          flash={flashIds?.has(item.id) ?? false}
          settled={settledItemIds?.has(item.id) ?? false}
        />
      ))}
    </div>
  )
}
