'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { PLAN_CATALOGUE, type PlanId } from '@/lib/billing/plans'

const STEPS = [
  {
    img: '/steps/snap.svg',
    title: 'Snap the receipt',
    body: 'Take a photo of the ticket — AI reads every line item and its price.',
  },
  {
    img: '/steps/share.svg',
    title: 'Share the link',
    body: 'Friends join from their phones in seconds — no app install needed.',
  },
  {
    img: '/steps/claim.svg',
    title: 'Claim your items',
    body: 'Everyone taps what they had, in realtime. Partial splits are handled for you.',
  },
  {
    img: '/steps/settle.svg',
    title: 'Settle up',
    body: 'See exactly who owes what and track payments until everyone is squared.',
  },
] as const

const PLAN_ORDER: PlanId[] = ['free', 'standard', 'pro']

const PLAN_NAME_KEY: Record<PlanId, string> = {
  free: 'Free',
  standard: 'Standard',
  pro: 'Pro',
}

export default function LandingPage() {
  const { t, lang } = useI18n()

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format(cents / 100)

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
          <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
            {t('Scan a ticket, split the bill')}
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            {t(
              'Snap a photo, share a link, and friends claim what they had — the math is done for you.',
            )}
          </p>
          <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
            {t('Get started')}
          </Button>
          <img
            src="/hero.svg"
            alt={t('A receipt scanned into a phone where friends split the bill')}
            className="mt-4 w-full max-w-xl rounded-xl"
          />
        </section>

        <section className="pb-16 sm:pb-24">
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">
            {t('How it works')}
          </h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-xl border bg-card p-4">
                <img src={step.img} alt={t(step.title)} className="mb-3 w-full rounded-lg" />
                <div className="flex items-center gap-2">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold">{t(step.title)}</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{t(step.body)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="pb-16 sm:pb-24">
          <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight">{t('Plans')}</h2>
          <p className="mb-8 text-center text-muted-foreground">
            {t('Choose the plan that fits you')}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {PLAN_ORDER.map((planId) => {
              const plan = PLAN_CATALOGUE[planId]
              return (
                <div key={planId} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-lg font-semibold">{t(PLAN_NAME_KEY[planId])}</h3>
                    <p className="text-lg font-semibold">
                      {formatPrice(plan.priceCents)}
                      <span className="text-sm font-normal text-muted-foreground">
                        {' '}
                        / {t('month')}
                      </span>
                    </p>
                  </div>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="size-4 shrink-0" />
                    {plan.weeklyLimit === 'unlimited'
                      ? t('Unlimited scans')
                      : `${plan.weeklyLimit} ${t('scans per week')}`}
                  </p>
                  <Button
                    className="mt-auto w-full"
                    variant={planId === 'free' ? 'outline' : 'default'}
                    nativeButton={false}
                    render={<Link href="/plans" />}
                  >
                    {t('Get started')}
                  </Button>
                </div>
              )
            })}
          </div>
        </section>

        <section className="flex flex-col items-center gap-4 pb-16 text-center sm:pb-24">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t('Ready to split the next bill?')}
          </h2>
          <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
            {t('Get started')}
          </Button>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        TapTicket — {t('easy sharing')}
      </footer>
    </div>
  )
}
