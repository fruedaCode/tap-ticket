'use client'

import { Suspense, useState } from 'react'
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

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const signInWithGoogle = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) toast.error(error.message)
  }

  const sendCode = async () => {
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

  const validateCode = async () => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      router.push(next)
      router.refresh()
    }
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
            <>
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button className="w-full" onClick={sendCode} disabled={loading || !email}>
                {t('Send code')}
              </Button>
            </>
          ) : (
            <>
              <p className="text-center text-sm text-muted-foreground">{t('Check your email')}</p>
              <Input
                inputMode="numeric"
                placeholder={t('Code')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button className="w-full" onClick={validateCode} disabled={loading || !code}>
                {t('Validate')}
              </Button>
            </>
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
