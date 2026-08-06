'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function LoginForm() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/tickets'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/tickets'
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (error) toast.error(t('Login failed'))
  }, [error, t])

  const signInWithGoogle = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      },
    })
    if (error) toast.error(error.message)
  }

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setLinkSent(true)
    }
  }

  const useDifferentEmail = () => {
    setLinkSent(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-white p-8 shadow-sm dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">TapTicket</h1>
          <p className="mt-1 text-sm text-muted-foreground">EASY SHARING</p>
        </div>

        <Button variant="outline" className="w-full" onClick={signInWithGoogle}>
          {t('Continue with Google')}
        </Button>

        <div className="space-y-3">
          <p className="text-center text-sm font-medium">{t('Sign in with email')}</p>
          {!linkSent ? (
            <form onSubmit={sendLink} className="space-y-3">
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" className="w-full" disabled={loading || !email}>
                {t('Send link')}
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm font-medium">{t('Check your email')}</p>
              <p className="text-center text-sm text-muted-foreground">
                {t('Click the link in the email we sent you')}
              </p>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={useDifferentEmail}
              >
                {t('Use a different email')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
