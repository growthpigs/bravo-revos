/**
 * Workflow Module Index
 * Central export for all workflow-related functionality
 */

// Types
export type {
  Workflow,
  WorkflowInsert,
  WorkflowUpdate,
  WorkflowRun,
  WorkflowRunInsert,
  WorkflowRunUpdate,
  WorkflowRunStatus,
  TriggerType,
  WorkflowTrigger,
  StageChangeTrigger,
  InactivityTrigger,
  KPIThresholdTrigger,
  NewMessageTrigger,
  TicketCreatedTrigger,
  ScheduledTrigger,
  ActionType,
  WorkflowAction,
  CreateTaskAction,
  SendNotificationAction,
  DraftCommunicationAction,
  CreateTicketAction,
  UpdateClientAction,
  CreateAlertAction,
  ActionCondition,
  ConditionGroup,
  ConditionOperator,
  ConditionFieldPath,
  WorkflowExecutionContext,
  ClientSnapshot,
  ActionResult,
  ActionResultStatus,
  WorkflowExecutionResult,
  WorkflowApproval,
  ApprovalStatus,
  WorkflowWithStats,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowRunFilters,
  WorkflowListFilters,
  WorkflowAnalytics,
  TriggerTypeMetadata,
  ActionTypeMetadata,
  WorkflowTemplate,
} from '@/types/workflow'

// Trigger Registry
export {
  TRIGGER_TYPES,
  getTriggerTypes,
  getTriggerTypesByCategory,
  getTriggerMetadata,
  validateTriggerConfig,
  COMMON_SCHEDULES,
  parseCronExpression,
  AVAILABLE_TIMEZONES,
} from './trigger-registry'

// Action Registry
export {
  ACTION_TYPES,
  getActionTypes,
  getActionTypesByCategory,
  getActionMetadata,
  validateActionConfig,
  AVAILABLE_VARIABLES,
  substituteVariables,
  DELAY_PRESETS,
  formatDelay,
} from './action-registry'

// Database Queries
export {
  getWorkflows,
  getWorkflow,
  getWorkflowWithStats,
  createWorkflow,
  updateWorkflow,
  toggleWorkflow,
  deleteWorkflow,
  getWorkflowRuns,
  getWorkflowRun,
  createWorkflowRun,
  updateWorkflowRun,
  completeWorkflowRun,
  getWorkflowAnalytics,
  getActiveWorkflowsByTriggerType,
} from './workflow-queries'

// Execution Engine
export { WorkflowEngine, createWorkflowEngine } from './execution-engine'
