'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plane, Plus } from 'lucide-react'
import { BottomNav } from '@/components/bottom-nav'
import { CreateTripDialog } from '@/components/create-trip-dialog'
import { TripProgressBar } from '@/components/trip-progress-bar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { numberToCurrency } from '@/lib/currency'
import { useTripList } from '@/lib/hooks/useTripList'
import { useI18n } from '@/lib/i18n'
import type { TripListRow } from '@/lib/queries'
import { getTripOverview } from '@/lib/trips'

function formatDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })
}

function TripCard({ row }: { row: TripListRow }) {
  const { lang, t } = useI18n()
  const overview = getTripOverview(row.trip, [], row.tickets)
  const { date_start: start, date_end: end } = overview
  const dateRange =
    start && end ? (start === end ? formatDate(start, lang) : `${formatDate(start, lang)} – ${formatDate(end, lang)}`) : null

  return (
    <Link
      href={`/trips/${row.trip.id}`}
      className="block rounded-xl border bg-card p-4 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted/50"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate font-medium">{row.trip.name}</p>
        <p className="shrink-0 font-medium tabular-nums">{numberToCurrency(overview.total, lang)}</p>
      </div>
      <p className="pt-0.5 text-sm text-muted-foreground">
        {[dateRange, `${row.memberCount} ${t('members')}`].filter(Boolean).join(' · ')}
      </p>
      <TripProgressBar pct={overview.progress_pct} className="mt-3" />
    </Link>
  )
}

export default function TripsPage() {
  const { rows, loading, error, reload } = useTripList()
  const { t } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="mx-auto w-full min-h-dvh max-w-md bg-background pb-24">
      <div className="flex items-center justify-between px-4 pb-2 pt-6">
        <h1 className="text-2xl font-bold">{t('Trips')}</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden />
          {t('New trip')}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3 px-4 pt-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="px-4 pt-16 text-center">
          <p className="text-muted-foreground">{t('Something went wrong')}</p>
          <Button variant="outline" className="mt-4" onClick={() => void reload()}>
            {t('Retry')}
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 pt-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Plane className="size-7 text-muted-foreground" aria-hidden />
          </div>
          <p className="font-medium">{t('No trips yet')}</p>
          <p className="text-sm text-muted-foreground">{t('Group tickets from a trip to see who had what')}</p>
          <Button className="mt-1 min-h-11" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden />
            {t('New trip')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 px-4 pt-2">
          {rows.map((row) => (
            <TripCard key={row.trip.id} row={row} />
          ))}
        </div>
      )}

      <CreateTripDialog open={createOpen} onOpenChange={setCreateOpen} />
      <BottomNav />
    </div>
  )
}
