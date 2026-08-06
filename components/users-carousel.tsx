'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { MemberWithProfile } from '@/lib/types'
import { cn } from '@/lib/utils'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function UsersCarousel({
  members,
  selected,
  onSelect,
}: {
  members: MemberWithProfile[]
  selected: string
  onSelect: (userId: string) => void
}) {
  return (
    <div className="flex gap-3 overflow-x-auto px-4 py-2">
      {members.map((member) => {
        const name = member.profile.display_name ?? member.profile.email
        return (
          <button
            key={member.user_id}
            type="button"
            onClick={() => onSelect(member.user_id)}
            className="flex w-16 shrink-0 flex-col items-center gap-1"
          >
            <Avatar
              className={cn(
                'size-12 ring-2 ring-transparent transition-all',
                selected === member.user_id && 'ring-primary',
              )}
            >
              {member.profile.photo_url && <AvatarImage src={member.profile.photo_url} alt={name} />}
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
            <span className="w-full truncate text-center text-xs text-muted-foreground">{name}</span>
          </button>
        )
      })}
    </div>
  )
}
