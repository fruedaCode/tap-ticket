'use client'

import { ParticipantAvatar } from '@/components/claim/participant-avatar'
import type { MemberWithProfile } from '@/lib/types'
import { cn } from '@/lib/utils'

export function AvatarStack({
  members,
  max = 4,
  className,
}: {
  members: MemberWithProfile[]
  max?: number
  className?: string
}) {
  const shown = members.slice(0, max)
  const overflow = members.length - shown.length
  return (
    <div className={cn('flex -space-x-2', className)}>
      {shown.map((member) => (
        <ParticipantAvatar key={member.user_id} member={member} size="sm" className="ring-2 ring-card" />
      ))}
      {overflow > 0 && (
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[13px] font-medium text-muted-foreground ring-2 ring-card">
          +{overflow}
        </span>
      )}
    </div>
  )
}
