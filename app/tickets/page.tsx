'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { BottomNav } from '@/components/bottom-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { numberToCurrency } from '@/lib/currency'
import { useTicketList } from '@/lib/hooks/useTicketList'
import { useI18n } from '@/lib/i18n'
import { markSeen } from '@/lib/mutations'
import type { TicketListRow } from '@/lib/queries'
import { getFinalPrice, getPercentagePaid } from '@/lib/split'
import { createClient } from '@/lib/supabase/client'

type Row = TicketListRow
type Filter = 'all' | 'unread' | 'owner' | 'member'

const FILTERS: Filter[] = ['all', 'unread', 'owner', 'member']
const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  unread: 'Unread',
  owner: 'Created by me',
  member: 'Shared with me',
}

function formatMoney(amount: number, lang: string) {
  return `${numberToCurrency(amount, lang)} €`
}

function getUserPaid(row: Row, userId: string | null): number {
  if (!userId) return 0
  return row.items.reduce(
    (sum, item) => sum + getFinalPrice(item) * getPercentagePaid(item, item.item_assignments ?? [], userId),
    0,
  )
}

function TicketRow({ row, userId, onOpen }: { row: Row; userId: string | null; onOpen: (ticketId: string) => void }) {
  const { lang, t } = useI18n()
  const { ticket } = row
  const date = new Date(ticket.created_at)

  return (
    <button
      type="button"
      onClick={() => onOpen(ticket.id)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {!row.membership.seen && <span className="size-2 shrink-0 rounded-full bg-primary" />}
          <span className="truncate font-medium">{ticket.restaurant?.name ?? t('Ticket')}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {date.toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="text-right">
        <p className="font-medium">{formatMoney(ticket.totals?.total_with_tax ?? 0, lang)}</p>
        <p className="text-sm text-muted-foreground">{formatMoney(getUserPaid(row, userId), lang)}</p>
      </div>
    </button>
  )
}

export default function TicketsPage() {
  const { rows, loading, error, reload } = useTicketList()
  const { lang, t } = useI18n()
  const router = useRouter()
  const [supabase] = useState(createClient)
  const [userId, setUserId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [supabase])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (filter === 'unread' && row.membership.seen) return false
      if (filter !== 'all' && filter !== 'unread' && row.membership.role !== filter) return false
      if (q && !(row.ticket.restaurant?.name ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, query, filter])

  const groups = useMemo(() => {
    const byMonth = new Map<number, { label: string; rows: Row[] }>()
    for (const row of filteredRows) {
      const date = new Date(row.ticket.created_at)
      const key = date.getFullYear() * 12 + date.getMonth()
      let group = byMonth.get(key)
      if (!group) {
        group = {
          label: new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(date),
          rows: [],
        }
        byMonth.set(key, group)
      }
      group.rows.push(row)
    }
    return [...byMonth.entries()].sort((a, b) => b[0] - a[0]).map(([, group]) => group)
  }, [filteredRows, lang])

  const openTicket = (ticketId: string) => {
    if (userId) void markSeen(supabase, ticketId, userId)
    router.push(`/tickets/${ticketId}`)
  }

  return (
    <div className="mx-auto w-full min-h-dvh max-w-md bg-background pb-24">
      <h1 className="px-4 pb-2 pt-6 text-2xl font-bold">{t('My tickets')}</h1>

      {!loading && !error && rows.length > 0 && (
        <div className="space-y-2 px-4 pb-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Search tickets')}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {FILTERS.map((f) => (
              <Button
                key={f}
                type="button"
                size="sm"
                variant={filter === f ? 'default' : 'outline'}
                className="shrink-0 rounded-full"
                onClick={() => setFilter(f)}
              >
                {t(FILTER_LABELS[f])}
              </Button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 px-4 pt-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
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
        <p className="px-4 pt-16 text-center text-muted-foreground">{t('No tickets yet')}</p>
      ) : groups.length === 0 ? (
        <p className="px-4 pt-16 text-center text-muted-foreground">{t('No tickets match your filters')}</p>
      ) : (
        groups.map((group) => (
          <section key={group.label}>
            <h2 className="px-4 pb-1 pt-4 text-sm font-semibold capitalize text-muted-foreground">{group.label}</h2>
            <div className="divide-y">
              {group.rows
                .slice()
                .sort((a, b) => +new Date(b.ticket.created_at) - +new Date(a.ticket.created_at))
                .map((row) => (
                  <TicketRow key={row.ticket.id} row={row} userId={userId} onOpen={openTicket} />
                ))}
            </div>
          </section>
        ))
      )}

      <BottomNav />
    </div>
  )
}
