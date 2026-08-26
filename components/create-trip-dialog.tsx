'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/lib/i18n'
import { createTrip } from '@/lib/mutations'
import { createClient } from '@/lib/supabase/client'
import type { MemberProfile } from '@/lib/types'
import { cn } from '@/lib/utils'

export function CreateTripDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n()
  const router = useRouter()
  const [supabase] = useState(createClient)
  const [name, setName] = useState('')
  const [candidates, setCandidates] = useState<MemberProfile[]>([])
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [busy, setBusy] = useState(false)

  // member candidates: everyone the user already shares tickets with
  // (the public_member_profiles view scopes itself that way), minus self
  useEffect(() => {
    if (!open) return
    let cancelled = false
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      const { data } = await supabase.from('public_member_profiles').select('*')
      if (cancelled) return
      setCandidates(((data ?? []) as MemberProfile[]).filter((p) => p.id !== user?.id))
    })
    return () => {
      cancelled = true
    }
  }, [open, supabase])

  const toggle = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      const tripId = await createTrip(supabase, trimmed, [...selected])
      setName('')
      setSelected(new Set())
      onOpenChange(false)
      router.push(`/trips/${tripId}`)
    } catch {
      toast.error(t('Could not create the trip. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('New trip')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trip-name">{t('Trip name')}</Label>
          <Input
            id="trip-name"
            name="trip-name"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
        </div>

        {candidates.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">{t('Members')}</p>
            <div className="flex max-h-48 flex-col divide-y overflow-y-auto rounded-lg border">
              {candidates.map((profile) => {
                const displayName = profile.display_name ?? '?'
                const isSelected = selected.has(profile.id)
                return (
                  <button
                    key={profile.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(profile.id)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      isSelected && 'bg-muted/50',
                    )}
                  >
                    <Avatar className="size-8">
                      {profile.photo_url && <AvatarImage src={profile.photo_url} alt={displayName} />}
                      <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm">{displayName}</span>
                    {isSelected && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" disabled={busy || !name.trim()} onClick={handleCreate}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {t('Create trip')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
