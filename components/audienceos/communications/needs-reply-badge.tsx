'use client'

import { cn } from '@/lib/utils'

interface NeedsReplyBadgeProps {
  count: number
  active: boolean
  onClick: () => void
}

export function NeedsReplyBadge({ count, active, onClick }: NeedsReplyBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
        active
          ? 'bg-destructive/10 text-destructive border border-destructive/20'
          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
      )}
    >
      Needs Reply
      {count > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full',
            active
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-muted-foreground/20 text-muted-foreground'
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
