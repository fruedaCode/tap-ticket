'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { LandingHero } from '@/components/landing-hero'
import { LegalFooter } from '@/components/legal-footer'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PLAN_CATALOGUE, type PlanId } from '@/lib/billing/plans'

const EASE = [0.16, 1, 0.3, 1] as const

const STEPS = [
  {
    img: '/steps/snap.svg',
    title: 'Snap the receipt',
    body: 'Take a photo of the ticket. AI reads every line item and its price.',
  },
  {
    img: '/steps/share.svg',
    title: 'Share the link',
    body: 'Friends join from their phones in seconds, no app install needed.',
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

// Bento rhythm: wide/narrow then narrow/wide, never four equal tiles.
const STEP_SPANS = ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-5', 'lg:col-span-7']

const PLAN_ORDER: PlanId[] = ['free', 'standard', 'pro']

const PLAN_NAME_KEY: Record<PlanId, string> = {
  free: 'Free',
  standard: 'Standard',
  pro: 'Pro',
}

export default function LandingPage() {
  const { t, lang } = useI18n()
  const reduce = useReducedMotion()

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format(cents / 100)

  // initial:false + unconditional whileInView keeps content visible even when
  // useReducedMotion resolves after the first client render.
  const reveal = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: reduce ? { duration: 0 } : { duration: 0.6, delay: i * 0.07, ease: EASE },
  })

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
        <img src="/logo-lockup.svg" alt="TapTicket" width={424} height={132} className="w-40" />
        <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
          {t('Sign in')}
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4">
        <LandingHero />

        <section id="how-it-works" className="scroll-mt-8 pb-16 sm:pb-24">
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">
            {t('How it works')}
          </h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.title}
                {...reveal(i)}
                className={cn('rounded-xl border bg-card p-4', STEP_SPANS[i])}
              >
                <img
                  src={step.img}
                  alt={t(step.title)}
                  width={400}
                  height={300}
                  loading="lazy"
                  className="mb-3 w-full rounded-lg"
                />
                <div className="flex items-center gap-2">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold">{t(step.title)}</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{t(step.body)}</p>
              </motion.li>
            ))}
          </ol>
        </section>

        <section className="pb-16 sm:pb-24">
          <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight">{t('Plans')}</h2>
          <p className="mb-8 text-center text-muted-foreground">
            {t('Choose the plan that fits you')}
          </p>
          <div className="grid items-stretch gap-4 sm:grid-cols-3">
            {PLAN_ORDER.map((planId, i) => {
              const plan = PLAN_CATALOGUE[planId]
              const featured = planId === 'standard'
              return (
                <motion.div
                  key={planId}
                  {...reveal(i)}
                  className={cn(
                    'flex flex-col gap-3 rounded-xl border p-5',
                    featured
                      ? 'border-primary bg-primary text-primary-foreground shadow-xl shadow-primary/20 lg:-my-3 lg:py-8'
                      : 'bg-card',
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-lg font-semibold">{t(PLAN_NAME_KEY[planId])}</h3>
                    <p className="text-lg font-semibold">
                      {formatPrice(plan.priceCents)}
                      <span
                        className={cn(
                          'text-sm font-normal',
                          featured ? 'text-primary-foreground/80' : 'text-muted-foreground',
                        )}
                      >
                        {' '}
                        / {t('month')}
                      </span>
                    </p>
                  </div>
                  <p
                    className={cn(
                      'flex items-center gap-2 text-sm',
                      featured ? 'text-primary-foreground/80' : 'text-muted-foreground',
                    )}
                  >
                    <Check className="size-4 shrink-0" aria-hidden="true" />
                    {plan.weeklyLimit === 'unlimited'
                      ? t('Unlimited scans')
                      : `${plan.weeklyLimit} ${t('scans per week')}`}
                  </p>
                  <Button
                    className={cn(
                      'mt-auto w-full',
                      featured && 'bg-background text-foreground hover:bg-background/90',
                    )}
                    variant={featured ? 'default' : planId === 'free' ? 'outline' : 'default'}
                    nativeButton={false}
                    render={<Link href="/plans" />}
                  >
                    {t('Get started')}
                  </Button>
                </motion.div>
              )
            })}
          </div>
        </section>

        <motion.section
          {...reveal(0)}
          className="flex flex-col items-center gap-5 pb-20 text-center sm:pb-28"
        >
          <h2 className="max-w-lg text-balance text-3xl font-semibold tracking-tighter sm:text-4xl">
            {t('Ready to split the next bill?')}
          </h2>
          <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
            {t('Get started')}
          </Button>
        </motion.section>
      </main>

      <footer className="flex flex-col items-center gap-3 border-t py-6 text-center text-sm text-muted-foreground">
        <p>
          <span translate="no">TapTicket</span> · {t('easy sharing')}
        </p>
        <LegalFooter />
      </footer>
    </div>
  )
}
