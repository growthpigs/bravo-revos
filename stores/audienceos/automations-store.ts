/**
 * Automations Store
 * Zustand state management for workflow automations feature
 */

import { create } from 'zustand'
import { fetchWithCsrf } from '@/lib/csrf'
import type { Workflow, WorkflowRun, WorkflowTrigger, WorkflowAction } from '@/types/workflow'

interface AutomationsState {
  // Workflows
  workflows: Workflow[]
  isLoading: boolean
  error: string | null

  // Execution history
  runs: (WorkflowRun & { workflow_name?: string })[]
  runsLoading: boolean

  // Builder state
  showBuilder: boolean
  editingWorkflow: Workflow | null
  builderName: string
  builderDescription: string
  builderTriggers: WorkflowTrigger[]
  builderActions: WorkflowAction[]
  isSaving: boolean

  // Actions - Data fetching
  fetchWorkflows: () => Promise<void>
  fetchRuns: () => Promise<void>
  setWorkflows: (workflows: Workflow[]) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void

  // Actions - Workflow management
  toggleWorkflow: (id: string, isActive: boolean) => Promise<boolean>
  deleteWorkflow: (id: string) => Promise<boolean>

  // Actions - Builder
  openBuilder: (workflow?: Workflow) => void
  closeBuilder: () => void
  setBuilderName: (name: string) => void
  setBuilderDescription: (description: string) => void
  saveWorkflow: () => Promise<boolean>

  // Actions - Triggers
  addTrigger: (trigger: WorkflowTrigger) => void
  removeTrigger: (triggerId: string) => void
  updateTrigger: (triggerId: string, config: Record<string, unknown>) => void

  // Actions - Actions
  addAction: (action: WorkflowAction) => void
  removeAction: (actionId: string) => void
  updateAction: (actionId: string, updates: Partial<WorkflowAction>) => void
  reorderActions: (reorderedActions: WorkflowAction[]) => void

  // Computed getters
  getActiveCount: () => number
  getTotalRuns: () => number
  getSuccessCount: () => number
  getSuccessRate: () => number
}

export const useAutomationsStore = create<AutomationsState>((set, get) => ({
  // Initial state
  workflows: [],
  isLoading: false,
  error: null,
  runs: [],
  runsLoading: false,
  showBuilder: false,
  editingWorkflow: null,
  builderName: '',
  builderDescription: '',
  builderTriggers: [],
  builderActions: [],
  isSaving: false,

  // Fetch workflows from API
  fetchWorkflows: async () => {
    set({ isLoading: true, error: null })

    try {
      const res = await fetch('/api/v1/workflows', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch workflows')
      const data = await res.json()
      set({ workflows: data.workflows || [], isLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load workflows',
        isLoading: false,
      })
    }
  },

  // Fetch recent runs
  fetchRuns: async () => {
    set({ runsLoading: true })

    try {
      const res = await fetch('/api/v1/workflows?include_runs=true&runs_limit=20', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch runs')
      const data = await res.json()

      // Flatten runs from all workflows
      const allRuns = (data.workflows || []).flatMap(
        (w: Workflow & { runs?: WorkflowRun[] }) =>
          (w.runs || []).map((r: WorkflowRun) => ({
            ...r,
            workflow_name: w.name,
          }))
      )

      // Sort by started_at desc
      allRuns.sort(
        (a: WorkflowRun, b: WorkflowRun) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      )

      set({ runs: allRuns.slice(0, 20), runsLoading: false })
    } catch (err) {
      console.error('Failed to fetch runs:', err)
      set({ runsLoading: false })
    }
  },

  setWorkflows: (workflows) => set({ workflows }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Toggle workflow active state
  toggleWorkflow: async (id, isActive) => {
    try {
      const res = await fetchWithCsrf(`/api/v1/workflows/${id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive }),
      })

      if (!res.ok) throw new Error('Failed to toggle workflow')

      set((state) => ({
        workflows: state.workflows.map((w) =>
          w.id === id ? { ...w, is_active: isActive } : w
        ),
      }))

      return true
    } catch (err) {
      console.error('Failed to toggle workflow:', err)
      return false
    }
  },

  // Delete workflow
  deleteWorkflow: async (id) => {
    try {
      const res = await fetchWithCsrf(`/api/v1/workflows/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete workflow')

      set((state) => ({
        workflows: state.workflows.filter((w) => w.id !== id),
      }))

      return true
    } catch (err) {
      console.error('Failed to delete workflow:', err)
      return false
    }
  },

  // Open builder (for new or editing)
  openBuilder: (workflow) => {
    if (workflow) {
      set({
        showBuilder: true,
        editingWorkflow: workflow,
        builderName: workflow.name,
        builderDescription: workflow.description || '',
        builderTriggers: workflow.triggers as unknown as WorkflowTrigger[],
        builderActions: workflow.actions as unknown as WorkflowAction[],
      })
    } else {
      set({
        showBuilder: true,
        editingWorkflow: null,
        builderName: '',
        builderDescription: '',
        builderTriggers: [],
        builderActions: [],
      })
    }
  },

  // Close builder
  closeBuilder: () => {
    set({
      showBuilder: false,
      editingWorkflow: null,
      builderName: '',
      builderDescription: '',
      builderTriggers: [],
      builderActions: [],
    })
  },

  setBuilderName: (builderName) => set({ builderName }),
  setBuilderDescription: (builderDescription) => set({ builderDescription }),

  // Save workflow (create or update)
  saveWorkflow: async () => {
    const {
      editingWorkflow,
      builderName,
      builderDescription,
      builderTriggers,
      builderActions,
    } = get()

    if (!builderName.trim()) return false
    if (builderTriggers.length === 0) return false
    if (builderActions.length === 0) return false

    set({ isSaving: true })

    try {
      const payload = {
        name: builderName.trim(),
        description: builderDescription.trim() || null,
        triggers: builderTriggers,
        actions: builderActions,
        is_active: editingWorkflow?.is_active ?? true,
      }

      const url = editingWorkflow
        ? `/api/v1/workflows/${editingWorkflow.id}`
        : '/api/v1/workflows'
      const method = editingWorkflow ? 'PATCH' : 'POST'

      const res = await fetchWithCsrf(url, {
        method,
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save workflow')
      }

      const saved = await res.json()

      if (editingWorkflow) {
        set((state) => ({
          workflows: state.workflows.map((w) => (w.id === saved.id ? saved : w)),
        }))
      } else {
        set((state) => ({
          workflows: [saved, ...state.workflows],
        }))
      }

      get().closeBuilder()
      set({ isSaving: false })
      return true
    } catch (err) {
      console.error('Failed to save workflow:', err)
      set({ isSaving: false })
      return false
    }
  },

  // Trigger management
  addTrigger: (trigger) => {
    set((state) => ({
      builderTriggers: [...state.builderTriggers, trigger],
    }))
  },

  removeTrigger: (triggerId) => {
    set((state) => ({
      builderTriggers: state.builderTriggers.filter((t) => t.id !== triggerId),
    }))
  },

  updateTrigger: (triggerId, config) => {
    set((state) => ({
      builderTriggers: state.builderTriggers.map((t) =>
        t.id === triggerId ? { ...t, config } : t
      ) as WorkflowTrigger[],
    }))
  },

  // Action management
  addAction: (action) => {
    set((state) => ({
      builderActions: [...state.builderActions, action],
    }))
  },

  removeAction: (actionId) => {
    set((state) => ({
      builderActions: state.builderActions.filter((a) => a.id !== actionId),
    }))
  },

  updateAction: (actionId, updates) => {
    set((state) => ({
      builderActions: state.builderActions.map((a) =>
        a.id === actionId ? { ...a, ...updates } : a
      ) as WorkflowAction[],
    }))
  },

  reorderActions: (reorderedActions) => {
    set({ builderActions: reorderedActions })
  },

  // Computed getters
  getActiveCount: () => {
    return get().workflows.filter((w) => w.is_active).length
  },

  getTotalRuns: () => {
    return get().workflows.reduce((sum, w) => sum + w.run_count, 0)
  },

  getSuccessCount: () => {
    return get().workflows.reduce((sum, w) => sum + w.success_count, 0)
  },

  getSuccessRate: () => {
    const totalRuns = get().getTotalRuns()
    const successCount = get().getSuccessCount()
    return totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 0
  },
}))
