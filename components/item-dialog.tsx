'use client'

import { useState } from 'react'
import { Minus, Plus, User, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { numberToCurrency } from '@/lib/currency'
import { useI18n } from '@/lib/i18n'
import { setItemAmount, splitItem, unsplitItem } from '@/lib/mutations'
import {
  calculateMaxPercentageAvailable,
  calculateMaxUnitsAvailable,
  getFinalPrice,
  getUnitPrice,
  getUnitThreshold,
} from '@/lib/split'
import { createClient } from '@/lib/supabase/client'
import type { TicketItemWithAssignments } from '@/lib/types'

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus />
        </Button>
        <span className="w-8 text-center text-lg font-semibold">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus />
        </Button>
      </div>
    </div>
  )
}

export function ItemDialog({
  item,
  userId,
  coveredClaims,
  onClose,
}: {
  item: TicketItemWithAssignments
  userId: string
  coveredClaims: ReadonlySet<string>
  onClose: () => void
}) {
  const { lang, t } = useI18n()
  const [supabase] = useState(createClient)
  const [view, setView] = useState<'mine' | 'split'>('mine')
  const [saving, setSaving] = useState(false)

  const isSplit = item.split_among > 0
  const others = item.assignments.filter((a) => a.user_id !== userId)
  const own = item.assignments.find((a) => a.user_id === userId)
  const ownUnits = own ? (own.payment_type === 'unit' ? own.amount : own.amount / getUnitThreshold(item)) : 0
  const ownFraction = own ? (own.payment_type === 'unit' ? own.amount * getUnitThreshold(item) : own.amount) : 0

  // max for the current user: quantity minus what OTHERS hold (own claim is already headroom)
  const maxUnits = calculateMaxUnitsAvailable(item, others)
  const maxFraction = calculateMaxPercentageAvailable(item, others)

  // display value: parts (of split_among) when the item is split, units otherwise
  const initialAmount = isSplit ? ownFraction * item.split_among : ownUnits
  const [amount, setAmount] = useState(initialAmount)
  // a claim covered by the user's payments cannot be reduced (the DB trigger mirrors this)
  const ownLocked = coveredClaims.has(`${item.id}:${userId}`)
  // split/unsplit rewrites every assignment on the item — blocked when any claim on it is already paid for
  const splitLocked = item.assignments.some((a) => a.amount > 0 && coveredClaims.has(`${item.id}:${a.user_id}`))
  const [splitAmong, setSplitAmong] = useState(isSplit ? item.split_among : 2)

  const maxAmount = isSplit ? Math.floor(maxFraction * item.split_among + 1e-9) : Math.floor(maxUnits + 1e-9)

  // title shows the genuinely unassigned remainder across ALL assignments (RN renderMaxAvailable)
  const titleRemaining =
    view === 'split' || isSplit
      ? numberToCurrency(calculateMaxPercentageAvailable(item, item.assignments) * getFinalPrice(item), lang)
      : numberToCurrency(calculateMaxUnitsAvailable(item, item.assignments) * getUnitPrice(item), lang)

  const liveTotal = isSplit
    ? (amount / item.split_among) * getFinalPrice(item)
    : amount * getUnitPrice(item)

  const handleSave = async () => {
    setSaving(true)
    try {
      await setItemAmount(
        supabase,
        item.id,
        userId,
        isSplit ? 'percentage' : 'unit',
        isSplit ? amount / item.split_among : amount,
      )
      onClose()
    } catch {
      toast.error(t('Error'))
    } finally {
      setSaving(false)
    }
  }

  const handleSplit = async () => {
    setSaving(true)
    try {
      await splitItem(supabase, item, splitAmong, userId)
      onClose()
    } catch {
      toast.error(t('Error'))
    } finally {
      setSaving(false)
    }
  }

  const handleUnsplit = async () => {
    setSaving(true)
    try {
      await unsplitItem(supabase, item)
      onClose()
    } catch {
      toast.error(t('Error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {item.description} — {t('Remaining')}: {titleRemaining} €
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={view === 'mine' ? 'default' : 'outline'}
            size="icon"
            aria-label={t('Mine')}
            onClick={() => setView('mine')}
          >
            <User />
          </Button>
          <Button
            type="button"
            variant={view === 'split' ? 'default' : 'outline'}
            size="icon"
            aria-label={t('Split')}
            onClick={() => setView('split')}
          >
            <Users />
          </Button>
        </div>

        {view === 'mine' ? (
          <div className="flex flex-col gap-4">
            <Stepper
              label={isSplit ? t('My share') : t('Units')}
              value={amount}
              min={ownLocked ? initialAmount : 0}
              max={maxAmount}
              onChange={setAmount}
            />
            {ownLocked && initialAmount > 0 && (
              <p className="text-[13px] text-muted-foreground">{t('Settled shares are locked')}</p>
            )}
            <p className="text-right text-sm">
              {t('Total')}: {numberToCurrency(liveTotal, lang)} €
            </p>
            <div className="flex justify-end">
              <Button type="button" disabled={saving} onClick={handleSave}>
                {t('Save')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {isSplit && (
              <p className="rounded-lg border bg-muted/50 p-3 text-sm">
                {t('This item has been split in')} {item.split_among} {t('Parts')}
              </p>
            )}
            <Stepper label={t('Divide among')} value={splitAmong} min={2} max={99} onChange={setSplitAmong} />
            {splitLocked && (
              <p className="text-[13px] text-muted-foreground">{t('Settled shares are locked')}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={saving || splitLocked} onClick={handleUnsplit}>
                {t('Unsplit')}
              </Button>
              <Button type="button" disabled={saving || splitLocked} onClick={handleSplit}>
                {t('Split')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
