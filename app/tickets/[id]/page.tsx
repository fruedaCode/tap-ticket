'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Pencil, ReceiptText, TriangleAlert, Users } from 'lucide-react'
import { BottomNav } from '@/components/bottom-nav'
import { GroupStatusBar } from '@/components/claim/group-status-bar'
import { memberName } from '@/components/claim/participant-avatar'
import { ReceiptListSkeleton } from '@/components/claim/receipt-list-skeleton'
import { SettleDialog } from '@/components/claim/settle-dialog'
import { TotalFooter } from '@/components/claim/total-footer'
import { IndividualBill } from '@/components/individual-bill'
import { ItemDialog } from '@/components/item-dialog'
import { ShareButton } from '@/components/share-button'
import { TagDialog } from '@/components/tag-dialog'
import { TicketItems } from '@/components/ticket-items'
import { UsersCarousel } from '@/components/users-carousel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { numberToCurrency } from '@/lib/currency'
import { useTicket } from '@/lib/hooks/useTicket'
import { useI18n } from '@/lib/i18n'
import { markSeen } from '@/lib/mutations'
import { getOutstanding, getTicketPaidPercentage, groupItemsByUser, type UserBill } from '@/lib/split'
import { createClient } from '@/lib/supabase/client'
import type { TicketItemWithAssignments } from '@/lib/types'

function assignmentSignature(item: TicketItemWithAssignments): string {
  return item.assignments
    .map((a) => `${a.user_id}:${a.payment_type}:${a.amount}`)
    .sort()
    .join('|')
}

export default function TicketSummaryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { lang, t } = useI18n()
  const [supabase] = useState(createClient)
  const { ticket, loading, error, reload } = useTicket(id)

  const [userId, setUserId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [imgOpen, setImgOpen] = useState(false)
  const [settleOpen, setSettleOpen] = useState(false)

  // live-update feedback: diff assignment signatures between refetches (§3.2)
  const prevSigs = useRef<Map<string, string> | null>(null)
  const [flashIds, setFlashIds] = useState<ReadonlySet<string>>(new Set())
  const [announcement, setAnnouncement] = useState('')

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

  useEffect(() => {
    if (!ticket) return
    const next = new Map(ticket.items.map((i) => [i.id, assignmentSignature(i)]))
    const prev = prevSigs.current
    prevSigs.current = next
    if (!prev) return // first load: nothing to highlight
    const changed = ticket.items.filter((i) => prev.has(i.id) && prev.get(i.id) !== next.get(i.id))
    if (changed.length === 0) return

    setFlashIds(new Set(changed.map((i) => i.id)))

    // announce the first newly-claiming participant when determinable
    const first = changed[0]
    const prevUsers = new Set(
      (prev.get(first.id) ?? '')
        .split('|')
        .filter(Boolean)
        .map((s) => s.split(':')[0]),
    )
    const newUserId = first.assignments.map((a) => a.user_id).find((u) => !prevUsers.has(u))
    const newMember = newUserId ? ticket.members.find((m) => m.user_id === newUserId) : undefined
    setAnnouncement(newMember ? `${memberName(newMember)} ${t('claimed')} ${first.description}` : t('Bill updated'))

    const timer = setTimeout(() => {
      setFlashIds(new Set())
      setAnnouncement('')
    }, 700)
    return () => clearTimeout(timer)
  }, [ticket, t])

  const bills = useMemo(() => (ticket ? groupItemsByUser(ticket.items) : []), [ticket])

  if (loading) {
    return (
      <>
        <ReceiptListSkeleton />
        <BottomNav />
      </>
    )
  }

  if (!ticket) {
    return (
      <div className="mx-auto w-full min-h-dvh max-w-md bg-background pb-24">
        <div className="flex flex-col items-center px-4 pt-24 text-center">
          {error ? (
            <>
              <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                <TriangleAlert className="size-8 text-muted-foreground" aria-hidden />
              </div>
              <p className="pt-4 text-muted-foreground">{t('Something went wrong')}</p>
              <Button variant="outline" className="mt-4 min-h-11" onClick={() => void reload()}>
                {t('Retry')}
              </Button>
            </>
          ) : (
            <>
              <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                <ReceiptText className="size-8 text-muted-foreground" aria-hidden />
              </div>
              <p className="pt-4 text-muted-foreground">{t('Invalid link')}</p>
            </>
          )}
        </div>
        <BottomNav />
      </div>
    )
  }

  // if the selected user is no longer a member, fall back to the current user
  const requested = selectedUserId ?? userId ?? ''
  const selected = ticket.members.some((m) => m.user_id === requested) ? requested : (userId ?? '')
  const emptyBill: UserBill = { userId: selected, items: [], total: 0 }
  const selectedBill = bills.find((b) => b.userId === selected) ?? emptyBill
  const myBill = bills.find((b) => b.userId === userId) ?? { userId: userId ?? '', items: [], total: 0 }
  const selectedSettled = selectedBill.total > 0 && getOutstanding(selectedBill, ticket.settlements) === 0

  // derive the live item so realtime reloads are reflected in the open dialog;
  // if the item was deleted, the dialog is treated as closed
  const selectedItem = selectedItemId ? (ticket.items.find((i) => i.id === selectedItemId) ?? null) : null

  const total = ticket.totals?.total_with_tax ?? 0
  const paidPct = getTicketPaidPercentage(ticket.items)

  return (
    <div className="mx-auto w-full min-h-dvh max-w-md bg-background pb-56">
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>

      {imgUrl && (
        <button type="button" className="block w-full" onClick={() => setImgOpen(true)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL from Supabase storage */}
          <img src={imgUrl} alt={ticket.restaurant?.name ?? t('Ticket')} className="h-52 w-full object-cover" />
        </button>
      )}

      <div className="px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">{ticket.restaurant?.name ?? t('Ticket')}</h1>
        <div className="flex items-baseline justify-between pt-1">
          <p className="text-sm text-muted-foreground">{ticket.invoice?.date}</p>
          <p className="font-medium tabular-nums">
            {t('Total')}: {numberToCurrency(total, lang)} €
          </p>
        </div>
      </div>

      <GroupStatusBar members={ticket.members} paidPercentage={paidPct} connected={!error} />

      <p className="px-4 pt-3 text-[13px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
        {t('Participants')}
      </p>
      <UsersCarousel members={ticket.members} selected={selected} onSelect={setSelectedUserId} currentUserId={userId ?? undefined} />

      {ticket.members.length <= 1 && (
        <div className="mx-4 mt-2 flex flex-col items-center gap-3 rounded-xl border bg-card p-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Users className="size-6 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-sm text-muted-foreground">{t('Splitting solo so far — share the link')}</p>
          <ShareButton ticket={ticket} />
        </div>
      )}

      <div className="flex flex-col gap-4 px-4 pt-4">
        <section aria-label={t('Items')}>
          <p className="pb-2 text-[13px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            {t('Items')}
          </p>
          {ticket.items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <ReceiptText className="size-6 text-muted-foreground" aria-hidden />
              </div>
              <p className="text-sm text-muted-foreground">{t('No items yet — check the receipt scan')}</p>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => router.push(`/tickets/${id}/edit`)}>
                {t('Review receipt')}
              </Button>
            </div>
          ) : (
            <TicketItems
              items={ticket.items}
              selectedUserId={selected}
              onPress={(item) => setSelectedItemId(item.id)}
              members={ticket.members}
              flashIds={flashIds}
            />
          )}
        </section>

        <IndividualBill bill={selectedBill} settled={selectedSettled} />

        <div className="flex gap-2">
          <ShareButton ticket={ticket} className="min-h-11 flex-1" />
          <TagDialog ticketId={ticket.id} members={ticket.members} className="min-h-11 flex-1" />
          <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={() => router.push(`/tickets/${id}/edit`)}>
            <Pencil />
            {t('Edit')}
          </Button>
        </div>
      </div>

      {selectedItem && userId && (
        <ItemDialog item={selectedItem} userId={userId} onClose={() => setSelectedItemId(null)} />
      )}

      {userId && (
        <SettleDialog
          ticket={ticket}
          bill={myBill}
          userId={userId}
          open={settleOpen}
          onClose={() => setSettleOpen(false)}
        />
      )}

      <Dialog open={imgOpen} onOpenChange={setImgOpen}>
        <DialogContent className="max-w-[calc(100%-1rem)] p-2 sm:max-w-2xl" onClick={() => setImgOpen(false)}>
          {imgUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL from Supabase storage
            <img src={imgUrl} alt={ticket.restaurant?.name ?? t('Ticket')} className="max-h-[80dvh] w-full object-contain" />
          )}
        </DialogContent>
      </Dialog>

      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md">
        <TotalFooter bill={selectedBill} onReview={() => setSettleOpen(true)} />
        <BottomNav className="relative" />
      </div>
    </div>
  )
}
