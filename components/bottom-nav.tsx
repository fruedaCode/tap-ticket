'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Camera, ReceiptText, User } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname()
  const { t } = useI18n()

  const tabs = [
    { href: '/tickets', label: t('My tickets'), icon: ReceiptText },
    { href: '/scan', label: t('Import'), icon: Camera },
    { href: '/account', label: t('My account'), icon: User },
  ]

  return (
    <nav
      className={cn('fixed inset-x-0 bottom-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom)]', className)}
    >
      <div className="mx-auto flex max-w-md">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
