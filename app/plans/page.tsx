'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { BottomNav } from '@/components/bottom-nav'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { PLAN_CATALOGUE, type PaidPlanId, type PlanId } from '@/lib/billing/plans'
import { cn } from '@/lib/utils'

type BillingStatus = {
  plan: PlanId
  subscriptionStatus: string | null
  currentPeriodEnd: string | null
  hasCustomer: boolean
  billingEnabled: boolean
  usage: { count: number; limit: number | 'unlimited'; remaining: number | 'unlimited' }
}

const PLAN_ORDER: PlanId[] = ['free', 'standard', 'pro']

const PLAN_NAME_KEY: Record<PlanId, string> = {
  free: 'Free',
  standard: 'Standard',
  pro: 'Pro',
}

const PLAN_TIER: Record<PlanId, number> = { free: 0, standard: 1, pro: 2 }

const ACTIVE_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing', 'past_due'])

function PlansContent() {
  const { t, lang } = useI18n()
  const searchParams = useSearchParams()
  const [supabase] = useState(createClient)

  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)

  useEffect(() => {
    const checkout = searchParams.get('checkout')
    if (checkout === 'success') toast.success(t('Subscription activated'))
    if (checkout === 'cancelled') toast.error(t('Checkout cancelled'))
  }, [searchParams, t])

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/billing/status')
    if (res.ok) setStatus((await res.json()) as BillingStatus)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        return
      }
      setLoggedIn(true)
      await loadStatus()
      setLoading(false)
    })
  }, [supabase, loadStatus])

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format(cents / 100)

  // Free -> paid: hosted Checkout (collects the payment method).
  const startCheckout = async (plan: PaidPlanId) => {
    setPending(plan)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) throw new Error()
      const { url } = (await res.json()) as { url: string }
      window.location.assign(url)
    } catch {
      toast.error(t('Error'))
      setPending(null)
    }
  }

  // Paid -> other paid: swap the price on the existing subscription, prorated.
  const changePlan = async (plan: PaidPlanId) => {
    setPending(plan)
    try {
      const res = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) throw new Error()
      toast.success(t('Plan updated'))
      await loadStatus()
    } catch {
      toast.error(t('Error'))
    } finally {
      setPending(null)
    }
  }

  // Paid -> free: immediate cancel + prorated refund of the remaining days.
  const cancelSubscription = async () => {
    setPending('cancel')
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success(t('Subscription cancelled'))
      setCancelOpen(false)
      await loadStatus()
    } catch {
      toast.error(t('Error'))
    } finally {
      setPending(null)
    }
  }

  const openPortal = async () => {
    setPending('portal')
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      if (!res.ok) throw new Error()
      const { url } = (await res.json()) as { url: string }
      window.location.assign(url)
    } catch {
      toast.error(t('Error'))
      setPending(null)
    }
  }

  const hasActiveSubscription =
    status !== null &&
    status.plan !== 'free' &&
    ACTIVE_STATUSES.has(status.subscriptionStatus ?? '')

  const renderCta = (planId: PlanId) => {
    if (!loggedIn) {
      return (
        <Button
          className="w-full"
          variant={planId === 'free' ? 'outline' : 'default'}
          nativeButton={false}
          render={<Link href={`/login?next=${encodeURIComponent('/plans')}`} />}
        >
          {t('Get started')}
        </Button>
      )
    }
    if (!status) return null
    if (status.plan === planId) {
      return (
        <Button className="w-full" variant="outline" disabled>
          {t('Current plan')}
        </Button>
      )
    }
    if (planId === 'free') {
      // Going back to free = cancelling the subscription (button on the
      // current-plan summary above).
      return null
    }
    if (!status.billingEnabled) return null
    const isPending = pending === planId
    if (hasActiveSubscription) {
      const isUpgrade = PLAN_TIER[planId] > PLAN_TIER[status.plan]
      return (
        <Button
          className="w-full"
          variant={isUpgrade ? 'default' : 'outline'}
          disabled={pending !== null}
          onClick={() => changePlan(planId)}
        >
          {isPending && <Loader2 className="animate-spin" />}
          {isUpgrade ? t('Upgrade') : t('Downgrade')}
        </Button>
      )
    }
    return (
      <Button className="w-full" disabled={pending !== null} onClick={() => startCheckout(planId)}>
        {isPending && <Loader2 className="animate-spin" />}
        {t('Upgrade')}
      </Button>
    )
  }

  return (
    <div className="mx-auto w-full min-h-dvh max-w-md bg-background pb-24">
      <div className="flex flex-col gap-6 px-4 pt-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">{t('Plans')}</h1>
          <p className="text-sm text-muted-foreground">{t('Choose the plan that fits you')}</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            {status && (
              <>
                <section className="flex flex-col gap-1 rounded-lg border p-4">
                  <p className="text-sm font-medium">
                    {t('Current plan')}: {t(PLAN_NAME_KEY[status.plan])}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {status.usage.limit === 'unlimited'
                      ? t('Unlimited scans')
                      : `${t('Scans this week')}: ${status.usage.count} / ${status.usage.limit}`}
                  </p>
                  {status.currentPeriodEnd && status.subscriptionStatus === 'active' && (
                    <p className="text-sm text-muted-foreground">
                      {t('Renews on')}: {new Date(status.currentPeriodEnd).toLocaleDateString(lang)}
                    </p>
                  )}
                  {status.hasCustomer && status.billingEnabled && (
                    <div className="mt-2 flex flex-col gap-2">
                      <Button variant="outline" disabled={pending !== null} onClick={openPortal}>
                        {pending === 'portal' && <Loader2 className="animate-spin" />}
                        {t('Manage subscription')}
                      </Button>
                      {hasActiveSubscription && (
                        <Button
                          variant="destructive"
                          disabled={pending !== null}
                          onClick={() => setCancelOpen(true)}
                        >
                          {t('Cancel subscription')}
                        </Button>
                      )}
                    </div>
                  )}
                </section>
                <Separator />
              </>
            )}

            <section className="flex flex-col gap-4">
              {PLAN_ORDER.map((planId) => {
                const plan = PLAN_CATALOGUE[planId]
                const isCurrent = status?.plan === planId
                return (
                  <div
                    key={planId}
                    className={cn(
                      'flex flex-col gap-3 rounded-lg border p-4',
                      isCurrent && 'border-primary',
                    )}
                  >
                    <div className="flex items-baseline justify-between">
                      <p className="text-lg font-semibold">
                        {t(PLAN_NAME_KEY[planId])}
                        {isCurrent && (
                          <span className="ml-2 text-xs font-normal text-primary">
                            {t('Current plan')}
                          </span>
                        )}
                      </p>
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
                    {renderCta(planId)}
                  </div>
                )
              })}
            </section>
          </>
        )}
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Cancel subscription?')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t(
              'Your subscription will be cancelled immediately and the unused days of the current period will be refunded proportionally',
            )}
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t('Keep plan')}</DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={pending !== null}
              onClick={cancelSubscription}
            >
              {pending === 'cancel' && <Loader2 className="animate-spin" />}
              {t('Cancel subscription')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loggedIn && <BottomNav />}
    </div>
  )
}

export default function PlansPage() {
  return (
    <Suspense>
      <PlansContent />
    </Suspense>
  )
}
