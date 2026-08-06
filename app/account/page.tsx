'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { BottomNav } from '@/components/bottom-nav'
import { LanguagePicker } from '@/components/language-picker'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'

export default function AccountPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [supabase] = useState(createClient)

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        router.replace('/login')
        return
      }
      setEmail(user.email ?? '')
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, photo_url')
        .eq('id', user.id)
        .single()
      setAvatarUrl(profile?.photo_url ?? (user.user_metadata.avatar_url as string | undefined) ?? null)
      setDisplayName(
        profile?.display_name ??
          (user.user_metadata.full_name as string | undefined) ??
          (user.user_metadata.name as string | undefined) ??
          '',
      )
      setLoading(false)
    })
  }, [supabase, router])

  const handleSaveName = async () => {
    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', user.id)
      if (error) toast.error(t('Error'))
      else toast.success(t('Success'))
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      await supabase.auth.signOut()
      router.replace('/login')
    } catch {
      toast.error(t('Error'))
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full min-h-dvh max-w-md bg-background pb-24">
        <div className="space-y-4 px-4 pt-6">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="size-16 rounded-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <BottomNav />
      </div>
    )
  }

  const initial = (displayName || email || '?').charAt(0).toUpperCase()

  return (
    <div className="mx-auto w-full min-h-dvh max-w-md bg-background pb-24">
      <div className="flex flex-col gap-6 px-4 pt-6">
        <h1 className="text-2xl font-bold">{t('My account')}</h1>

        <section className="flex flex-col items-center gap-2">
          <Avatar className="size-16">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName || email} />}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <p className="font-medium">{displayName || email}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </section>

        <Separator />

        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="display-name">{t('Name')}</Label>
            <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <Button type="button" disabled={saving} onClick={handleSaveName}>
            {t('Save')}
          </Button>
        </section>

        <Separator />

        <section className="flex flex-col gap-1.5">
          <Label>{t('Language')}</Label>
          <LanguagePicker />
        </section>

        <Separator />

        <section className="flex flex-col gap-3">
          <Button type="button" variant="outline" onClick={handleSignOut}>
            <LogOut />
            {t('Sign-Out')}
          </Button>
          <Button type="button" variant="destructive" disabled={deleting} onClick={() => setConfirmOpen(true)}>
            <Trash2 />
            {t('Delete account')}
          </Button>
        </section>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Are you sure?')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t(
              'Please note that this action cannot be undone. Deleting your account will remove all associated data permanently',
            )}
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t('Cancel')}</DialogClose>
            <Button type="button" variant="destructive" disabled={deleting} onClick={handleDeleteAccount}>
              {t('Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  )
}
