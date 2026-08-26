'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { joinTicket, joinTrip } from '@/lib/mutations'
import { createClient } from '@/lib/supabase/client'

function JoinTicket() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const [supabase] = useState(createClient)
  const [invalid, setInvalid] = useState(false)

  const ticketId = searchParams.get('ticketId')
  const tripId = searchParams.get('tripId')
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token || (!ticketId && !tripId)) {
      setInvalid(true)
      return
    }
    const run = async () => {
      // getSession() awaits client init, which processes the #access_token
      // fragment that invite links carry — without this the rpc races it
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        // anonymous share-link visitor — sign in first, then come back
        const here = `${window.location.pathname}${window.location.search}`
        router.replace(`/login?next=${encodeURIComponent(here)}`)
        return
      }
      try {
        if (ticketId) await joinTicket(supabase, ticketId, token)
        else await joinTrip(supabase, tripId!, token)
        router.replace(ticketId ? `/tickets/${ticketId}` : `/trips/${tripId}`)
      } catch {
        setInvalid(true)
      }
    }
    run()
  }, [supabase, ticketId, tripId, token, router])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background" role="status" aria-live="polite">
      {invalid ? (
        <p className="px-4 text-center text-muted-foreground">{t('Invalid link. Ask for a new one.')}</p>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          {ticketId ? t('Joining ticket') : t('Joining trip')}
        </div>
      )}
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinTicket />
    </Suspense>
  )
}
