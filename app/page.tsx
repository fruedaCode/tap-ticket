'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

const STEPS = [
  {
    title: 'Snap the receipt',
    body: 'Take a photo of the ticket — AI reads every line item and its price.',
  },
  {
    title: 'Share the link',
    body: 'Friends join from their phones in seconds — no app install needed.',
  },
  {
    title: 'Claim your items',
    body: 'Everyone taps what they had, in realtime. Partial splits are handled for you.',
  },
  {
    title: 'Settle up',
    body: 'See exactly who owes what and track payments until everyone is squared.',
  },
] as const

export default function LandingPage() {
  const { t } = useI18n()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
        <img src="/logo-lockup.svg" alt="TapTicket" className="w-40" />
        <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
          {t('Sign in')}
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4">
        <section className="flex flex-col items-center gap-6 py-16 text-center sm:py-24">
          <img src="/logo.svg" alt="" className="size-20" aria-hidden="true" />
          <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
            {t('Scan a ticket, split the bill')}
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            {t(
              'Take a photo of the receipt and AI digitizes every item. Share a link and your friends claim what they had — everyone sees exactly what they owe.',
            )}
          </p>
          <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
            {t('Get started')}
          </Button>
        </section>

        <section className="pb-16 sm:pb-24">
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">
            {t('How it works')}
          </h2>
          <ol className="grid gap-4 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-xl border bg-card p-5">
                <div className="mb-3 flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="font-semibold">{t(step.title)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(step.body)}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        TapTicket — {t('easy sharing')}
      </footer>
    </div>
  )
}
