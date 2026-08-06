'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Eye, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { memberName } from '@/components/claim/participant-avatar'
import { numberToCurrency } from '@/lib/currency'
import { useI18n } from '@/lib/i18n'
import { createSettlement, resolveSettlement, uploadSettlementProof } from '@/lib/mutations'
import { getOutstanding, getPaidByStatus, type UserBill } from '@/lib/split'
import { createClient } from '@/lib/supabase/client'
import type { Settlement, TicketDetail } from '@/lib/types'

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
  const [proofUrl, setProofUrl] = useState<string | null>(null)

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Settle up')}</DialogTitle>
          </DialogHeader>
          {/* remounted on each open so the form state re-initializes from props */}
          {open && <SettleBody ticket={ticket} bill={bill} userId={userId} onProofUrl={setProofUrl} />}
        </DialogContent>
      </Dialog>

      <Dialog open={proofUrl !== null} onOpenChange={(o) => !o && setProofUrl(null)}>
        <DialogContent className="max-w-[calc(100%-1rem)] p-2 sm:max-w-2xl" onClick={() => setProofUrl(null)}>
          {proofUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL from Supabase storage
            <img src={proofUrl} alt={t('Payment proof')} className="max-h-[80dvh] w-full object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function SettleBody({
  ticket,
  bill,
  userId,
  onProofUrl,
}: {
  ticket: TicketDetail
  bill: UserBill
  userId: string
  onProofUrl: (url: string) => void
}) {
  const { lang, t } = useI18n()
  const [supabase] = useState(createClient)
  const inputRef = useRef<HTMLInputElement>(null)

  const outstanding = getOutstanding(bill, ticket.settlements)
  const confirmedPaid = getPaidByStatus(ticket.settlements, userId, 'confirmed')
  const pendingPaid = getPaidByStatus(ticket.settlements, userId, 'pending')

  // any member other than the payer may confirm or reject a pending settlement
  const toConfirm = ticket.settlements.filter((s) => s.from_user !== userId && s.status === 'pending')
  const history = ticket.settlements.filter((s) => s.status !== 'pending')

  const [amountStr, setAmountStr] = useState(() => (outstanding > 0 ? outstanding.toFixed(2) : ''))
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const nameOf = (id: string) => {
    const member = ticket.members.find((m) => m.user_id === id)
    return member ? memberName(member) : id.slice(0, 8)
  }
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
    const amount = Number(amountStr.replace(',', '.'))
    if (!file || !(amount > 0)) return
    setBusy(true)
    try {
      const id = crypto.randomUUID()
      const proofPath = await uploadSettlementProof(supabase, ticket.id, id, file)
      await createSettlement(supabase, { id, ticketId: ticket.id, fromUserId: userId, amount, proofPath })
      toast.success(t('Payment recorded'))
      setFile(null)
      setPreviewUrl(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch {
      toast.error(t('Error'))
    } finally {
      setBusy(false)
    }
  }

  const handleResolve = async (id: string, status: 'confirmed' | 'rejected') => {
    try {
      await resolveSettlement(supabase, id, status)
    } catch {
      toast.error(t('Error'))
    }
  }

  const handleViewProof = async (settlement: Settlement) => {
    const { data } = await supabase.storage.from('settlement-proofs').createSignedUrl(settlement.proof_path, 3600)
    if (data?.signedUrl) onProofUrl(data.signedUrl)
    else toast.error(t('Error'))
  }

  const amount = Number(amountStr.replace(',', '.'))

  return (
    <>
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('Your share')}</span>
          <span className="tabular-nums">{money(bill.total)}</span>
        </div>
        {confirmedPaid > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('Paid')}</span>
            <span className="tabular-nums">{money(confirmedPaid)}</span>
          </div>
        )}
        {pendingPaid > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('Pending confirmation')}</span>
            <span className="tabular-nums">{money(pendingPaid)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold">
          <span>{t('Outstanding')}</span>
          <span className="tabular-nums">{money(outstanding)}</span>
        </div>
      </div>

      {outstanding > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settle-amount">{t('Amount')}</Label>
              <Input
                id="settle-amount"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('Payment proof')}</Label>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
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
              disabled={busy || !file || !(amount > 0)}
              onClick={handleMarkPaid}
            >
              {t('Mark as paid')}
            </Button>
          </div>
        </>
      )}

      {toConfirm.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-1">
            <p className="pb-1 text-[13px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              {t('Payments to confirm')}
            </p>
            {toConfirm.map((s) => (
              <div key={s.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {nameOf(s.from_user)} · {money(s.amount)}
                </span>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t('View proof')} onClick={() => void handleViewProof(s)}>
                  <Eye />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Confirm')} onClick={() => void handleResolve(s.id, 'confirmed')}>
                  <Check className="text-green-600" />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Reject')} onClick={() => void handleResolve(s.id, 'rejected')}>
                  <X className="text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      {history.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-1">
            <p className="pb-1 text-[13px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              {t('History')}
            </p>
            {history.map((s) => (
              <div key={s.id} className="flex items-center gap-2 py-1 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {nameOf(s.from_user)} · {money(s.amount)}
                </span>
                <span className={s.status === 'confirmed' ? 'text-green-600' : 'text-destructive'}>
                  {t(s.status === 'confirmed' ? 'Confirmed' : 'Rejected')}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
