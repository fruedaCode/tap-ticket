'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Camera, Loader2, Pencil, Plus, ReceiptText, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { BackButton } from '@/components/back-button'
import { BottomNav } from '@/components/bottom-nav'
import { TripProgressBar } from '@/components/trip-progress-bar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { numberToCurrency, numberToPercentage } from '@/lib/currency'
import { useTrip } from '@/lib/hooks/useTrip'
import { useI18n } from '@/lib/i18n'
import {
  addTripMemberByEmail,
  deleteTrip,
  removeTripMember,
  renameTrip,
  setTicketTrip,
} from '@/lib/mutations'
import { fetchTripCandidates } from '@/lib/queries'
import { createClient } from '@/lib/supabase/client'
import type { Ticket, TripTicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const STATUS_DOT: Record<TripTicketStatus, string> = {
  complete: 'bg-success',
  partial: 'bg-warning',
  open: 'bg-muted-foreground/30',
}

function formatDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TripPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { lang, t } = useI18n()
  const [supabase] = useState(createClient)
  const { overview, loading, error, reload } = useTrip(id)

  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [supabase])

  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [addTicketOpen, setAddTicketOpen] = useState(false)
  const [candidates, setCandidates] = useState<Ticket[] | null>(null)
  const [busy, setBusy] = useState(false)

  const handleRename = async () => {
    const trimmed = renameValue.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      await renameTrip(supabase, id, trimmed)
      setRenameOpen(false)
    } catch {
      toast.error(t('Could not rename the trip. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  const handleAddMember = async () => {
    const trimmed = email.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      await addTripMemberByEmail(supabase, id, trimmed)
      setEmail('')
      toast.success(t('Success'))
    } catch (err) {
      if (err instanceof Error && err.message.includes('user_not_found')) {
        toast.error(t('User not found'))
      } else {
        toast.error(t('Could not add the participant. Check the email and try again.'))
      }
    } finally {
      setBusy(false)
    }
  }

  const handleRemoveMember = async (memberUserId: string) => {
    try {
      await removeTripMember(supabase, id, memberUserId)
    } catch {
      toast.error(t('Could not remove the member. Try again.'))
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await deleteTrip(supabase, id)
      router.replace('/trips')
    } catch {
      toast.error(t('Could not delete the trip. Try again.'))
      setBusy(false)
    }
  }

  const handleLeave = async () => {
    if (!userId) return
    setBusy(true)
    try {
      await removeTripMember(supabase, id, userId)
      router.replace('/trips')
    } catch {
      toast.error(t('Could not leave the trip. Try again.'))
      setBusy(false)
    }
  }

  const openAddTicket = () => {
    setAddTicketOpen(true)
    setCandidates(null)
    fetchTripCandidates(supabase)
      .then(setCandidates)
      .catch(() => {
        toast.error(t('Something went wrong. Try again.'))
        setAddTicketOpen(false)
      })
  }

  const handlePickTicket = async (ticketId: string) => {
    setBusy(true)
    try {
      await setTicketTrip(supabase, ticketId, id)
      setAddTicketOpen(false)
      toast.success(t('Successfully added'))
      void reload()
    } catch {
      toast.error(t('Could not move the ticket. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full min-h-dvh max-w-md bg-background pb-24">
        <div className="space-y-4 px-4 pt-6">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <BottomNav />
      </div>
    )
  }

  if (error || !overview) {
    return (
      <div className="mx-auto w-full min-h-dvh max-w-md bg-background pb-24">
        <div className="px-4 pt-16 text-center">
          <p className="text-muted-foreground">{t('Something went wrong')}</p>
          <Button variant="outline" className="mt-4" onClick={() => void reload()}>
            {t('Retry')}
          </Button>
        </div>
        <BottomNav />
      </div>
    )
  }

  const { trip } = overview
  const isOwner = userId !== null && trip.owner_id === userId
  const money = (n: number) => numberToCurrency(n, lang)
  const pct = Number(numberToPercentage(overview.progress_pct))
  const { date_start: start, date_end: end } = overview
  const dateRange =
    start && end ? (start === end ? formatDate(start, lang) : `${formatDate(start, lang)} – ${formatDate(end, lang)}`) : null
  const hasTickets = overview.tickets.length > 0

  return (
    <div className="mx-auto w-full min-h-dvh max-w-md bg-background pb-24">
      <div className="px-4 pt-6">
        <BackButton href="/trips" />
        <h1 className="text-2xl font-bold">{trip.name}</h1>
        <p className="pt-1 text-sm text-muted-foreground">
          {[dateRange, `${overview.members.length} ${t('members')}`].filter(Boolean).join(' · ')}
        </p>
        <div className="flex flex-wrap gap-2 pt-3">
          {isOwner ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRenameValue(trip.name)
                  setRenameOpen(true)
                }}
              >
                <Pencil aria-hidden />
                {t('Rename trip')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAddMemberOpen(true)}>
                <UserPlus aria-hidden />
                {t('Add member')}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 aria-hidden />
                {t('Delete trip')}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setLeaveOpen(true)}>
              {t('Leave trip')}
            </Button>
          )}
        </div>
      </div>

      {!hasTickets ? (
        <div className="flex flex-col items-center gap-3 px-4 pt-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <ReceiptText className="size-7 text-muted-foreground" aria-hidden />
          </div>
          <p className="font-medium">{t('No tickets in this trip yet')}</p>
          <p className="text-sm text-muted-foreground">{t('Scan a receipt or add an existing ticket')}</p>
          <Button className="mt-1 min-h-11" nativeButton={false} render={<Link href={`/scan?tripId=${id}`} />}>
            <Camera className="size-4" aria-hidden />
            {t('Scan receipt')}
          </Button>
          <Button variant="outline" className="min-h-11" onClick={openAddTicket}>
            <Plus className="size-4" aria-hidden />
            {t('Add existing ticket')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 px-4 pt-6">
          <div className="flex gap-2">
            <Button className="min-h-11 flex-1" nativeButton={false} render={<Link href={`/scan?tripId=${id}`} />}>
              <Camera className="size-4" aria-hidden />
              {t('Scan receipt')}
            </Button>
            <Button variant="outline" className="min-h-11 flex-1" onClick={openAddTicket}>
              <Plus className="size-4" aria-hidden />
              {t('Add existing ticket')}
            </Button>
          </div>

          <section aria-label={t('Total')}>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs text-muted-foreground">{t('Total')}</p>
                <p className="pt-1 font-medium tabular-nums">{money(overview.total)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {overview.tickets.length} {t('tickets')}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs text-muted-foreground">{t('Assigned')}</p>
                <p className="pt-1 font-medium tabular-nums">{money(overview.assigned)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{pct}%</p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs text-muted-foreground">{t('Unassigned')}</p>
                <p className="pt-1 font-medium tabular-nums">{money(overview.unassigned)}</p>
                {overview.unassigned > 0.004 && (
                  <p className="text-xs font-medium text-warning">{t('Needs review')}</p>
                )}
              </div>
            </div>
            <TripProgressBar pct={overview.progress_pct} className="mt-3" />
          </section>

          <section aria-label={t('Members')}>
            <h2 className="pb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {t('Members')}
            </h2>
            <div className="divide-y rounded-xl border bg-card px-3">
              {overview.members.map(({ member, share, share_pct }) => {
                const name = member.profile.display_name ?? '?'
                return (
                  <div key={member.user_id} className="flex items-center gap-3 py-2">
                    <Avatar className="size-8">
                      {member.profile.photo_url && <AvatarImage src={member.profile.photo_url} alt={name} />}
                      <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {name}
                        {member.role === 'owner' && (
                          <span className="text-muted-foreground"> · {t('Owner')}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right tabular-nums">
                      <p className="text-sm font-medium">{money(share)}</p>
                      <p className="text-xs text-muted-foreground">
                        {numberToPercentage(share_pct, '%')} {t('of the trip')}
                      </p>
                    </div>
                    {isOwner && member.role !== 'owner' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('Remove')}
                        onClick={() => handleRemoveMember(member.user_id)}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section aria-label={t('tickets')}>
            <h2 className="pb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {t('tickets')}
            </h2>
            <div className="divide-y rounded-xl border bg-card">
              {overview.tickets.map((summary) => (
                <Link
                  key={summary.ticket.id}
                  href={`/tickets/${summary.ticket.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-muted/50"
                >
                  <span
                    className={cn('size-2 shrink-0 rounded-full', STATUS_DOT[summary.status])}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {summary.ticket.restaurant?.name ?? t('Ticket')}
                    </p>
                    {summary.date && (
                      <p className="text-xs text-muted-foreground">{formatDate(summary.date, lang)}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {money(summary.assigned)} / {money(summary.total)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* rename */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Rename trip')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rename-trip">{t('Trip name')}</Label>
            <Input
              id="rename-trip"
              name="rename-trip"
              autoComplete="off"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t('Cancel')}</DialogClose>
            <Button type="button" disabled={busy || !renameValue.trim()} onClick={handleRename}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {t('Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* add member by email */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Add member by email')}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Label htmlFor="trip-member-email" className="sr-only">
              {t('User email')}
            </Label>
            <Input
              id="trip-member-email"
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="name@example.com…"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
            />
            <Button type="button" disabled={busy || !email.trim()} onClick={handleAddMember}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {t('Confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete trip?')}</DialogTitle>
            <DialogDescription>{t('The trip will be deleted but its tickets will be kept.')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t('Cancel')}</DialogClose>
            <Button type="button" variant="destructive" disabled={busy} onClick={handleDelete}>
              {t('Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* leave confirm */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Leave trip?')}</DialogTitle>
            <DialogDescription>{t('You will lose access to the tickets in this trip.')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t('Cancel')}</DialogClose>
            <Button type="button" variant="destructive" disabled={busy} onClick={handleLeave}>
              {t('Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* add existing ticket */}
      <Dialog open={addTicketOpen} onOpenChange={setAddTicketOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Add existing ticket')}</DialogTitle>
          </DialogHeader>
          {candidates === null ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('No tickets without a trip')}</p>
          ) : (
            <div className="flex max-h-72 flex-col divide-y overflow-y-auto rounded-lg border">
              {candidates.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  disabled={busy}
                  onClick={() => handlePickTicket(ticket.id)}
                  className="flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ticket.restaurant?.name ?? t('Ticket')}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(ticket.created_at, lang)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {money(ticket.totals?.total_with_tax ?? 0)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  )
}
