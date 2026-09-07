'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { animate, useMotionValue, useReducedMotion } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { HeroStory } from '@/components/hero-story'

// Long enough to read as three distinct moments, short enough that nobody is
// waiting on it before reaching for the CTA. The CTAs are on screen well before
// it finishes, so this never gates the page.
const STORY_DURATION = 3.4

// The entrance is CSS, not Motion: a server-rendered `opacity: 0` would leave
// the hero blank until hydration, which is the worst thing to do to the element
// the page is judged on. These run at first paint and need no JavaScript.
const ENTER = 'animate-in fade-in-0 slide-in-from-bottom-6 duration-700 fill-mode-both motion-reduce:animate-none'

export function LandingHero() {
  const { t } = useI18n()
  const reduce = useReducedMotion()

  // Drives the illustration, 0 to 1. It starts at 0, which is what the server
  // renders, so the first paint never depends on a media query. Its identity
  // never changes: swapping the value a useTransform reads from leaves some
  // hooks subscribed to the old one and desynchronises the artwork.
  const progress = useMotionValue(0)

  useEffect(() => {
    // Reduced motion lands on the settled frame instead of losing the payoff,
    // and it goes through animate() rather than progress.set(): a bare set on a
    // value nobody is animating updates the value but never schedules Motion's
    // render, so the artwork would stay on the first frame. Running after mount
    // keeps the first paint identical either way.
    const controls = animate(progress, 1, {
      // Explicit so `duration` is always literal wall-clock time rather than a
      // spring's perceptual hint.
      type: 'tween',
      duration: reduce ? 0 : STORY_DURATION,
      // Linear on purpose. An eased master curve races through the middle of the
      // timeline, which is where claiming and settling live, so those moments
      // flash past however long the total is. The rhythm comes from the
      // staggered ranges inside HeroStory instead.
      ease: 'linear',
    })
    return () => controls.stop()
  }, [progress, reduce])

  // The headline is translated as one string; the accent falls on the part
  // after the comma, which holds in en/es/ca ("…, split the bill").
  const headline = t('Scan a ticket, split the bill')
  const comma = headline.indexOf(', ')
  const lead = comma === -1 ? headline : headline.slice(0, comma + 1)
  const accent = comma === -1 ? '' : headline.slice(comma + 2)

  return (
    <section className="flex min-h-[100dvh] items-center">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 px-8 pt-24 pb-12 lg:grid-cols-[0.95fr_1.15fr] lg:gap-10">
        <div className="flex flex-col items-start gap-6">
          <h1
            className={`text-balance text-4xl font-semibold leading-[1.05] tracking-tighter sm:text-5xl lg:text-6xl ${ENTER}`}
          >
            {lead}
            {accent && (
              <>
                {' '}
                <span className="text-primary">{accent}</span>
              </>
            )}
          </h1>

          <p
            className={`max-w-md text-lg text-muted-foreground ${ENTER} [animation-delay:100ms]`}
          >
            {t('Snap a photo and AI reads every line. Share a link, friends claim what they had, and the math is done for you.')}
          </p>

          <div className={`flex items-center gap-3 ${ENTER} [animation-delay:200ms]`}>
            <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
              {t('Get started')}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              nativeButton={false}
              render={<Link href="#how-it-works" />}
            >
              {t('See how it works')}
            </Button>
          </div>
        </div>

        {/* Capped on phones so the headline, subtext and both CTAs still fit
            above it without scrolling. */}
        <div
          className={`w-full [&>svg]:max-h-[42dvh] lg:[&>svg]:max-h-none animate-in fade-in-0 zoom-in-95 duration-1000 fill-mode-both motion-reduce:animate-none [animation-delay:150ms]`}
        >
          <HeroStory progress={progress} />
        </div>
      </div>
    </section>
  )
}
