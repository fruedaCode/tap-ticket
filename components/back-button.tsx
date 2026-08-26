'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

export function BackButton({ href }: { href: string }) {
  const { t } = useI18n()
  return (
    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={href} />} className="-ml-2 text-muted-foreground">
      <ArrowLeft aria-hidden />
      {t('Back')}
    </Button>
  )
}
