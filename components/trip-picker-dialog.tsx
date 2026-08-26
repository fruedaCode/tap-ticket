'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Plane } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/lib/i18n'
import { setTicketTrip } from '@/lib/mutations'
import { fetchTripList, type TripListRow } from '@/lib/queries'
import { createClient } from '@/lib/supabase/client'

export function TripPickerDialog({
  ticketId,
  tripId,
  className,
}: {
  ticketId: string
  tripId: string | null
  className?: string
}) {
  const { t } = useI18n()
  const [supabase] = useState(createClient)
  const [open, setOpen] = useState(false)
  const [trips, setTrips] = useState<TripListRow[] | null>(null)
  const [busy, setBusy] = useState(false)

  const loadTrips = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) return
    setTrips(null)
    fetchTripList(supabase)
      .then(setTrips)
      .catch(() => {
        toast.error(t('Something went wrong. Try again.'))
        setOpen(false)
      })
  }

  const currentTrip = tripId ? (trips?.find((row) => row.trip.id === tripId)?.trip ?? null) : null

  const move = async (targetTripId: string | null) => {
    setBusy(true)
    try {
      await setTicketTrip(supabase, ticketId, targetTripId)
      setOpen(false)
      toast.success(t('Success'))
      // the ticket realtime channel refreshes the page on its own
    } catch {
      toast.error(t('Could not move the ticket. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={loadTrips}>
      <DialogTrigger render={<Button variant="outline" className={className} />}>
        <Plane />
        {t('Trip')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tripId ? t('Current trip') : t('Add to trip')}</DialogTitle>
        </DialogHeader>

        {trips === null ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : tripId ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              <span className="text-muted-foreground">{t('Current trip')}: </span>
              {currentTrip ? (
                currentTrip.name
              ) : (
                <Link href={`/trips/${tripId}`} className="underline underline-offset-3">
                  {t('Trip')}
                </Link>
              )}
            </p>
            <Button type="button" variant="destructive" disabled={busy} onClick={() => move(null)}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {t('Remove from trip')}
            </Button>
          </div>
        ) : trips.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('No trips yet')}</p>
        ) : (
          <div className="flex max-h-72 flex-col divide-y overflow-y-auto rounded-lg border">
            {trips.map((row) => (
              <button
                key={row.trip.id}
                type="button"
                disabled={busy}
                onClick={() => move(row.trip.id)}
                className="flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.trip.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {row.memberCount} {t('members')}
                </span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
