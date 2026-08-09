'use client'

import { Crown } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { MemberWithProfile } from '@/lib/types'
import { cn } from '@/lib/utils'

// 8-hue participant palette (§2.1); assigned by member-id hash so a
// participant keeps the same color across screens and sessions
const PALETTE = ['#DC2626', '#D97706', '#A16207', '#15803D', '#0F766E', '#1D4ED8', '#7C3AED', '#BE185D']

export function avatarHue(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function memberName(member: MemberWithProfile): string {
  return member.profile.display_name ?? '?'
}

const SIZES = {
  sm: 'size-6 text-[13px]',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
} as const

export function ParticipantAvatar({
  member,
  size = 'md',
  selected = false,
  className,
}: {
  member: MemberWithProfile
  size?: keyof typeof SIZES
  selected?: boolean
  className?: string
}) {
  const name = memberName(member)
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <Avatar
        className={cn(
          SIZES[size],
          'after:border-transparent',
          selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        )}
      >
        {member.profile.photo_url && <AvatarImage src={member.profile.photo_url} alt={name} />}
        <AvatarFallback
          className="font-semibold text-white"
          style={{ backgroundColor: avatarHue(member.user_id) }}
        >
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      {member.role === 'owner' && size !== 'sm' && (
        <Crown
          aria-label="owner"
          className="absolute -top-1 -right-1 size-4 rounded-full bg-card p-0.5 text-accent ring-1 ring-border"
        />
      )}
    </span>
  )
}
