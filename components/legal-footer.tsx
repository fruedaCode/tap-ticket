'use client'

// Footer links to the four legal pages. Shown on the public surfaces (landing,
// login, legal pages themselves) so the notices required by GDPR art. 13 and
// LSSI-CE art. 10 are reachable before anyone signs up.

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/legal/privacy', key: 'Privacy policy' },
  { href: '/legal/terms', key: 'Terms of service' },
  { href: '/legal/cookies', key: 'Cookie policy' },
  { href: '/legal/aviso-legal', key: 'Legal notice' },
] as const

export function LegalFooter({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <nav
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground',
        className,
      )}
    >
      {LINKS.map(({ href, key }) => (
        <Link key={href} href={href} className="underline-offset-4 hover:text-foreground hover:underline">
          {t(key)}
        </Link>
      ))}
    </nav>
  )
}
