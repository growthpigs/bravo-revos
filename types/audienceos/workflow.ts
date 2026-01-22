/**
 * AudienceOS Workflow/Automation Types
 * Comprehensive type definitions for the IF/THEN automation system
 */

import type { Database, HealthStatus } from './database'

// ============================================================================
// BASE TYPES
// ============================================================================

export type Workflow = Database['public']['Tables']['workflow']['Row']
export type WorkflowInsert = Database['public']['Tables']['workflow']['Insert']
export type WorkflowUpdate = Database['public']['Tables']['workflow']['Update']
export type WorkflowRun = Database['public']['Tables']['workflow_run']['Row']
export type WorkflowRunInsert = Database['public']['Tables']['workflow_run']['Insert']
export type WorkflowRunUpdate = Database['public']['Tables']['workflow_run']['Update']

// Extended workflow status for approvals
export type WorkflowRunStatus = 'running' | 'completed' | 'failed' | 'pending_approval' | 'skipped'

// ============================================================================
// TRIGGER TYPES
// ============================================================================

export type TriggerType =
  | 'stage_change'
  | 'inactivity'
  | 'kpi_threshold'
  | 'new_message'
  | 'ticket_created'
  | 'scheduled'

export interface BaseTrigger {
  id: string
  type: TriggerType
  name: string
  description?: string
}

export interface StageChangeTrigger extends BaseTrigger {
  type: 'stage_change'
  config: {
    fromStage?: string // null = any stage
    toStage: string
  }
}

export interface InactivityTrigger extends BaseTrigger {
  type: 'inactivity'
  config: {
    days: number // Minimum: 1
    activityTypes?: ('communication' | 'task' | 'ticket')[] // Default: all
  }
}

export interface KPIThresholdTrigger extends BaseTrigger {
  type: 'kpi_threshold'
  config: {
    metric: string // e.g., 'total_spend', 'health_score', 'days_in_stage'
    operator: 'above' | 'below' | 'equals'
    value: number
  }
}

export interface NewMessageTrigger extends BaseTrigger {
  type: 'new_message'
  config: {
    platform?: 'slack' | 'gmail' | 'any'
    containsKeywords?: string[]
    senderDomain?: string
  }
}

export interface TicketCreatedTrigger extends BaseTrigger {
  type: 'ticket_created'
  config: {
    categories?: ('technical' | 'billing' | 'campaign' | 'general' | 'escalation')[]
    priorities?: ('low' | 'medium' | 'high' | 'critical')[]
  }
}

export interface ScheduledTrigger extends BaseTrigger {
  type: 'scheduled'
  config: {
    schedule: string // Cron expression
    timezone: string // e.g., 'America/New_York'
  }
}

export type WorkflowTrigger =
  | StageChangeTrigger
  | InactivityTrigger
  | KPIThresholdTrigger
  | NewMessageTrigger
  | TicketCreatedTrigger
  | ScheduledTrigger

// ============================================================================
// ACTION TYPES
// ============================================================================

export type ActionType =
  | 'create_task'
  | 'send_notification'
  | 'draft_communication'
  | 'create_ticket'
  | 'update_client'
  | 'create_alert'

export interface BaseAction {
  id: string
  type: ActionType
  name: string
  description?: string
  delayMinutes?: number // 0-1440 (24 hours)
  condition?: ActionCondition
  continueOnFailure?: boolean
  requiresApproval?: boolean
}

export interface CreateTaskAction extends BaseAction {
  type: 'create_task'
  config: {
    title: string // Supports {{variables}}
    description?: string
    priority?: 'low' | 'medium' | 'high'
    dueInDays?: number
    assignToTriggeredUser?: boolean
  }
}

export interface SendNotificationAction extends BaseAction {
  type: 'send_notification'
  config: {
    channel: 'slack' | 'email'
    message: string // Supports {{variables}}
    recipients: string[] // User IDs or channel IDs
  }
}

export interface DraftCommunicationAction extends BaseAction {
  type: 'draft_communication'
  config: {
    platform: 'slack' | 'gmail'
    template: string // Base template
    tone?: 'professional' | 'friendly' | 'urgent'
    instructions?: string // Additional context for AI
  }
}

export interface CreateTicketAction extends BaseAction {
  type: 'create_ticket'
  config: {
    title: string // Supports {{variables}}
    description?: string
    category: 'technical' | 'billing' | 'campaign' | 'general' | 'escalation'
    priority: 'low' | 'medium' | 'high' | 'critical'
    assigneeId?: string
  }
}

export interface UpdateClientAction extends BaseAction {
  type: 'update_client'
  config: {
    updates: {
      stage?: string
      healthStatus?: HealthStatus
      notes?: string
      tags?: { add?: string[]; remove?: string[] }
    }
  }
}

export interface CreateAlertAction extends BaseAction {
  type: 'create_alert'
  config: {
    title: string // Supports {{variables}}
    description?: string
    type: 'risk_detected' | 'kpi_drop' | 'inactivity' | 'disconnect'
    severity: 'low' | 'medium' | 'high' | 'critical'
  }
}

export type WorkflowAction =
  | CreateTaskAction
  | SendNotificationAction
  | DraftCommunicationAction
  | CreateTicketAction
  | UpdateClientAction
  | CreateAlertAction

// ============================================================================
// CONDITIONAL LOGIC
// ============================================================================

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'starts_with'
  | 'exists'
  | 'not_exists'

export type ConditionFieldPath =
  | `client.${string}`
  | `trigger.${string}`
  | `metrics.${string}`
  | `time.${string}`

export interface ActionCondition {
  field: ConditionFieldPath
  operator: ConditionOperator
  value?: string | number | boolean
}

export interface ConditionGroup {
  logic: 'and' | 'or'
  conditions: (ActionCondition | ConditionGroup)[]
}

// ============================================================================
// EXECUTION CONTEXT
// ============================================================================

export interface WorkflowExecutionContext {
  workflowId: string
  runId: string
  agencyId: string
  userId: string
  triggerData: Record<string, unknown>
  clientSnapshot?: ClientSnapshot
  variables: Record<string, string | number | boolean>
}

export interface ClientSnapshot {
  id: string
  name: string
  stage: string
  healthStatus: HealthStatus
  contactEmail?: string
  contactName?: string
  daysInStage: number
  tags: string[]
  totalSpend?: number
}

// ============================================================================
// EXECUTION RESULTS
// ============================================================================

export type ActionResultStatus = 'completed' | 'failed' | 'skipped' | 'pending_approval'

export interface ActionResult {
  actionId: string
  actionType: ActionType
  status: ActionResultStatus
  result?: Record<string, unknown>
  error?: string
  executedAt: string
  durationMs?: number
}

export interface WorkflowExecutionResult {
  runId: string
  workflowId: string
  status: WorkflowRunStatus
  triggerData: Record<string, unknown>
  actionResults: ActionResult[]
  startedAt: string
  completedAt?: string
  error?: string
}

// ============================================================================
// APPROVAL SYSTEM
// ============================================================================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface WorkflowApproval {
  id: string
  workflowRunId: string
  actionType: ActionType
  actionConfig: Record<string, unknown>
  clientId?: string
  status: ApprovalStatus
  requestedBy: string
  requestedAt: string
  expiresAt: string
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
}

// ============================================================================
// API TYPES
// ============================================================================

export interface WorkflowWithStats extends Workflow {
  successRate: number
  recentRuns: WorkflowRun[]
  pendingApprovals: number
}

export interface CreateWorkflowRequest {
  name: string
  description?: string
  triggers: WorkflowTrigger[]
  actions: WorkflowAction[]
  isActive?: boolean
}

export interface UpdateWorkflowRequest {
  name?: string
  description?: string
  triggers?: WorkflowTrigger[]
  actions?: WorkflowAction[]
  isActive?: boolean
}

export interface WorkflowRunFilters {
  status?: WorkflowRunStatus[]
  startDate?: string
  endDate?: string
  limit?: number
  cursor?: string
}

export interface WorkflowListFilters {
  isActive?: boolean
  search?: string
  limit?: number
  cursor?: string
}

export interface WorkflowAnalytics {
  totalRuns: number
  successRate: number
  averageDurationMs: number
  runsByDay: { date: string; count: number; successes: number }[]
  topFailureReasons: { reason: string; count: number }[]
}

// ============================================================================
// TRIGGER/ACTION TYPE METADATA (for UI)
// ============================================================================

export interface TriggerTypeMetadata {
  type: TriggerType
  name: string
  description: string
  icon: string
  category: 'event' | 'condition' | 'schedule'
  configSchema: Record<string, unknown>
}

export interface ActionTypeMetadata {
  type: ActionType
  name: string
  description: string
  icon: string
  category: 'task' | 'communication' | 'data' | 'alert'
  supportsApproval: boolean
  configSchema: Record<string, unknown>
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'onboarding' | 'retention' | 'support' | 'monitoring' | 'custom'
  triggers: WorkflowTrigger[]
  actions: WorkflowAction[]
  popularity: number
  createdAt: string
}
