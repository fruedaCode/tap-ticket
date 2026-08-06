'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function LoginForm() {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/tickets'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/tickets'
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
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

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setCodeSent(true)
    }
  }

  const validateCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      router.push(safeNext)
      router.refresh()
    }
  }

  const useDifferentEmail = () => {
    setCodeSent(false)
    setCode('')
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
          {!codeSent ? (
            <form onSubmit={sendCode} className="space-y-3">
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" className="w-full" disabled={loading || !email}>
                {t('Send code')}
              </Button>
            </form>
          ) : (
            <form onSubmit={validateCode} className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">{t('Check your email')}</p>
              <Input
                inputMode="numeric"
                placeholder={t('Code')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button type="submit" className="w-full" disabled={loading || !code}>
                {t('Validate')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={useDifferentEmail}
              >
                {t('Use a different email')}
              </Button>
            </form>
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
