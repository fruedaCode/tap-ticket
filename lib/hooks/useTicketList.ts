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

  const reload = useCallback(async () => {
    try {
      setRows(await fetchTicketList(supabase))
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    reload()
    // user-scoped topic: realtime authorization keys the RLS policy to auth.uid()
    let channel: RealtimeChannel | undefined
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      channel = supabase
        .channel(`ticket_list:${user.id}`, { config: { private: true } })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_members' }, reload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, reload)
        .subscribe()
    })
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [reload, supabase])

  return { rows, loading, reload }
}
