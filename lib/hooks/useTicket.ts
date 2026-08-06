'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchTicketDetail } from '@/lib/queries'
import type { TicketDetail } from '@/lib/types'

export function useTicket(ticketId: string) {
  const [supabase] = useState(createClient)
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const reload = useCallback(async () => {
    try {
      setTicket(await fetchTicketDetail(supabase, ticketId))
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [supabase, ticketId])

  useEffect(() => {
    reload()
    const channel = supabase
      .channel(`ticket:${ticketId}`, { config: { private: true } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_items', filter: `ticket_id=eq.${ticketId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_assignments' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_members', filter: `ticket_id=eq.${ticketId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `id=eq.${ticketId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements', filter: `ticket_id=eq.${ticketId}` }, reload)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [reload, supabase, ticketId])

  return { ticket, loading, error, reload }
}
