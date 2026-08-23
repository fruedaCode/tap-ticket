'use client'

import { useI18n } from '@/lib/i18n'

export function SkipLink() {
  const { t } = useI18n()
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-2"
    >
      {t('Skip to content')}
    </a>
  )
}
