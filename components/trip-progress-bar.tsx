'use client'

import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// hand-rolled progress bar (same pattern as components/claim/group-status-bar.tsx);
// pct is a 0..1 fraction
export function TripProgressBar({ pct, className }: { pct: number; className?: string }) {
  const { t } = useI18n()
  const value = Math.round(Math.min(1, Math.max(0, pct)) * 100)
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t('Assigned')}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none',
          value >= 100 ? 'bg-success' : 'bg-primary',
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}
