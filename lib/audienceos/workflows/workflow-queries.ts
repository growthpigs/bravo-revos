/**
 * Workflow Database Queries
 * Server-side database operations for workflows
 *
 * NOTE: JSON columns (triggers, actions, trigger_data) require `as unknown as` casts
 * because Supabase generates Json type (unknown) but we use typed interfaces.
 * This is the correct pattern - NOT a type safety gap.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, WorkflowStatus } from '@/types/database'
import type {
  Workflow,
  WorkflowInsert,
  WorkflowUpdate,
  WorkflowRun,
  WorkflowRunInsert,
  WorkflowWithStats,
  WorkflowRunFilters,
  WorkflowListFilters,
  WorkflowTrigger,
  WorkflowAction,
  WorkflowAnalytics,
} from '@/types/workflow'

type SupabaseClientType = SupabaseClient<Database>

// ============================================================================
// WORKFLOW CRUD
// ============================================================================

export async function getWorkflows(
  supabase: SupabaseClientType,
  agencyId: string,
  filters?: WorkflowListFilters
): Promise<{ data: Workflow[] | null; error: Error | null; count: number }> {
  let query = supabase
    .from('workflow')
    .select('*', { count: 'exact' })
    .eq('agency_id', agencyId)
    .order('updated_at', { ascending: false })

  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive)
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error, count } = await query

  return { data, error: error ? new Error(error.message) : null, count: count ?? 0 }
}

export async function getWorkflow(
  supabase: SupabaseClientType,
  workflowId: string,
  agencyId: string
): Promise<{ data: Workflow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('workflow')
    .select('*')
    .eq('id', workflowId)
    .eq('agency_id', agencyId)
    .single()

  return { data, error: error ? new Error(error.message) : null }
}

export async function getWorkflowWithStats(
  supabase: SupabaseClientType,
  workflowId: string,
  agencyId: string
): Promise<{ data: WorkflowWithStats | null; error: Error | null }> {
  // Get workflow
  const { data: workflow, error: workflowError } = await getWorkflow(
    supabase,
    workflowId,
    agencyId
  )

  if (workflowError || !workflow) {
    return { data: null, error: workflowError }
  }

  // Get recent runs
  const { data: recentRuns } = await supabase
    .from('workflow_run')
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('agency_id', agencyId)
    .order('started_at', { ascending: false })
    .limit(10)

  // Calculate success rate
  const successRate =
    workflow.run_count > 0 ? (workflow.success_count / workflow.run_count) * 100 : 0

  // TODO: Count pending approvals when approval table is added

  return {
    data: {
      ...workflow,
      successRate,
      recentRuns: recentRuns ?? [],
      pendingApprovals: 0,
    },
    error: null,
  }
}

export async function createWorkflow(
  supabase: SupabaseClientType,
  agencyId: string,
  userId: string,
  data: {
    name: string
    description?: string
    triggers: WorkflowTrigger[]
    actions: WorkflowAction[]
    isActive?: boolean
  }
): Promise<{ data: Workflow | null; error: Error | null }> {
  const insert: WorkflowInsert = {
    agency_id: agencyId,
    name: data.name,
    description: data.description,
    triggers: data.triggers as unknown as Database['public']['Tables']['workflow']['Insert']['triggers'],
    actions: data.actions as unknown as Database['public']['Tables']['workflow']['Insert']['actions'],
    is_active: data.isActive ?? true,
    created_by: userId,
    run_count: 0,
    success_count: 0,
  }

  const { data: workflow, error } = await supabase
    .from('workflow')
    .insert(insert)
    .select()
    .single()

  return { data: workflow, error: error ? new Error(error.message) : null }
}

export async function updateWorkflow(
  supabase: SupabaseClientType,
  workflowId: string,
  agencyId: string,
  data: {
    name?: string
    description?: string
    triggers?: WorkflowTrigger[]
    actions?: WorkflowAction[]
    isActive?: boolean
  }
): Promise<{ data: Workflow | null; error: Error | null }> {
  const update: WorkflowUpdate = {}

  if (data.name !== undefined) update.name = data.name
  if (data.description !== undefined) update.description = data.description
  if (data.triggers !== undefined)
    update.triggers = data.triggers as unknown as Database['public']['Tables']['workflow']['Update']['triggers']
  if (data.actions !== undefined)
    update.actions = data.actions as unknown as Database['public']['Tables']['workflow']['Update']['actions']
  if (data.isActive !== undefined) update.is_active = data.isActive

  const { data: workflow, error } = await supabase
    .from('workflow')
    .update(update)
    .eq('id', workflowId)
    .eq('agency_id', agencyId)
    .select()
    .single()

  return { data: workflow, error: error ? new Error(error.message) : null }
}

export async function toggleWorkflow(
  supabase: SupabaseClientType,
  workflowId: string,
  agencyId: string,
  isActive: boolean
): Promise<{ data: Workflow | null; error: Error | null }> {
  return updateWorkflow(supabase, workflowId, agencyId, { isActive })
}

export async function deleteWorkflow(
  supabase: SupabaseClientType,
  workflowId: string,
  agencyId: string
): Promise<{ error: Error | null }> {
  // Soft delete by setting is_active to false
  // TODO: Consider hard delete with cascade to workflow_runs
  const { error } = await supabase
    .from('workflow')
    .update({ is_active: false })
    .eq('id', workflowId)
    .eq('agency_id', agencyId)

  return { error: error ? new Error(error.message) : null }
}

// ============================================================================
// WORKFLOW RUNS
// ============================================================================

export async function getWorkflowRuns(
  supabase: SupabaseClientType,
  workflowId: string,
  agencyId: string,
  filters?: WorkflowRunFilters
): Promise<{ data: WorkflowRun[] | null; error: Error | null; count: number }> {
  let query = supabase
    .from('workflow_run')
    .select('*', { count: 'exact' })
    .eq('workflow_id', workflowId)
    .eq('agency_id', agencyId)
    .order('started_at', { ascending: false })

  if (filters?.status?.length) {
    // DB status column only has 'running' | 'completed' | 'failed'
    // Filter out any statuses that don't exist in DB schema
    const validStatuses = filters.status.filter(
      (s): s is 'running' | 'completed' | 'failed' =>
        s === 'running' || s === 'completed' || s === 'failed'
    )
    if (validStatuses.length > 0) {
      query = query.in('status', validStatuses)
    }
  }

  if (filters?.startDate) {
    query = query.gte('started_at', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('started_at', filters.endDate)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error, count } = await query

  return { data, error: error ? new Error(error.message) : null, count: count ?? 0 }
}

export async function getWorkflowRun(
  supabase: SupabaseClientType,
  runId: string,
  agencyId: string
): Promise<{ data: WorkflowRun | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('workflow_run')
    .select('*')
    .eq('id', runId)
    .eq('agency_id', agencyId)
    .single()

  return { data, error: error ? new Error(error.message) : null }
}

export async function createWorkflowRun(
  supabase: SupabaseClientType,
  agencyId: string,
  data: {
    workflowId: string
    triggerData: Record<string, unknown>
  }
): Promise<{ data: WorkflowRun | null; error: Error | null }> {
  const insert: WorkflowRunInsert = {
    agency_id: agencyId,
    workflow_id: data.workflowId,
    trigger_data: data.triggerData as Record<string, string | number | boolean | null>,
    status: 'running',
  }

  const { data: run, error } = await supabase
    .from('workflow_run')
    .insert(insert)
    .select()
    .single()

  return { data: run, error: error ? new Error(error.message) : null }
}

export async function updateWorkflowRun(
  supabase: SupabaseClientType,
  runId: string,
  agencyId: string,
  data: {
    status?: 'running' | 'completed' | 'failed'
    executedActions?: unknown[]
    errorMessage?: string
  }
): Promise<{ data: WorkflowRun | null; error: Error | null }> {
  const update: Record<string, unknown> = {}

  if (data.status !== undefined) {
    update.status = data.status
    if (data.status === 'completed' || data.status === 'failed') {
      update.completed_at = new Date().toISOString()
    }
  }
  if (data.executedActions !== undefined) update.executed_actions = data.executedActions
  if (data.errorMessage !== undefined) update.error_message = data.errorMessage

  const { data: run, error } = await supabase
    .from('workflow_run')
    .update(update)
    .eq('id', runId)
    .eq('agency_id', agencyId)
    .select()
    .single()

  return { data: run, error: error ? new Error(error.message) : null }
}

export async function completeWorkflowRun(
  supabase: SupabaseClientType,
  runId: string,
  agencyId: string,
  workflowId: string,
  success: boolean,
  executedActions?: unknown[],
  errorMessage?: string
): Promise<{ error: Error | null }> {
  // Update the run
  const { error: runError } = await updateWorkflowRun(supabase, runId, agencyId, {
    status: success ? 'completed' : 'failed',
    executedActions,
    errorMessage,
  })

  if (runError) return { error: runError }

  // Use raw SQL for increment (Supabase doesn't have built-in increment)
  // NOTE: This RPC function may not exist in generated types - that's expected
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: statsError } = await (supabase.rpc as any)('increment_workflow_stats', {
    workflow_id: workflowId,
    increment_run: 1,
    increment_success: success ? 1 : 0,
  })

  // If RPC doesn't exist, fallback to manual update
  if (statsError?.code === 'PGRST202') {
    // Function not found - do manual update
    const { data: workflow } = await getWorkflow(supabase, workflowId, agencyId)
    if (workflow) {
      await supabase
        .from('workflow')
        .update({
          run_count: workflow.run_count + 1,
          success_count: workflow.success_count + (success ? 1 : 0),
          last_run_at: new Date().toISOString(),
        })
        .eq('id', workflowId)
        .eq('agency_id', agencyId)
    }
  }

  return { error: null }
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getWorkflowAnalytics(
  supabase: SupabaseClientType,
  workflowId: string,
  agencyId: string,
  days: number = 30
): Promise<{ data: WorkflowAnalytics | null; error: Error | null }> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: runs, error } = await supabase
    .from('workflow_run')
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('agency_id', agencyId)
    .gte('started_at', startDate.toISOString())
    .order('started_at', { ascending: true })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  if (!runs?.length) {
    return {
      data: {
        totalRuns: 0,
        successRate: 0,
        averageDurationMs: 0,
        runsByDay: [],
        topFailureReasons: [],
      },
      error: null,
    }
  }

  // Calculate metrics
  const totalRuns = runs.length
  const successfulRuns = runs.filter((r) => r.status === 'completed').length
  const successRate = (successfulRuns / totalRuns) * 100

  // Calculate average duration (only for completed runs)
  const completedRuns = runs.filter((r) => r.completed_at)
  const totalDuration = completedRuns.reduce((sum, r) => {
    const start = new Date(r.started_at).getTime()
    const end = new Date(r.completed_at!).getTime()
    return sum + (end - start)
  }, 0)
  const averageDurationMs = completedRuns.length > 0 ? totalDuration / completedRuns.length : 0

  // Group by day
  const runsByDayMap = new Map<string, { count: number; successes: number }>()
  runs.forEach((run) => {
    const date = run.started_at.split('T')[0]
    const current = runsByDayMap.get(date) || { count: 0, successes: 0 }
    current.count++
    if (run.status === 'completed') current.successes++
    runsByDayMap.set(date, current)
  })

  const runsByDay = Array.from(runsByDayMap.entries()).map(([date, stats]) => ({
    date,
    count: stats.count,
    successes: stats.successes,
  }))

  // Top failure reasons
  const failureReasons = new Map<string, number>()
  runs
    .filter((r) => r.status === 'failed' && r.error_message)
    .forEach((r) => {
      const reason = r.error_message || 'Unknown error'
      failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1)
    })

  const topFailureReasons = Array.from(failureReasons.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    data: {
      totalRuns,
      successRate,
      averageDurationMs,
      runsByDay,
      topFailureReasons,
    },
    error: null,
  }
}

// ============================================================================
// ACTIVE WORKFLOWS BY TRIGGER TYPE
// ============================================================================

export async function getActiveWorkflowsByTriggerType(
  supabase: SupabaseClientType,
  agencyId: string,
  triggerType: string
): Promise<{ data: Workflow[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('workflow')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_active', true)

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  // Filter by trigger type (triggers is JSONB array)
  const filtered = data?.filter((workflow) => {
    const triggers = workflow.triggers as unknown as WorkflowTrigger[]
    return triggers.some((t) => t.type === triggerType)
  })

  return { data: filtered ?? [], error: null }
}
