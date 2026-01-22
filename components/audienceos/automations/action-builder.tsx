'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckSquare,
  Bell,
  Edit3,
  Ticket,
  UserCog,
  AlertTriangle,
  X,
  GripVertical,
  Plus,
  Clock,
} from 'lucide-react'
import type { WorkflowAction, ActionType } from '@/types/workflow'
import { ACTION_TYPES, DELAY_PRESETS, AVAILABLE_VARIABLES } from '@/lib/workflows/action-registry'

interface ActionBuilderProps {
  actions: WorkflowAction[]
  onAdd: (action: WorkflowAction) => void
  onRemove: (actionId: string) => void
  onUpdate: (actionId: string, updates: Partial<WorkflowAction>) => void
  onReorder: (actions: WorkflowAction[]) => void
  pipelineStages?: string[]
}

const ACTION_ICONS: Record<ActionType, React.ComponentType<{ className?: string }>> = {
  create_task: CheckSquare,
  send_notification: Bell,
  draft_communication: Edit3,
  create_ticket: Ticket,
  update_client: UserCog,
  create_alert: AlertTriangle,
}

export function ActionBuilder({
  actions,
  onAdd,
  onRemove,
  onUpdate,
  onReorder: _onReorder,
  pipelineStages = ['Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-Boarding'],
}: ActionBuilderProps) {
  const [showTypeSelector, setShowTypeSelector] = useState(false)

  const handleAddAction = (type: ActionType) => {
    const newAction: WorkflowAction = {
      id: `action-${crypto.randomUUID()}`,
      type,
      name: ACTION_TYPES[type].name,
      config: getDefaultConfig(type),
      delayMinutes: 0,
      continueOnFailure: false,
      requiresApproval: ACTION_TYPES[type].supportsApproval ? false : undefined,
    } as WorkflowAction

    onAdd(newAction)
    setShowTypeSelector(false)
  }

  const getDefaultConfig = (type: ActionType): Record<string, unknown> => {
    switch (type) {
      case 'create_task':
        return { title: '', priority: 'medium', assignToTriggeredUser: true }
      case 'send_notification':
        return { channel: 'slack', message: '', recipients: [] }
      case 'draft_communication':
        return { platform: 'gmail', template: '', tone: 'professional' }
      case 'create_ticket':
        return { title: '', category: 'general', priority: 'medium' }
      case 'update_client':
        return { updates: {} }
      case 'create_alert':
        return { title: '', type: 'risk_detected', severity: 'medium' }
      default:
        return {}
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-medium">Actions ({actions.length})</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTypeSelector(true)}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Action
        </Button>
      </div>

      {/* Actions List */}
      <div className="space-y-3">
        {actions.map((action, index) => (
          <ActionConfigCard
            key={action.id}
            action={action}
            index={index}
            onRemove={() => onRemove(action.id)}
            onUpdate={(updates) => onUpdate(action.id, updates)}
            pipelineStages={pipelineStages}
            isLast={index === actions.length - 1}
          />
        ))}
      </div>

      {/* Type Selector */}
      {(showTypeSelector || actions.length === 0) && (
        <Card className="border-2 border-dashed border-muted-foreground/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[11px]">Add Action</CardTitle>
            <CardDescription className="text-xs">
              Choose what should happen when this automation runs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ACTION_TYPES).map(([type, meta]) => {
                const Icon = ACTION_ICONS[type as ActionType]
                return (
                  <Button
                    key={type}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-2 justify-start"
                    onClick={() => handleAddAction(type as ActionType)}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="text-center">
                      <span className="text-xs font-medium block">{meta.name}</span>
                      {meta.supportsApproval && (
                        <span className="text-[10px] text-muted-foreground">Supports approval</span>
                      )}
                    </div>
                  </Button>
                )
              })}
            </div>
            {actions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setShowTypeSelector(false)}
              >
                Cancel
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Variables Reference */}
      <Card className="bg-muted/30 border-dashed">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs text-muted-foreground">Available Variables</CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-3">
          <div className="flex flex-wrap gap-1">
            {AVAILABLE_VARIABLES.map((v) => (
              <code
                key={v.path}
                className="text-[10px] px-1.5 py-0.5 bg-background rounded font-mono"
                title={v.description}
              >
                {v.path}
              </code>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Individual action configuration card
interface ActionConfigCardProps {
  action: WorkflowAction
  index: number
  onRemove: () => void
  onUpdate: (updates: Partial<WorkflowAction>) => void
  pipelineStages: string[]
  isLast: boolean
}

function ActionConfigCard({
  action,
  index,
  onRemove,
  onUpdate,
  pipelineStages,
  isLast,
}: ActionConfigCardProps) {
  const Icon = ACTION_ICONS[action.type]
  const meta = ACTION_TYPES[action.type]

  const updateConfig = (key: string, value: unknown) => {
    onUpdate({ config: { ...action.config, [key]: value } } as unknown as Partial<WorkflowAction>)
  }

  return (
    <div className="relative">
      {/* Connection line */}
      {!isLast && (
        <div className="absolute left-6 top-full w-0.5 h-3 bg-border z-0" />
      )}

      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <div className="p-1.5 rounded bg-emerald-500/10">
                <Icon className="h-4 w-4 text-emerald-400" />
              </div>
              <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-400">
                {index + 1}
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
            {/* Create Task Config */}
            {action.type === 'create_task' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Task Title *</Label>
                  <Input
                    placeholder="e.g., Follow up with {{client.name}}"
                    value={(action.config as { title?: string }).title || ''}
                    onChange={(e) => updateConfig('title', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    placeholder="Optional task description"
                    value={(action.config as { description?: string }).description || ''}
                    onChange={(e) => updateConfig('description', e.target.value)}
                    className="text-xs min-h-[60px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Priority</Label>
                    <Select
                      value={(action.config as { priority?: string }).priority || 'medium'}
                      onValueChange={(v) => updateConfig('priority', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Due In Days</Label>
                    <Input
                      type="number"
                      min={0}
                      value={(action.config as { dueInDays?: number }).dueInDays || ''}
                      onChange={(e) => updateConfig('dueInDays', parseInt(e.target.value) || undefined)}
                      className="h-8 text-xs"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Send Notification Config */}
            {action.type === 'send_notification' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Channel *</Label>
                  <Select
                    value={(action.config as { channel?: string }).channel || 'slack'}
                    onValueChange={(v) => updateConfig('channel', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Message *</Label>
                  <Textarea
                    placeholder="e.g., {{client.name}} has been inactive for {{trigger.days}} days"
                    value={(action.config as { message?: string }).message || ''}
                    onChange={(e) => updateConfig('message', e.target.value)}
                    className="text-xs min-h-[80px]"
                  />
                </div>
              </>
            )}

            {/* Create Ticket Config */}
            {action.type === 'create_ticket' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ticket Title *</Label>
                  <Input
                    placeholder="e.g., Issue detected for {{client.name}}"
                    value={(action.config as { title?: string }).title || ''}
                    onChange={(e) => updateConfig('title', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category *</Label>
                    <Select
                      value={(action.config as { category?: string }).category || 'general'}
                      onValueChange={(v) => updateConfig('category', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="campaign">Campaign</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="escalation">Escalation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Priority *</Label>
                    <Select
                      value={(action.config as { priority?: string }).priority || 'medium'}
                      onValueChange={(v) => updateConfig('priority', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Create Alert Config */}
            {action.type === 'create_alert' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Alert Title *</Label>
                  <Input
                    placeholder="e.g., Risk detected for {{client.name}}"
                    value={(action.config as { title?: string }).title || ''}
                    onChange={(e) => updateConfig('title', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type *</Label>
                    <Select
                      value={(action.config as { type?: string }).type || 'risk_detected'}
                      onValueChange={(v) => updateConfig('type', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="risk_detected">Risk Detected</SelectItem>
                        <SelectItem value="kpi_drop">KPI Drop</SelectItem>
                        <SelectItem value="inactivity">Inactivity</SelectItem>
                        <SelectItem value="disconnect">Disconnect</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Severity *</Label>
                    <Select
                      value={(action.config as { severity?: string }).severity || 'medium'}
                      onValueChange={(v) => updateConfig('severity', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Update Client Config */}
            {action.type === 'update_client' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">New Stage</Label>
                  <Select
                    value={(action.config as { updates?: { stage?: string } }).updates?.stage || ''}
                    onValueChange={(v) =>
                      updateConfig('updates', {
                        ...(action.config as { updates?: object }).updates,
                        stage: v || undefined,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="No change" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No change</SelectItem>
                      {pipelineStages.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Health Status</Label>
                  <Select
                    value={
                      (action.config as { updates?: { healthStatus?: string } }).updates
                        ?.healthStatus || ''
                    }
                    onValueChange={(v) =>
                      updateConfig('updates', {
                        ...(action.config as { updates?: object }).updates,
                        healthStatus: v || undefined,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="No change" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No change</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="yellow">Yellow</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Draft Communication Config */}
            {action.type === 'draft_communication' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Platform *</Label>
                  <Select
                    value={(action.config as { platform?: string }).platform || 'gmail'}
                    onValueChange={(v) => updateConfig('platform', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gmail">Gmail</SelectItem>
                      <SelectItem value="slack">Slack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Template / Purpose *</Label>
                  <Input
                    placeholder="e.g., Check-in after inactivity"
                    value={(action.config as { template?: string }).template || ''}
                    onChange={(e) => updateConfig('template', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tone</Label>
                  <Select
                    value={(action.config as { tone?: string }).tone || 'professional'}
                    onValueChange={(v) => updateConfig('tone', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Common Options */}
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <Label className="text-xs">Delay</Label>
                </div>
                <Select
                  value={String(action.delayMinutes || 0)}
                  onValueChange={(v) => onUpdate({ delayMinutes: parseInt(v) })}
                >
                  <SelectTrigger className="h-7 text-xs w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELAY_PRESETS.map((preset) => (
                      <SelectItem key={preset.minutes} value={String(preset.minutes)}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`continue-${action.id}`}
                  checked={action.continueOnFailure}
                  onCheckedChange={(checked) => onUpdate({ continueOnFailure: !!checked })}
                />
                <Label htmlFor={`continue-${action.id}`} className="text-xs text-muted-foreground">
                  Continue if this action fails
                </Label>
              </div>

              {meta.supportsApproval && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`approval-${action.id}`}
                    checked={action.requiresApproval}
                    onCheckedChange={(checked) => onUpdate({ requiresApproval: !!checked })}
                  />
                  <Label htmlFor={`approval-${action.id}`} className="text-xs text-muted-foreground">
                    Require human approval before execution
                  </Label>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
