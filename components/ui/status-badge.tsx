import * as React from 'react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface StatusBadgeProps extends BadgeProps {
  icon?: React.ReactNode
  label: string
}

export function StatusBadge({ icon, label, className, ...props }: StatusBadgeProps) {
  return (
    <Badge className={cn(className)} variant="secondary" {...props}>
      <span className="flex items-center gap-1">
        {icon}
        {label}
      </span>
    </Badge>
  )
}
