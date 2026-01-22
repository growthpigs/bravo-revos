/**
 * Action Type Registry
 * Defines all available action types with metadata and validation schemas
 */

import type { ActionType, ActionTypeMetadata, WorkflowAction } from '@/types/workflow'

// ============================================================================
// ACTION TYPE DEFINITIONS
// ============================================================================

export const ACTION_TYPES: Record<ActionType, ActionTypeMetadata> = {
  create_task: {
    type: 'create_task',
    name: 'Create Task',
    description: 'Add a task to the client with optional assignment',
    icon: 'CheckSquare',
    category: 'task',
    supportsApproval: false,
    configSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          title: 'Task Title',
          description: 'Title of the task. Use {{client.name}} for variables.',
          required: true,
          examples: ['Follow up with {{client.name}}', 'Review {{client.stage}} checklist'],
        },
        description: {
          type: 'string',
          title: 'Description',
          description: 'Optional task description',
        },
        priority: {
          type: 'string',
          title: 'Priority',
          enum: ['low', 'medium', 'high'],
          default: 'medium',
        },
        dueInDays: {
          type: 'number',
          title: 'Due In Days',
          description: 'Number of days from now until due',
          minimum: 0,
          maximum: 365,
        },
        assignToTriggeredUser: {
          type: 'boolean',
          title: 'Assign to Account Owner',
          description: 'Assign to the client account owner',
          default: true,
        },
      },
      required: ['title'],
    },
  },

  send_notification: {
    type: 'send_notification',
    name: 'Send Notification',
    description: 'Send internal notification via Slack or email',
    icon: 'Bell',
    category: 'communication',
    supportsApproval: false,
    configSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          title: 'Channel',
          description: 'Notification channel',
          enum: ['slack', 'email'],
          required: true,
        },
        message: {
          type: 'string',
          title: 'Message',
          description: 'Notification message. Use {{variables}} for dynamic content.',
          required: true,
          examples: [
            '{{client.name}} has been inactive for {{trigger.days}} days',
            'New ticket from {{client.name}}: {{trigger.title}}',
          ],
        },
        recipients: {
          type: 'array',
          title: 'Recipients',
          description: 'User IDs or Slack channel IDs',
          items: { type: 'string' },
          required: true,
        },
      },
      required: ['channel', 'message', 'recipients'],
    },
  },

  draft_communication: {
    type: 'draft_communication',
    name: 'Draft Communication',
    description: 'Use AI to draft a message for review',
    icon: 'Edit3',
    category: 'communication',
    supportsApproval: true,
    configSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          title: 'Platform',
          description: 'Communication platform',
          enum: ['slack', 'gmail'],
          required: true,
        },
        template: {
          type: 'string',
          title: 'Template',
          description: 'Base template or message type',
          required: true,
          examples: [
            'Check-in after inactivity',
            'Welcome to new stage',
            'Issue resolution follow-up',
          ],
        },
        tone: {
          type: 'string',
          title: 'Tone',
          description: 'Message tone',
          enum: ['professional', 'friendly', 'urgent'],
          default: 'professional',
        },
        instructions: {
          type: 'string',
          title: 'Additional Instructions',
          description: 'Extra context for AI drafting',
        },
      },
      required: ['platform', 'template'],
    },
  },

  create_ticket: {
    type: 'create_ticket',
    name: 'Create Ticket',
    description: 'Open a new support ticket',
    icon: 'Ticket',
    category: 'task',
    supportsApproval: false,
    configSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          title: 'Ticket Title',
          description: 'Title of the ticket',
          required: true,
        },
        description: {
          type: 'string',
          title: 'Description',
          description: 'Ticket description',
        },
        category: {
          type: 'string',
          title: 'Category',
          enum: ['technical', 'billing', 'campaign', 'general', 'escalation'],
          required: true,
        },
        priority: {
          type: 'string',
          title: 'Priority',
          enum: ['low', 'medium', 'high', 'critical'],
          required: true,
        },
        assigneeId: {
          type: 'string',
          title: 'Assignee',
          description: 'User ID to assign the ticket to',
        },
      },
      required: ['title', 'category', 'priority'],
    },
  },

  update_client: {
    type: 'update_client',
    name: 'Update Client',
    description: 'Modify client stage, health, or tags',
    icon: 'UserCog',
    category: 'data',
    supportsApproval: true,
    configSchema: {
      type: 'object',
      properties: {
        updates: {
          type: 'object',
          title: 'Updates',
          properties: {
            stage: {
              type: 'string',
              title: 'New Stage',
              description: 'Move client to this stage',
            },
            healthStatus: {
              type: 'string',
              title: 'Health Status',
              enum: ['green', 'yellow', 'red'],
            },
            notes: {
              type: 'string',
              title: 'Add Notes',
              description: 'Append to client notes',
            },
            tags: {
              type: 'object',
              title: 'Tags',
              properties: {
                add: {
                  type: 'array',
                  items: { type: 'string' },
                },
                remove: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
      },
      required: ['updates'],
    },
  },

  create_alert: {
    type: 'create_alert',
    name: 'Create Alert',
    description: 'Generate an alert in the Intelligence Center',
    icon: 'AlertTriangle',
    category: 'alert',
    supportsApproval: false,
    configSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          title: 'Alert Title',
          description: 'Alert headline',
          required: true,
        },
        description: {
          type: 'string',
          title: 'Description',
          description: 'Detailed alert description',
        },
        type: {
          type: 'string',
          title: 'Alert Type',
          enum: ['risk_detected', 'kpi_drop', 'inactivity', 'disconnect'],
          required: true,
        },
        severity: {
          type: 'string',
          title: 'Severity',
          enum: ['low', 'medium', 'high', 'critical'],
          required: true,
        },
      },
      required: ['title', 'type', 'severity'],
    },
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getActionTypes(): ActionTypeMetadata[] {
  return Object.values(ACTION_TYPES)
}

export function getActionTypesByCategory(
  category: 'task' | 'communication' | 'data' | 'alert'
): ActionTypeMetadata[] {
  return Object.values(ACTION_TYPES).filter((a) => a.category === category)
}

export function getActionMetadata(type: ActionType): ActionTypeMetadata | undefined {
  return ACTION_TYPES[type]
}

export function validateActionConfig(action: WorkflowAction): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const metadata = ACTION_TYPES[action.type]

  if (!metadata) {
    errors.push(`Unknown action type: ${action.type}`)
    return { valid: false, errors }
  }

  // Validate delay
  if (action.delayMinutes !== undefined) {
    if (action.delayMinutes < 0 || action.delayMinutes > 1440) {
      errors.push('Delay must be between 0 and 1440 minutes (24 hours)')
    }
  }

  // Basic validation based on type
  switch (action.type) {
    case 'create_task':
      if (!action.config.title) {
        errors.push('Create task action requires a title')
      }
      break
    case 'send_notification':
      if (!action.config.channel) {
        errors.push('Send notification action requires a channel')
      }
      if (!action.config.message) {
        errors.push('Send notification action requires a message')
      }
      if (!action.config.recipients?.length) {
        errors.push('Send notification action requires at least one recipient')
      }
      break
    case 'draft_communication':
      if (!action.config.platform) {
        errors.push('Draft communication action requires a platform')
      }
      if (!action.config.template) {
        errors.push('Draft communication action requires a template')
      }
      break
    case 'create_ticket':
      if (!action.config.title) {
        errors.push('Create ticket action requires a title')
      }
      if (!action.config.category) {
        errors.push('Create ticket action requires a category')
      }
      if (!action.config.priority) {
        errors.push('Create ticket action requires a priority')
      }
      break
    case 'update_client':
      if (!action.config.updates || Object.keys(action.config.updates).length === 0) {
        errors.push('Update client action requires at least one update')
      }
      break
    case 'create_alert':
      if (!action.config.title) {
        errors.push('Create alert action requires a title')
      }
      if (!action.config.type) {
        errors.push('Create alert action requires a type')
      }
      if (!action.config.severity) {
        errors.push('Create alert action requires a severity')
      }
      break
  }

  return { valid: errors.length === 0, errors }
}

// ============================================================================
// VARIABLE SUBSTITUTION
// ============================================================================

export const AVAILABLE_VARIABLES = [
  { path: '{{client.name}}', description: 'Client company name' },
  { path: '{{client.stage}}', description: 'Current pipeline stage' },
  { path: '{{client.health}}', description: 'Health status (green/yellow/red)' },
  { path: '{{client.contactEmail}}', description: 'Primary contact email' },
  { path: '{{client.contactName}}', description: 'Primary contact name' },
  { path: '{{client.daysInStage}}', description: 'Days in current stage' },
  { path: '{{trigger.date}}', description: 'Trigger date (YYYY-MM-DD)' },
  { path: '{{trigger.time}}', description: 'Trigger time (HH:MM)' },
  { path: '{{trigger.type}}', description: 'Trigger type name' },
]

export function substituteVariables(
  template: string,
  context: {
    client?: {
      name?: string
      stage?: string
      healthStatus?: string
      contactEmail?: string
      contactName?: string
      daysInStage?: number
    }
    trigger?: Record<string, unknown>
  }
): string {
  let result = template

  // Client variables
  if (context.client) {
    result = result.replace(/\{\{client\.name\}\}/g, context.client.name || '')
    result = result.replace(/\{\{client\.stage\}\}/g, context.client.stage || '')
    result = result.replace(/\{\{client\.health\}\}/g, context.client.healthStatus || '')
    result = result.replace(/\{\{client\.contactEmail\}\}/g, context.client.contactEmail || '')
    result = result.replace(/\{\{client\.contactName\}\}/g, context.client.contactName || '')
    result = result.replace(
      /\{\{client\.daysInStage\}\}/g,
      String(context.client.daysInStage ?? '')
    )
  }

  // Trigger variables
  result = result.replace(/\{\{trigger\.date\}\}/g, new Date().toISOString().split('T')[0])
  result = result.replace(
    /\{\{trigger\.time\}\}/g,
    new Date().toISOString().split('T')[1].slice(0, 5)
  )

  if (context.trigger) {
    Object.entries(context.trigger).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{trigger\\.${key}\\}\\}`, 'g'), String(value))
    })
  }

  return result
}

// ============================================================================
// DELAY HELPERS
// ============================================================================

export const DELAY_PRESETS = [
  { label: 'No delay', minutes: 0 },
  { label: '5 minutes', minutes: 5 },
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '4 hours', minutes: 240 },
  { label: '1 day', minutes: 1440 },
]

export function formatDelay(minutes: number): string {
  if (minutes === 0) return 'Immediately'
  if (minutes < 60) return `${minutes} minutes`
  if (minutes === 60) return '1 hour'
  if (minutes < 1440) return `${minutes / 60} hours`
  return '24 hours'
}
