'use client'

import { useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/lib/i18n'
import { addMemberByEmail, removeMember } from '@/lib/mutations'
import { createClient } from '@/lib/supabase/client'
import type { MemberWithProfile } from '@/lib/types'

export function TagDialog({ ticketId, members }: { ticketId: string; members: MemberWithProfile[] }) {
  const { t } = useI18n()
  const [supabase] = useState(createClient)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const handleAdd = async () => {
    const trimmed = email.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      await addMemberByEmail(supabase, ticketId, trimmed)
      setEmail('')
      toast.success(t('Success'))
    } catch (error) {
      if (error instanceof Error && error.message.includes('user_not_found')) {
        toast.error(t('User not found'))
      } else {
        toast.error(t('Error'))
      }
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (userId: string) => {
    if (!window.confirm(t('Are you sure?'))) return
    try {
      await removeMember(supabase, ticketId, userId)
    } catch {
      toast.error(t('Error'))
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <UserPlus />
        {t('Tag')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Tag')}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            type="email"
            placeholder={t('User email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button type="button" disabled={busy || !email.trim()} onClick={handleAdd}>
            {t('Confirm')}
          </Button>
        </div>

        <div className="flex flex-col divide-y">
          {members.map((member) => {
            const name = member.profile.display_name ?? member.profile.email
            return (
              <div key={member.user_id} className="flex items-center gap-3 py-2">
                <Avatar className="size-8">
                  {member.profile.photo_url && <AvatarImage src={member.profile.photo_url} alt={name} />}
                  <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('Remove')}
                  onClick={() => handleRemove(member.user_id)}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
