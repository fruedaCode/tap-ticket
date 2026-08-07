'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

function LoginForm() {
  const { t, lang } = useI18n()
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
        // Stored in user_metadata at signup so auth emails can be localized
        // via {{ .Data.locale }} in the Supabase email templates.
        data: { locale: lang },
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
          <img src="/logo-lockup.svg" alt="TapTicket" className="mx-auto w-64" />
          <p className="mt-1 text-sm text-muted-foreground">EASY SHARING</p>
        </div>

        <Button
          variant="outline"
          className="w-full border-[#dadce0] bg-white font-medium text-[#3c4043] hover:bg-[#f8f9fa] hover:text-[#3c4043]"
          onClick={signInWithGoogle}
        >
          <GoogleIcon className="size-5" />
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
