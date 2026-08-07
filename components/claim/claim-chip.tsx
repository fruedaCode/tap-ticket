'use client'

import { Check, CheckCheck, Clock, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

// Status chips always pair color with icon + text (§3.3, non-color-only cues)
const VARIANTS = {
  you: { className: 'bg-primary text-primary-foreground border-primary', Icon: User },
  other: { className: 'bg-secondary text-secondary-foreground border-border', Icon: User },
  shared: { className: 'bg-warning-subtle text-accent border-accent/40', Icon: Users },
  covered: { className: 'bg-success-subtle text-success border-success/40', Icon: Check },
  settled: { className: 'bg-success text-white border-success', Icon: CheckCheck },
  left: { className: 'bg-warning-subtle text-accent border-accent/40', Icon: Clock },
} as const

export type ClaimChipVariant = keyof typeof VARIANTS

export function ClaimChip({
  variant,
  label,
  className,
}: {
  variant: ClaimChipVariant
  label: string
  className?: string
}) {
  const { className: variantClass, Icon } = VARIANTS[variant]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] font-medium',
        variantClass,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  )
}
