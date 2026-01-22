'use client'

import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Edit2, Zap, Play, Clock, CheckCircle2, XCircle } from 'lucide-react'
import type { Workflow, WorkflowTrigger, WorkflowAction } from '@/types/workflow'
import { cn } from '@/lib/utils'

interface AutomationCardProps {
  workflow: Workflow
  onToggle: (id: string, isActive: boolean) => void
  onEdit: (workflow: Workflow) => void
}

export function AutomationCard({ workflow, onToggle, onEdit }: AutomationCardProps) {
  const triggers = workflow.triggers as unknown as WorkflowTrigger[]
  const actions = workflow.actions as unknown as WorkflowAction[]
  const successRate =
    workflow.run_count > 0
      ? Math.round((workflow.success_count / workflow.run_count) * 100)
      : 0

  // Format last run time
  const formatLastRun = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between py-3 px-4 hover:bg-secondary/50 transition-colors group',
        !workflow.is_active && 'opacity-60'
      )}
    >
      {/* Left: Icon + Name + Description */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="p-2 rounded-md bg-secondary flex-shrink-0">
          <Zap className="h-4 w-4 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-foreground truncate">
              {workflow.name}
            </span>
            {workflow.is_active && (
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {workflow.description || `${triggers.length} trigger${triggers.length > 1 ? 's' : ''}, ${actions.length} action${actions.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Middle: Triggers + Actions badges */}
      <div className="hidden md:flex items-center gap-3 px-4 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-blue-400" />
          <span className="text-[10px] text-muted-foreground">{triggers.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Play className="h-3 w-3 text-emerald-400" />
          <span className="text-[10px] text-muted-foreground">{actions.length}</span>
        </div>
      </div>

      {/* Middle: Stats */}
      <div className="hidden lg:flex items-center gap-4 px-4 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            {formatLastRun(workflow.last_run_at)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {successRate >= 90 ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          ) : successRate >= 70 ? (
            <CheckCircle2 className="h-3 w-3 text-amber-500" />
          ) : workflow.run_count > 0 ? (
            <XCircle className="h-3 w-3 text-rose-500" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="text-[10px] text-muted-foreground">
            {workflow.run_count > 0 ? `${successRate}%` : '-'}
          </span>
        </div>
      </div>

      {/* Right: Actions (Toggle + Edit) */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(workflow)
          }}
        >
          <Edit2 className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Switch
          checked={workflow.is_active}
          onCheckedChange={(checked) => onToggle(workflow.id, checked)}
          className="scale-90"
        />
      </div>
    </div>
  )
}
