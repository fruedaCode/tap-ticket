'use client'

import { Skeleton } from '@/components/ui/skeleton'

// First-load placeholder matching the claim-screen layout exactly (§3.7);
// never rendered on refetch
export function ReceiptListSkeleton() {
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-background pb-24">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="space-y-2 px-4 pt-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex -space-x-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="size-6 rounded-full ring-2 ring-background" />
          ))}
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex gap-3 px-4 pb-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1">
            <Skeleton className="size-12 rounded-full" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
      <div className="space-y-3 px-4 pt-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex min-h-16 items-center gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  )
}
