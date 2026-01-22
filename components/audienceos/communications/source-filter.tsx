/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PlatformIcon } from './platform-icon'
import type { SourceFilter as SourceFilterType } from '@/stores/communications-store'

interface SourceFilterProps {
  value: SourceFilterType
  onChange: (value: SourceFilterType) => void
  slackCount?: number
  gmailCount?: number
}

export function SourceFilter({
  value,
  onChange,
  slackCount = 0,
  gmailCount = 0,
}: SourceFilterProps) {
  const totalCount = slackCount + gmailCount

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
      <FilterButton
        active={value === 'all'}
        onClick={() => onChange('all')}
        count={totalCount}
      >
        All
      </FilterButton>

      <FilterButton
        active={value === 'slack'}
        onClick={() => onChange('slack')}
        count={slackCount}
      >
        <PlatformIcon platform="slack" size="sm" />
        <span className="ml-1.5">Slack</span>
      </FilterButton>

      <FilterButton
        active={value === 'gmail'}
        onClick={() => onChange('gmail')}
        count={gmailCount}
      >
        <PlatformIcon platform="gmail" size="sm" />
        <span className="ml-1.5">Gmail</span>
      </FilterButton>
    </div>
  )
}

interface FilterButtonProps {
  active: boolean
  onClick: () => void
  count?: number
  children: React.ReactNode
}

function FilterButton({ active, onClick, count, children }: FilterButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'h-7 px-2.5 text-xs font-medium transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
      )}
      onClick={onClick}
    >
      <span className="inline-flex items-center">{children}</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            'ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full',
            active ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'
          )}
        >
          {count}
        </span>
      )}
    </Button>
  )
}
