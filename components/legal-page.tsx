'use client'

// Shared chrome for the four /legal pages. The document itself comes from
// lib/legal, which is per-locale JSX rather than flat t() keys; the element
// styling lives here so those files stay plain semantic markup.

import Link from 'next/link'
import type { ReactNode } from 'react'
import { LegalFooter } from '@/components/legal-footer'
import { useI18n } from '@/lib/i18n'
import { useLegalDoc, type LegalDocId } from '@/lib/legal'
import { LAST_UPDATED } from '@/lib/legal/company'

const PROSE =
  'space-y-4 pt-6 text-sm leading-relaxed text-muted-foreground ' +
  '[&_h2]:pt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground ' +
  '[&_strong]:font-semibold [&_strong]:text-foreground ' +
  '[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 ' +
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs ' +
  '[&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4'

export function LegalPage({ id, children }: { id: LegalDocId; children?: ReactNode }) {
  const { t } = useI18n()
  const doc = useLegalDoc(id)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/">
          <img src="/logo-lockup.svg" alt="TapTicket" className="w-40" />
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16">
        <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
        <p className="pt-1 text-sm text-muted-foreground">
          {t('Last updated')}: {LAST_UPDATED}
        </p>
        <article className={PROSE}>{doc.body}</article>
        {children}
      </main>

      <footer className="border-t py-6">
        <LegalFooter />
      </footer>
    </div>
  )
}
