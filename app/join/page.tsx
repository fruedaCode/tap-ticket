'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { joinTicket } from '@/lib/mutations'
import { createClient } from '@/lib/supabase/client'

function JoinTicket() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const [supabase] = useState(createClient)
  const [invalid, setInvalid] = useState(false)

  const ticketId = searchParams.get('ticketId')
  const token = searchParams.get('token')

  useEffect(() => {
    if (!ticketId || !token) {
      setInvalid(true)
      return
    }
    joinTicket(supabase, ticketId, token)
      .then(() => router.replace(`/tickets/${ticketId}`))
      .catch(() => setInvalid(true))
  }, [supabase, ticketId, token, router])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      {invalid ? (
        <p className="px-4 text-center text-muted-foreground">{t('Invalid link')}</p>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          {t('Joining ticket')}
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
