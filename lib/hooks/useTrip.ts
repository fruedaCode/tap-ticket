'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchTripDetail } from '@/lib/queries'
import type { TripOverview } from '@/lib/types'

export function useTrip(tripId: string) {
  const [supabase] = useState(createClient)
  const [overview, setOverview] = useState<TripOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const reload = useCallback(async () => {
    try {
      setOverview(await fetchTripDetail(supabase, tripId))
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [supabase, tripId])

  useEffect(() => {
    reload()
    // ticket_items / item_assignments have no trip_id column to filter on; like
    // useTicket's item_assignments subscription, RLS scopes what we receive
    const channel = supabase
      .channel(`trip:${tripId}`, { config: { private: true } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${tripId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `trip_id=eq.${tripId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_items' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_assignments' }, reload)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [reload, supabase, tripId])

  return { overview, loading, error, reload }
}
