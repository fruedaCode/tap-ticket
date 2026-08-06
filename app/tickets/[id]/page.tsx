'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { BottomNav } from '@/components/bottom-nav'
import { IndividualBill } from '@/components/individual-bill'
import { ItemDialog } from '@/components/item-dialog'
import { ShareButton } from '@/components/share-button'
import { TagDialog } from '@/components/tag-dialog'
import { TicketItems } from '@/components/ticket-items'
import { UsersCarousel } from '@/components/users-carousel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { numberToCurrency } from '@/lib/currency'
import { useTicket } from '@/lib/hooks/useTicket'
import { useI18n } from '@/lib/i18n'
import { markSeen } from '@/lib/mutations'
import { getTicketPaidPercentage, groupItemsByUser, type UserBill } from '@/lib/split'
import { createClient } from '@/lib/supabase/client'

export default function TicketSummaryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { lang, t } = useI18n()
  const [supabase] = useState(createClient)
  const { ticket, loading } = useTicket(id)

  const [userId, setUserId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [imgOpen, setImgOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
      if (user) setSelectedUserId((prev) => prev ?? user.id)
    })
  }, [supabase])

  // mark the ticket as seen for the current user (fire and forget)
  useEffect(() => {
    if (!ticket || !userId) return
    const membership = ticket.members.find((m) => m.user_id === userId)
    if (membership && !membership.seen) void markSeen(supabase, id, userId)
  }, [ticket, userId, supabase, id])

  // signed URL for the receipt image
  useEffect(() => {
    if (!ticket?.img_path) return
    supabase.storage
      .from('ticket-images')
      .createSignedUrl(ticket.img_path, 3600)
      .then(({ data }) => setImgUrl(data?.signedUrl ?? null))
  }, [supabase, ticket?.img_path])

  const bills = useMemo(() => (ticket ? groupItemsByUser(ticket.items) : []), [ticket])

  if (loading) {
    return (
      <div className="mx-auto min-h-dvh max-w-md bg-background pb-24">
        <Skeleton className="h-52 w-full rounded-none" />
        <div className="space-y-3 px-4 pt-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-3 py-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="size-12 rounded-full" />
            ))}
          </div>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
        <BottomNav />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="mx-auto min-h-dvh max-w-md bg-background pb-24">
        <p className="px-4 pt-24 text-center text-muted-foreground">{t('Invalid link')}</p>
        <BottomNav />
      </div>
    )
  }

  // if the selected user is no longer a member, fall back to the current user
  const requested = selectedUserId ?? userId ?? ''
  const selected = ticket.members.some((m) => m.user_id === requested) ? requested : (userId ?? '')
  const emptyBill: UserBill = { userId: selected, items: [], total: 0 }
  const selectedBill = bills.find((b) => b.userId === selected) ?? emptyBill

  // derive the live item so realtime reloads are reflected in the open dialog;
  // if the item was deleted, the dialog is treated as closed
  const selectedItem = selectedItemId ? (ticket.items.find((i) => i.id === selectedItemId) ?? null) : null

  const total = ticket.totals?.total_with_tax ?? 0
  const paidPct = getTicketPaidPercentage(ticket.items)
  const remaining = total * (1 - paidPct)

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-background pb-24">
      {imgUrl && (
        <button type="button" className="block w-full" onClick={() => setImgOpen(true)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL from Supabase storage */}
          <img src={imgUrl} alt={ticket.restaurant?.name ?? t('Ticket')} className="h-52 w-full object-cover" />
        </button>
      )}

      <div className="px-4 pt-4">
        <h1 className="text-2xl font-bold">{ticket.restaurant?.name ?? t('Ticket')}</h1>
        <div className="flex items-baseline justify-between pt-1">
          <p className="text-sm text-muted-foreground">{ticket.invoice?.date}</p>
          <p className="font-medium">
            {t('Total')}: {numberToCurrency(total, lang)} €
          </p>
        </div>
      </div>

      <UsersCarousel members={ticket.members} selected={selected} onSelect={setSelectedUserId} />

      <div className="flex flex-col gap-4 px-4 pt-2">
        <TicketItems items={ticket.items} selectedUserId={selected} onPress={(item) => setSelectedItemId(item.id)} />

        <IndividualBill bill={selectedBill} />

        <div className="flex flex-col gap-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(paidPct * 100)}%` }} />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('Total to pay')}: {numberToCurrency(total, lang)} €
            </span>
            <span className="font-medium">
              {t('Remaining')}: {numberToCurrency(remaining, lang)} €
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <ShareButton ticket={ticket} />
          <TagDialog ticketId={ticket.id} members={ticket.members} />
          <Button type="button" variant="outline" onClick={() => router.push(`/tickets/${id}/edit`)}>
            <Pencil />
            {t('Edit')}
          </Button>
        </div>
      </div>

      {selectedItem && userId && (
        <ItemDialog item={selectedItem} userId={userId} onClose={() => setSelectedItemId(null)} />
      )}

      <Dialog open={imgOpen} onOpenChange={setImgOpen}>
        <DialogContent className="max-w-[calc(100%-1rem)] p-2 sm:max-w-2xl" onClick={() => setImgOpen(false)}>
          {imgUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL from Supabase storage
            <img src={imgUrl} alt={ticket.restaurant?.name ?? t('Ticket')} className="max-h-[80dvh] w-full object-contain" />
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  )
}
