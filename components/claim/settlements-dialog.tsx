'use client'

import { useState } from 'react'
import { Eye, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { memberName } from '@/components/claim/participant-avatar'
import { numberToCurrency } from '@/lib/currency'
import { useI18n } from '@/lib/i18n'
import { rejectSettlement } from '@/lib/mutations'
import { createClient } from '@/lib/supabase/client'
import type { Settlement, TicketDetail } from '@/lib/types'

// group-wide settlement history: every payment and its proof; any member other
// than the payer may reject (dispute) a pending payment, which reopens the debt
export function SettlementsDialog({
  ticket,
  userId,
  open,
  onClose,
}: {
  ticket: TicketDetail
  userId: string
  open: boolean
  onClose: () => void
}) {
  const { lang, t } = useI18n()
  const [supabase] = useState(createClient)
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [proofDims, setProofDims] = useState<{ width: number; height: number } | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const settlements = [...ticket.settlements].sort((a, b) => b.created_at.localeCompare(a.created_at))

  const nameOf = (id: string) => {
    const member = ticket.members.find((m) => m.user_id === id)
    return member ? memberName(member) : id.slice(0, 8)
  }
  const money = (n: number) => numberToCurrency(n, lang)

  const handleReject = async (id: string) => {
    try {
      await rejectSettlement(supabase, id)
    } catch {
      toast.error(t('Could not reject the payment. Try again.'))
    }
  }

  const handleViewProof = async (settlement: Settlement) => {
    const { data } = await supabase.storage.from('settlement-proofs').createSignedUrl(settlement.proof_path, 3600)
    if (data?.signedUrl) setProofUrl(data.signedUrl)
    else toast.error(t('Could not load the payment proof. Try again.'))
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => {
        if (!o) {
          setConfirmingId(null)
          onClose()
        }
      }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Payment history')}</DialogTitle>
          </DialogHeader>

          {settlements.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t('No payments yet')}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {settlements.map((s) => (
                <div key={s.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{nameOf(s.from_user)}</span>
                  <span className="shrink-0 tabular-nums">{money(s.amount)}</span>
                  {s.status === 'rejected' && <span className="shrink-0 text-destructive">{t('Rejected')}</span>}
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={t('View proof')} onClick={() => void handleViewProof(s)}>
                    <Eye />
                  </Button>
                  {/* any member other than the payer may reject (dispute) a pending settlement;
                      destructive, so the first tap only arms an inline confirm/cancel pair */}
                  {s.status === 'pending' && s.from_user !== userId && (
                    confirmingId === s.id ? (
                      <>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingId(null)}>
                          {t('Cancel')}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setConfirmingId(null)
                            void handleReject(s.id)
                          }}
                        >
                          {t('Confirm')}
                        </Button>
                      </>
                    ) : (
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Reject')} onClick={() => setConfirmingId(s.id)}>
                        <X className="text-destructive" />
                      </Button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={proofUrl !== null} onOpenChange={(o) => !o && setProofUrl(null)}>
        <DialogContent className="max-w-[calc(100%-1rem)] p-2 sm:max-w-2xl" onClick={() => setProofUrl(null)}>
          {proofUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL from Supabase storage
            <img
              src={proofUrl}
              alt={t('Payment proof')}
              width={proofDims?.width}
              height={proofDims?.height}
              onLoad={(e) => setProofDims({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
              className="max-h-[80dvh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
