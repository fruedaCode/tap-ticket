'use client'

import { ReceiptItemRow } from '@/components/claim/receipt-item-row'
import type { MemberWithProfile, TicketItemWithAssignments } from '@/lib/types'

export function TicketItems({
  items,
  selectedUserId,
  onPress,
  members = [],
  flashIds,
}: {
  items: TicketItemWithAssignments[]
  selectedUserId: string
  onPress: (item: TicketItemWithAssignments) => void
  members?: MemberWithProfile[]
  flashIds?: ReadonlySet<string>
}) {
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
        />
      ))}
    </div>
  )
}
