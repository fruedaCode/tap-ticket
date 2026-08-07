'use client'

import { ChevronRight } from 'lucide-react'
import { ClaimChip } from '@/components/claim/claim-chip'
import { memberName } from '@/components/claim/participant-avatar'
import { numberToCurrency } from '@/lib/currency'
import { useI18n } from '@/lib/i18n'
import { getFinalPrice, getPercentagePaid, getUnitPrice, isItemPaid } from '@/lib/split'
import type { MemberWithProfile, TicketItemWithAssignments } from '@/lib/types'
import { cn } from '@/lib/utils'

const MAX_CLAIMANT_CHIPS = 2

export function ReceiptItemRow({
  item,
  viewerId,
  members,
  onPress,
  flash = false,
  settled = false,
}: {
  item: TicketItemWithAssignments
  viewerId: string
  members: MemberWithProfile[]
  onPress: (item: TicketItemWithAssignments) => void
  flash?: boolean
  // fully assigned AND every claimant's share covered by their payments (getSettledItemIds)
  settled?: boolean
}) {
  const { lang, t } = useI18n()

  const finalPrice = getFinalPrice(item)
  const paid = isItemPaid(item, item.assignments)

  // unique claimants with a positive share of this item
  const claimantIds = [...new Set(item.assignments.map((a) => a.user_id))].filter(
    (id) => getPercentagePaid(item, item.assignments, id) > 0,
  )
  const viewerPct = getPercentagePaid(item, item.assignments, viewerId)
  const viewerClaims = viewerPct > 0
  const isShared = claimantIds.length > 1
  const userShare = finalPrice * viewerPct

  // partially claimed with unit granularity → "N of M left"
  const claimedPct = getPercentagePaid(item, item.assignments)
  const leftUnits = Math.round(item.quantity * (1 - claimedPct))
  const showLeft = !paid && claimantIds.length > 0 && item.quantity > 1 && leftUnits >= 1

  const nameById = new Map(members.map((m) => [m.user_id, memberName(m)]))
  const otherClaimants = claimantIds.filter((id) => id !== viewerId)
  const shownOthers = otherClaimants.slice(0, MAX_CLAIMANT_CHIPS)
  const overflow = otherClaimants.length - shownOthers.length

  const amount = viewerClaims ? userShare : finalPrice
  const amountMuted = !viewerClaims && claimantIds.length > 0

  const stateLabel = paid
    ? settled
      ? t('Settled')
      : t('Covered')
    : viewerClaims
      ? t('You')
      : claimantIds.length > 0
        ? otherClaimants.map((id) => nameById.get(id) ?? t('User')).join(', ')
        : t('Tap to claim')
  const ariaLabel = `${item.description}, ${numberToCurrency(amount, lang)} €, ${stateLabel}`

  return (
    <button
      type="button"
      onClick={() => onPress(item)}
      aria-label={ariaLabel}
      className={cn(
        'flex min-h-16 w-full items-center gap-3 border-l-[3px] px-4 py-3 text-left transition-colors',
        'active:scale-[0.99] motion-reduce:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        viewerClaims && !paid ? 'border-l-primary' : 'border-l-transparent',
        paid && (settled ? 'bg-success-subtle' : 'bg-success-subtle/50'),
        flash && 'animate-[row-flash_600ms_ease-out] motion-reduce:animate-none',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium">{item.description}</p>
        <p className="text-[13px] text-muted-foreground tabular-nums">
          {item.quantity} × {numberToCurrency(getUnitPrice(item), lang)} €
        </p>
        {(paid || claimantIds.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 pt-1.5">
            {paid ? (
              <ClaimChip variant={settled ? 'settled' : 'covered'} label={settled ? t('Settled') : t('Covered')} />
            ) : (
              <>
                {viewerClaims && <ClaimChip variant="you" label={t('You')} />}
                {shownOthers.map((id) => (
                  <ClaimChip key={id} variant="other" label={nameById.get(id) ?? t('User')} />
                ))}
                {overflow > 0 && <ClaimChip variant="other" label={`+${overflow}`} />}
                {isShared && <ClaimChip variant="shared" label={`${t('Split')} · ${claimantIds.length}`} />}
                {showLeft && (
                  <ClaimChip variant="left" label={`${leftUnits} ${t('of')} ${item.quantity} ${t('left')}`} />
                )}
              </>
            )}
          </div>
        )}
      </div>
      <span
        className={cn(
          'shrink-0 text-[15px] font-semibold tabular-nums',
          amountMuted && 'font-normal text-muted-foreground',
        )}
      >
        {numberToCurrency(amount, lang)} €
      </span>
      {claimantIds.length === 0 && (
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </button>
  )
}
