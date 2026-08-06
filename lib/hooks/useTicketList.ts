'use client'
import { useCallback, useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { fetchTicketList } from '@/lib/queries'

type TicketListRow = Awaited<ReturnType<typeof fetchTicketList>>

export function useTicketList() {
  const [supabase] = useState(createClient)
  const [rows, setRows] = useState<TicketListRow>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const reload = useCallback(async () => {
    try {
      setRows(await fetchTicketList(supabase))
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    reload()
    // user-scoped topic: realtime authorization keys the RLS policy to auth.uid()
    let channel: RealtimeChannel | undefined
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      // cancelled: the effect was cleaned up (StrictMode remount, navigation)
      // while getUser was pending — subscribing now would leak a channel and
      // the next mount's channel() with the same topic would throw
      if (!user || cancelled) return
      channel = supabase
        .channel(`ticket_list:${user.id}`, { config: { private: true } })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_members' }, reload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, reload)
        .subscribe()
    })
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [reload, supabase])

  return { rows, loading, error, reload }
}
