'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

const EASE = [0.16, 1, 0.3, 1] as const

export function LandingHero() {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)

  // Gentle parallax on the visual while the hero scrolls away (depth cue).
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40])
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.97])

  // The initial state must not depend on `reduce`: the server has no media
  // query, so branching here makes the SSR markup disagree with the hydrated
  // client for reduced-motion visitors. Only the transition is gated, which
  // collapses the reveal to a single frame instead of removing it.
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: reduce ? { duration: 0 } : { duration: 0.7, delay, ease: EASE },
  })

  // The headline is translated as one string; the accent falls on the part
  // after the comma, which holds in en/es/ca ("…, split the bill").
  const headline = t('Scan a ticket, split the bill')
  const comma = headline.indexOf(', ')
  const lead = comma === -1 ? headline : headline.slice(0, comma + 1)
  const accent = comma === -1 ? '' : headline.slice(comma + 2)

  return (
    <section
      ref={ref}
      className="grid grid-cols-1 items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6 lg:pt-20"
    >
      <div className="flex flex-col items-start gap-6">
        <motion.h1
          {...rise(0)}
          className="text-balance text-4xl font-semibold leading-[1.05] tracking-tighter sm:text-5xl"
        >
          {lead}
          {accent && (
            <>
              {' '}
              <span className="text-primary">{accent}</span>
            </>
          )}
        </motion.h1>
        <motion.p {...rise(0.1)} className="max-w-md text-lg text-muted-foreground">
          {t('Snap a photo, share a link, and friends claim what they had. The math is done for you.')}
        </motion.p>
        <motion.div {...rise(0.2)} className="flex items-center gap-3">
          <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
            {t('Get started')}
          </Button>
          <Button size="lg" variant="ghost" nativeButton={false} render={<Link href="#how-it-works" />}>
            {t('See how it works')}
          </Button>
        </motion.div>
      </div>

      <motion.div style={{ y: imgY, scale: imgScale }}>
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={reduce ? { duration: 0 } : { duration: 0.9, delay: 0.25, ease: EASE }}
        >
          <Image
            src="/hero.svg"
            alt={t('A receipt scanned into a phone where friends split the bill')}
            width={400}
            height={300}
            priority
            className="w-full rounded-3xl"
          />
        </motion.div>
      </motion.div>
    </section>
  )
}
