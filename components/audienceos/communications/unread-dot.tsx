'use client'

import { cn } from '@/lib/utils'

interface UnreadDotProps {
  count: number
  className?: string
}

export function UnreadDot({ count, className }: UnreadDotProps) {
  if (count === 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
