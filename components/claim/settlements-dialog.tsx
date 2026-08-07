'use client'

import { useState } from 'react'
import { Eye, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { memberName } from '@/components/claim/participant-avatar'
import { numberToCurrency } from '@/lib/currency'
import { useI18n } from '@/lib/i18n'
import { resolveSettlement } from '@/lib/mutations'
import { createClient } from '@/lib/supabase/client'
import type { Settlement, TicketDetail } from '@/lib/types'

// group-wide settlement history: every payment, its proof, and confirm/reject
// for pending payments from other members
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

  const settlements = [...ticket.settlements].sort((a, b) => b.created_at.localeCompare(a.created_at))

  const nameOf = (id: string) => {
    const member = ticket.members.find((m) => m.user_id === id)
    return member ? memberName(member) : id.slice(0, 8)
  }
  const money = (n: number) => `${numberToCurrency(n, lang)} €`

  const handleResolve = async (id: string, status: 'confirmed' | 'rejected') => {
    try {
      await resolveSettlement(supabase, id, status)
    } catch {
      toast.error(t('Error'))
    }
  }

  const handleViewProof = async (settlement: Settlement) => {
    const { data } = await supabase.storage.from('settlement-proofs').createSignedUrl(settlement.proof_path, 3600)
    if (data?.signedUrl) setProofUrl(data.signedUrl)
    else toast.error(t('Error'))
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
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
                  {/* any member other than the payer may reject (dispute) a pending settlement */}
                  {s.status === 'pending' && s.from_user !== userId && (
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Reject')} onClick={() => void handleResolve(s.id, 'rejected')}>
                      <X className="text-destructive" />
                    </Button>
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
            <img src={proofUrl} alt={t('Payment proof')} className="max-h-[80dvh] w-full object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
