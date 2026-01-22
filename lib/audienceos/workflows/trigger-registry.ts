/**
 * Trigger Type Registry
 * Defines all available trigger types with metadata and validation schemas
 */

import type { TriggerType, TriggerTypeMetadata, WorkflowTrigger } from '@/types/workflow'

// ============================================================================
// TRIGGER TYPE DEFINITIONS
// ============================================================================

export const TRIGGER_TYPES: Record<TriggerType, TriggerTypeMetadata> = {
  stage_change: {
    type: 'stage_change',
    name: 'Stage Change',
    description: 'Trigger when a client moves to a specific pipeline stage',
    icon: 'ArrowRightCircle',
    category: 'event',
    configSchema: {
      type: 'object',
      properties: {
        fromStage: {
          type: 'string',
          title: 'From Stage',
          description: 'Previous stage (leave empty for any)',
        },
        toStage: {
          type: 'string',
          title: 'To Stage',
          description: 'Target stage',
          required: true,
        },
      },
      required: ['toStage'],
    },
  },

  inactivity: {
    type: 'inactivity',
    name: 'Client Inactivity',
    description: 'Trigger when no activity detected for specified days',
    icon: 'Clock',
    category: 'condition',
    configSchema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          title: 'Days of Inactivity',
          description: 'Number of days without activity',
          minimum: 1,
          maximum: 365,
          required: true,
        },
        activityTypes: {
          type: 'array',
          title: 'Activity Types',
          description: 'Types of activity to monitor',
          items: {
            type: 'string',
            enum: ['communication', 'task', 'ticket'],
          },
          default: ['communication', 'task', 'ticket'],
        },
      },
      required: ['days'],
    },
  },

  kpi_threshold: {
    type: 'kpi_threshold',
    name: 'KPI Threshold',
    description: 'Trigger when a metric crosses a threshold value',
    icon: 'TrendingUp',
    category: 'condition',
    configSchema: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          title: 'Metric',
          description: 'The KPI to monitor',
          enum: ['total_spend', 'days_in_stage', 'roas', 'conversion_rate', 'ctr'],
          required: true,
        },
        operator: {
          type: 'string',
          title: 'Operator',
          description: 'Comparison operator',
          enum: ['above', 'below', 'equals'],
          required: true,
        },
        value: {
          type: 'number',
          title: 'Threshold Value',
          description: 'The value to compare against',
          required: true,
        },
      },
      required: ['metric', 'operator', 'value'],
    },
  },

  new_message: {
    type: 'new_message',
    name: 'New Message',
    description: 'Trigger when a new Slack or Gmail message is received',
    icon: 'MessageSquare',
    category: 'event',
    configSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          title: 'Platform',
          description: 'Message source',
          enum: ['slack', 'gmail', 'any'],
          default: 'any',
        },
        containsKeywords: {
          type: 'array',
          title: 'Contains Keywords',
          description: 'Trigger only if message contains these keywords',
          items: { type: 'string' },
        },
        senderDomain: {
          type: 'string',
          title: 'Sender Domain',
          description: 'Filter by sender email domain',
        },
      },
    },
  },

  ticket_created: {
    type: 'ticket_created',
    name: 'Ticket Created',
    description: 'Trigger when a new support ticket is created',
    icon: 'Ticket',
    category: 'event',
    configSchema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          title: 'Categories',
          description: 'Filter by ticket category',
          items: {
            type: 'string',
            enum: ['technical', 'billing', 'campaign', 'general', 'escalation'],
          },
        },
        priorities: {
          type: 'array',
          title: 'Priorities',
          description: 'Filter by ticket priority',
          items: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
          },
        },
      },
    },
  },

  scheduled: {
    type: 'scheduled',
    name: 'Scheduled',
    description: 'Trigger at specific times using a schedule',
    icon: 'Calendar',
    category: 'schedule',
    configSchema: {
      type: 'object',
      properties: {
        schedule: {
          type: 'string',
          title: 'Schedule (Cron)',
          description: 'Cron expression for scheduling',
          required: true,
          examples: ['0 9 * * 1-5', '0 0 * * *'],
        },
        timezone: {
          type: 'string',
          title: 'Timezone',
          description: 'Timezone for the schedule',
          default: 'America/New_York',
          required: true,
        },
      },
      required: ['schedule', 'timezone'],
    },
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getTriggerTypes(): TriggerTypeMetadata[] {
  return Object.values(TRIGGER_TYPES)
}

export function getTriggerTypesByCategory(
  category: 'event' | 'condition' | 'schedule'
): TriggerTypeMetadata[] {
  return Object.values(TRIGGER_TYPES).filter((t) => t.category === category)
}

export function getTriggerMetadata(type: TriggerType): TriggerTypeMetadata | undefined {
  return TRIGGER_TYPES[type]
}

export function validateTriggerConfig(trigger: WorkflowTrigger): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const metadata = TRIGGER_TYPES[trigger.type]

  if (!metadata) {
    errors.push(`Unknown trigger type: ${trigger.type}`)
    return { valid: false, errors }
  }

  // Basic validation based on type
  switch (trigger.type) {
    case 'stage_change':
      if (!trigger.config.toStage) {
        errors.push('Stage change trigger requires a target stage')
      }
      break
    case 'inactivity':
      if (!trigger.config.days || trigger.config.days < 1) {
        errors.push('Inactivity trigger requires days >= 1')
      }
      break
    case 'kpi_threshold':
      if (!trigger.config.metric) {
        errors.push('KPI threshold trigger requires a metric')
      }
      if (!trigger.config.operator) {
        errors.push('KPI threshold trigger requires an operator')
      }
      if (trigger.config.value === undefined) {
        errors.push('KPI threshold trigger requires a value')
      }
      break
    case 'scheduled':
      if (!trigger.config.schedule) {
        errors.push('Scheduled trigger requires a cron schedule')
      }
      if (!trigger.config.timezone) {
        errors.push('Scheduled trigger requires a timezone')
      }
      break
  }

  return { valid: errors.length === 0, errors }
}

// ============================================================================
// CRON HELPERS
// ============================================================================

export const COMMON_SCHEDULES = [
  { label: 'Every hour', cron: '0 * * * *', description: 'At minute 0 of every hour' },
  { label: 'Every day at 9 AM', cron: '0 9 * * *', description: 'At 9:00 AM every day' },
  { label: 'Weekdays at 9 AM', cron: '0 9 * * 1-5', description: 'At 9:00 AM Monday through Friday' },
  { label: 'Every Monday at 9 AM', cron: '0 9 * * 1', description: 'At 9:00 AM every Monday' },
  { label: 'First day of month', cron: '0 9 1 * *', description: 'At 9:00 AM on the 1st of each month' },
]

export function parseCronExpression(cron: string): string {
  // Simple human-readable cron parser
  const parts = cron.split(' ')
  if (parts.length !== 5) return cron

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

  if (minute === '0' && hour === '*') return 'Every hour'
  if (minute === '0' && dayOfMonth === '*' && month === '*') {
    if (dayOfWeek === '*') return `Daily at ${hour}:00`
    if (dayOfWeek === '1-5') return `Weekdays at ${hour}:00`
    if (dayOfWeek === '1') return `Every Monday at ${hour}:00`
  }
  if (minute === '0' && dayOfMonth === '1' && month === '*') {
    return `First day of month at ${hour}:00`
  }

  return cron
}

export const AVAILABLE_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
]
