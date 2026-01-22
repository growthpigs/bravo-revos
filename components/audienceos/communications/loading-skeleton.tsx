'use client'

import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  className?: string
}

export function MessageSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={cn('flex gap-3 p-3 animate-pulse', className)}>
      {/* Platform icon skeleton */}
      <div className="h-5 w-5 rounded bg-muted" />

      {/* Content skeleton */}
      <div className="flex-1 space-y-2">
        {/* Header line */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>

        {/* Subject line */}
        <div className="h-3 w-48 rounded bg-muted" />

        {/* Content lines */}
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-3/4 rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}

export function TimelineSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-b border-border last:border-b-0">
          <MessageSkeleton />
        </div>
      ))}
    </div>
  )
}

export function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 border-b animate-pulse">
      {/* Source filter skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-8 w-48 rounded-lg bg-muted" />
        <div className="h-8 w-8 rounded bg-muted" />
      </div>

      {/* Search and needs reply skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-9 flex-1 rounded-md bg-muted" />
        <div className="h-8 w-28 rounded-md bg-muted" />
      </div>
    </div>
  )
}

export function CommunicationsHubSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <FiltersSkeleton />
      <div className="flex-1 p-2">
        <TimelineSkeleton count={8} />
      </div>
    </div>
  )
}
