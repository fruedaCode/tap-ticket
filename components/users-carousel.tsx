'use client'

import { ParticipantAvatar, memberName } from '@/components/claim/participant-avatar'
import { useI18n } from '@/lib/i18n'
import type { MemberWithProfile } from '@/lib/types'
import { cn } from '@/lib/utils'

export function UsersCarousel({
  members,
  selected,
  onSelect,
  currentUserId,
}: {
  members: MemberWithProfile[]
  selected: string
  onSelect: (userId: string) => void
  currentUserId?: string
}) {
  const { t } = useI18n()

  // "You" first, everyone else keeps their original order
  const ordered = [...members].sort((a, b) => Number(b.user_id === currentUserId) - Number(a.user_id === currentUserId))

  return (
    <div className="flex gap-3 overflow-x-auto px-4 py-2" role="group" aria-label={t('Participants')}>
      {ordered.map((member) => {
        const name = memberName(member)
        const isYou = member.user_id === currentUserId
        return (
          <button
            key={member.user_id}
            type="button"
            onClick={() => onSelect(member.user_id)}
            aria-label={isYou ? `${name} (${t('You')})` : name}
            aria-pressed={selected === member.user_id}
            className={cn(
              'flex min-h-11 w-16 shrink-0 flex-col items-center gap-1 rounded-lg py-1',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            <ParticipantAvatar member={member} size="lg" selected={selected === member.user_id} />
            <span className="w-full truncate text-center text-[13px] text-muted-foreground">
              {isYou ? t('You') : name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
