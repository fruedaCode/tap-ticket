'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { numberToCurrency } from '@/lib/currency'
import { useI18n } from '@/lib/i18n'
import { createSettlement, uploadSettlementProof } from '@/lib/mutations'
import { getActivePaid, getOutstanding, type UserBill } from '@/lib/split'
import { createClient } from '@/lib/supabase/client'
import type { TicketDetail } from '@/lib/types'

// pay-only dialog: the group-wide settlement list lives in settlements-dialog.tsx
export function SettleDialog({
  ticket,
  bill,
  userId,
  open,
  onClose,
}: {
  ticket: TicketDetail
  bill: UserBill
  userId: string
  open: boolean
  onClose: () => void
}) {
  const { t } = useI18n()

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('Settle up')}</DialogTitle>
        </DialogHeader>
        {/* remounted on each open so the form state re-initializes from props */}
        {open && <SettleBody ticket={ticket} bill={bill} userId={userId} onSettled={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function SettleBody({
  ticket,
  bill,
  userId,
  onSettled,
}: {
  ticket: TicketDetail
  bill: UserBill
  userId: string
  onSettled: () => void
}) {
  const { lang, t } = useI18n()
  const [supabase] = useState(createClient)
  const inputRef = useRef<HTMLInputElement>(null)

  // a submitted proof counts as paid; what's left is the share minus active settlements
  const alreadyPaid = getActivePaid(ticket.settlements, userId)
  const remaining = getOutstanding(bill, ticket.settlements)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const money = (n: number) => `${numberToCurrency(n, lang)} €`

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  const handleMarkPaid = async () => {
    if (!file || !(remaining > 0)) return
    setBusy(true)
    try {
      const id = crypto.randomUUID()
      const proofPath = await uploadSettlementProof(supabase, ticket.id, id, file)
      await createSettlement(supabase, { id, ticketId: ticket.id, fromUserId: userId, amount: remaining, proofPath })
      toast.success(t('Payment recorded'))
      // closing unmounts this body, so no form state needs resetting
      onSettled()
    } catch {
      toast.error(t('Error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('My part')}</span>
          <span className="tabular-nums">{money(bill.total)}</span>
        </div>
        {alreadyPaid > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('Already paid')}</span>
            <span className="tabular-nums">{money(alreadyPaid)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold">
          <span>{t('Pending')}</span>
          <span className="tabular-nums">{money(remaining)}</span>
        </div>
      </div>

      {remaining > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('Amount')}</span>
              <span className="tabular-nums">{money(remaining)}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('Payment proof')}</Label>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={onFileSelected}
              />
              {previewUrl ? (
                <button type="button" className="block w-full" onClick={() => inputRef.current?.click()}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not optimizable */}
                  <img src={previewUrl} alt={t('Payment proof')} className="max-h-48 w-full rounded-lg object-contain" />
                </button>
              ) : (
                <Button type="button" variant="outline" className="min-h-11" onClick={() => inputRef.current?.click()}>
                  <Camera />
                  {t('Add proof photo')}
                </Button>
              )}
            </div>

            <Button
              type="button"
              className="min-h-11"
              disabled={busy || !file}
              onClick={handleMarkPaid}
            >
              {t('Mark as paid')}
            </Button>
          </div>
        </>
      )}
    </>
  )
}
