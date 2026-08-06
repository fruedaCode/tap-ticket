'use client'

import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import type { Ticket } from '@/lib/types'

export function ShareButton({ ticket }: { ticket: Ticket }) {
  const { t } = useI18n()

  const handleShare = async () => {
    const url = `${window.location.origin}/join?ticketId=${ticket.id}&token=${ticket.share_token}`
    if (navigator.share) {
      try {
        await navigator.share({ url, title: 'TapTicket' })
      } catch {
        // user dismissed the share sheet
      }
    } else {
      await navigator.clipboard.writeText(url)
      toast.success(t('Link copied'))
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleShare}>
      <Share2 />
      {t('Share')}
    </Button>
  )
}
