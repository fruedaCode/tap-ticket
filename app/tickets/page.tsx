'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { numberToCurrency } from '@/lib/currency'
import { useTicketList } from '@/lib/hooks/useTicketList'
import { useI18n } from '@/lib/i18n'
import { markSeen } from '@/lib/mutations'
import type { TicketListRow } from '@/lib/queries'
import { getFinalPrice, getPercentagePaid } from '@/lib/split'
import { createClient } from '@/lib/supabase/client'

type Row = TicketListRow

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [supabase])

  const groups = useMemo(() => {
    const byMonth = new Map<number, { label: string; rows: Row[] }>()
    for (const row of rows) {
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
  }, [rows, lang])

  const openTicket = (ticketId: string) => {
    if (userId) void markSeen(supabase, ticketId, userId)
    router.push(`/tickets/${ticketId}`)
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-background pb-24">
      <h1 className="px-4 pb-2 pt-6 text-2xl font-bold">{t('My tickets')}</h1>

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
      ) : groups.length === 0 ? (
        <p className="px-4 pt-16 text-center text-muted-foreground">{t('No tickets yet')}</p>
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
