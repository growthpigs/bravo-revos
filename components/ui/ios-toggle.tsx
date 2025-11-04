'use client'

import * as React from 'react'
import * as SwitchPrimitives from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

interface IOSToggleProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  label?: string
  description?: string
}

const IOSToggle = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  IOSToggleProps
>(({ className, label, description, ...props }, ref) => (
  <div className="flex items-center justify-between">
    {(label || description) && (
      <div className="flex-1 mr-4">
        {label && (
          <label className="text-sm font-medium text-slate-900 cursor-pointer">
            {label}
          </label>
        )}
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
      </div>
    )}
    <SwitchPrimitives.Root
      className={cn(
        'peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-300',
        'shadow-inner',
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          'pointer-events-none block h-6 w-6 rounded-full bg-white shadow-lg ring-0 transition-transform',
          'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
          'data-[state=checked]:scale-95 data-[state=unchecked]:scale-100'
        )}
      />
    </SwitchPrimitives.Root>
  </div>
))
IOSToggle.displayName = 'IOSToggle'

export { IOSToggle }
