'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowRightCircle,
  Clock,
  TrendingUp,
  MessageSquare,
  Ticket,
  Calendar,
  X,
} from 'lucide-react'
import type { WorkflowTrigger, TriggerType } from '@/types/workflow'
import {
  TRIGGER_TYPES,
  COMMON_SCHEDULES,
  AVAILABLE_TIMEZONES,
} from '@/lib/workflows/trigger-registry'

interface TriggerSelectorProps {
  triggers: WorkflowTrigger[]
  onAdd: (trigger: WorkflowTrigger) => void
  onRemove: (triggerId: string) => void
  onUpdate: (triggerId: string, config: Record<string, unknown>) => void
  pipelineStages?: string[]
  maxTriggers?: number
}

const TRIGGER_ICONS: Record<TriggerType, React.ComponentType<{ className?: string }>> = {
  stage_change: ArrowRightCircle,
  inactivity: Clock,
  kpi_threshold: TrendingUp,
  new_message: MessageSquare,
  ticket_created: Ticket,
  scheduled: Calendar,
}

export function TriggerSelector({
  triggers,
  onAdd,
  onRemove,
  onUpdate,
  pipelineStages = ['Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-Boarding'],
  maxTriggers = 2,
}: TriggerSelectorProps) {
  const [showTypeSelector, setShowTypeSelector] = useState(triggers.length === 0)

  const handleAddTrigger = (type: TriggerType) => {
    const newTrigger: WorkflowTrigger = {
      id: `trigger-${crypto.randomUUID()}`,
      type,
      name: TRIGGER_TYPES[type].name,
      config: getDefaultConfig(type),
    } as WorkflowTrigger

    onAdd(newTrigger)
    setShowTypeSelector(false)
  }

  const getDefaultConfig = (type: TriggerType): Record<string, unknown> => {
    switch (type) {
      case 'stage_change':
        return { toStage: pipelineStages[0] }
      case 'inactivity':
        return { days: 7 }
      case 'kpi_threshold':
        return { metric: 'total_spend', operator: 'above', value: 0 }
      case 'new_message':
        return { platform: 'any' }
      case 'ticket_created':
        return {}
      case 'scheduled':
        return { schedule: '0 9 * * 1-5', timezone: 'America/New_York' }
      default:
        return {}
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-medium">
          Triggers {triggers.length > 0 && `(${triggers.length}/${maxTriggers})`}
        </Label>
        {triggers.length > 0 && triggers.length < maxTriggers && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTypeSelector(true)}
            className="text-xs"
          >
            + Add Another
          </Button>
        )}
      </div>

      {/* Existing Triggers */}
      <div className="space-y-3">
        {triggers.map((trigger) => (
          <TriggerConfigCard
            key={trigger.id}
            trigger={trigger}
            onRemove={() => onRemove(trigger.id)}
            onUpdate={(config) => onUpdate(trigger.id, config)}
            pipelineStages={pipelineStages}
          />
        ))}
      </div>

      {/* Type Selector */}
      {(showTypeSelector || triggers.length === 0) && triggers.length < maxTriggers && (
        <Card className="border-2 border-dashed border-muted-foreground/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[11px]">Select Trigger Type</CardTitle>
            <CardDescription className="text-xs">
              Choose what event will start this automation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TRIGGER_TYPES).map(([type, meta]) => {
                const Icon = TRIGGER_ICONS[type as TriggerType]
                return (
                  <Button
                    key={type}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-2 justify-start"
                    onClick={() => handleAddTrigger(type as TriggerType)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{meta.name}</span>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Individual trigger configuration card
interface TriggerConfigCardProps {
  trigger: WorkflowTrigger
  onRemove: () => void
  onUpdate: (config: Record<string, unknown>) => void
  pipelineStages: string[]
}

function TriggerConfigCard({
  trigger,
  onRemove,
  onUpdate,
  pipelineStages,
}: TriggerConfigCardProps) {
  const Icon = TRIGGER_ICONS[trigger.type]
  const meta = TRIGGER_TYPES[trigger.type]

  const updateConfig = (key: string, value: unknown) => {
    onUpdate({ ...trigger.config, [key]: value })
  }

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-blue-500/10">
              <Icon className="h-4 w-4 text-blue-400" />
            </div>
            <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400">
              TRIGGER
            </Badge>
            <span className="text-[11px] font-medium">{meta.name}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-3 pt-0">
        <div className="space-y-3">
          {/* Stage Change Config */}
          {trigger.type === 'stage_change' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">From Stage (optional)</Label>
                <Select
                  value={(trigger.config as { fromStage?: string }).fromStage || 'any'}
                  onValueChange={(v) => updateConfig('fromStage', v === 'any' ? undefined : v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any stage</SelectItem>
                    {pipelineStages.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To Stage *</Label>
                <Select
                  value={(trigger.config as { toStage?: string }).toStage || ''}
                  onValueChange={(v) => updateConfig('toStage', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelineStages.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Inactivity Config */}
          {trigger.type === 'inactivity' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Days of Inactivity *</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={(trigger.config as { days?: number }).days || 7}
                onChange={(e) => updateConfig('days', parseInt(e.target.value) || 7)}
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* KPI Threshold Config */}
          {trigger.type === 'kpi_threshold' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Metric *</Label>
                <Select
                  value={(trigger.config as { metric?: string }).metric || 'total_spend'}
                  onValueChange={(v) => updateConfig('metric', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total_spend">Total Spend</SelectItem>
                    <SelectItem value="days_in_stage">Days in Stage</SelectItem>
                    <SelectItem value="roas">ROAS</SelectItem>
                    <SelectItem value="conversion_rate">Conversion Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Operator *</Label>
                  <Select
                    value={(trigger.config as { operator?: string }).operator || 'above'}
                    onValueChange={(v) => updateConfig('operator', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Above</SelectItem>
                      <SelectItem value="below">Below</SelectItem>
                      <SelectItem value="equals">Equals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Value *</Label>
                  <Input
                    type="number"
                    value={(trigger.config as { value?: number }).value || 0}
                    onChange={(e) => updateConfig('value', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* New Message Config */}
          {trigger.type === 'new_message' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Platform</Label>
              <Select
                value={(trigger.config as { platform?: string }).platform || 'any'}
                onValueChange={(v) => updateConfig('platform', v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Platform</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="gmail">Gmail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Scheduled Config */}
          {trigger.type === 'scheduled' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Schedule *</Label>
                <Select
                  value={(trigger.config as { schedule?: string }).schedule || '0 9 * * 1-5'}
                  onValueChange={(v) => updateConfig('schedule', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_SCHEDULES.map((s) => (
                      <SelectItem key={s.cron} value={s.cron}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Timezone *</Label>
                <Select
                  value={(trigger.config as { timezone?: string }).timezone || 'America/New_York'}
                  onValueChange={(v) => updateConfig('timezone', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
