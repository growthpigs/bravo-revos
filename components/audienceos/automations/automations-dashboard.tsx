/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Zap,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAutomationsStore } from '@/stores/automations-store'
import { AutomationCard } from './automation-card'
import { TriggerSelector } from './trigger-selector'
import { ActionBuilder } from './action-builder'
import type { Workflow, WorkflowRun } from '@/types/workflow'

interface AutomationsDashboardProps {
  pipelineStages?: string[]
}

export function AutomationsDashboard({
  pipelineStages = ['Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-Boarding'],
}: AutomationsDashboardProps) {
  const { toast } = useToast()

  // Get state and actions from store
  const {
    workflows,
    isLoading,
    error,
    runs,
    runsLoading,
    showBuilder,
    editingWorkflow,
    builderName,
    builderDescription,
    builderTriggers,
    builderActions,
    isSaving,
    fetchWorkflows,
    fetchRuns,
    toggleWorkflow,
    openBuilder,
    closeBuilder,
    setBuilderName,
    setBuilderDescription,
    saveWorkflow,
    addTrigger,
    removeTrigger,
    updateTrigger,
    addAction,
    removeAction,
    updateAction,
    reorderActions,
    getActiveCount,
    getTotalRuns,
    getSuccessRate,
  } = useAutomationsStore()

  // Fetch data on mount
  useEffect(() => {
    fetchWorkflows()
    fetchRuns()
  }, [fetchWorkflows, fetchRuns])

  // Toggle workflow active state
  const handleToggle = async (id: string, isActive: boolean) => {
    const success = await toggleWorkflow(id, isActive)
    if (success) {
      toast({
        title: isActive ? 'Workflow enabled' : 'Workflow disabled',
        description: `The workflow has been ${isActive ? 'activated' : 'deactivated'}.`,
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update workflow status',
        variant: 'destructive',
      })
    }
  }

  // Open builder for editing
  const handleEdit = (workflow: Workflow) => {
    openBuilder(workflow)
  }

  // Open builder for new workflow
  const handleCreate = () => {
    openBuilder()
  }

  // Save workflow
  const handleSave = async () => {
    if (!builderName.trim()) {
      toast({ title: 'Error', description: 'Workflow name is required', variant: 'destructive' })
      return
    }
    if (builderTriggers.length === 0) {
      toast({ title: 'Error', description: 'At least one trigger is required', variant: 'destructive' })
      return
    }
    if (builderActions.length === 0) {
      toast({ title: 'Error', description: 'At least one action is required', variant: 'destructive' })
      return
    }

    const success = await saveWorkflow()
    if (success) {
      toast({
        title: editingWorkflow ? 'Workflow updated' : 'Workflow created',
        description: editingWorkflow ? 'Your changes have been saved.' : 'Your new automation is ready.',
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to save workflow',
        variant: 'destructive',
      })
    }
  }

  // Format relative time
  const formatRelativeTime = (dateStr: string | null) => {
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

  // Computed stats from store
  const activeCount = getActiveCount()
  const totalRuns = getTotalRuns()
  const overallSuccessRate = getSuccessRate()

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Automations</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Build IF/THEN workflows to automate your client management
          </p>
        </div>
        <Button onClick={handleCreate} className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-3 w-3 mr-1.5" />
          Create Automation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">Total Workflows</p>
                <p className="text-lg font-semibold">{workflows.length}</p>
              </div>
              <Zap className="h-5 w-5 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">Active</p>
                <p className="text-lg font-semibold text-emerald-500">{activeCount}</p>
              </div>
              <Play className="h-5 w-5 text-emerald-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">Total Runs</p>
                <p className="text-lg font-semibold">{totalRuns}</p>
              </div>
              <RefreshCw className="h-5 w-5 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">Success Rate</p>
                <p className="text-lg font-semibold">{overallSuccessRate}%</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="workflows" className="w-full">
        <TabsList className="bg-muted h-7">
          <TabsTrigger value="workflows" className="text-[10px] h-6 px-2.5">Workflows</TabsTrigger>
          <TabsTrigger value="history" className="text-[10px] h-6 px-2.5">Execution History</TabsTrigger>
        </TabsList>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card className="bg-destructive/10 border-destructive/30">
              <CardContent className="py-6 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={fetchWorkflows}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : workflows.length === 0 ? (
            <Card className="border-2 border-dashed border-muted-foreground/30">
              <CardContent className="flex flex-col items-center justify-center py-8 space-y-3">
                <div className="p-3 rounded-full bg-secondary">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="text-[12px] font-medium text-foreground">No automations yet</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Create your first IF/THEN workflow to automate tasks
                  </p>
                </div>
                <Button onClick={handleCreate} className="h-7 text-[10px]">
                  <Plus className="h-3 w-3 mr-1.5" />
                  Create Automation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {workflows.map((workflow) => (
                    <AutomationCard
                      key={workflow.id}
                      workflow={workflow}
                      onToggle={handleToggle}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Execution History Tab */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-[11px] font-medium">Recent Executions</CardTitle>
              <CardDescription className="text-[10px]">Live workflow execution history</CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {runsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : runs.length === 0 ? (
                <div className="text-center py-6 text-[11px] text-muted-foreground">
                  No executions yet. Runs will appear here when workflows are triggered.
                </div>
              ) : (
                <div className="space-y-2">
                  {runs.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-2.5 rounded-md border border-border bg-secondary/30"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {run.status === 'completed' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        ) : run.status === 'failed' ? (
                          <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        ) : run.status === 'running' ? (
                          <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-foreground truncate">
                            {(run as WorkflowRun & { workflow_name?: string }).workflow_name || 'Unknown Workflow'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {run.error_message || `Executed ${(run.results as unknown[])?.length || 0} actions`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 ${
                            run.status === 'completed'
                              ? 'border-emerald-500/50 text-emerald-400'
                              : run.status === 'failed'
                              ? 'border-rose-500/50 text-rose-400'
                              : run.status === 'running'
                              ? 'border-blue-500/50 text-blue-400'
                              : 'border-amber-500/50 text-amber-400'
                          }`}
                        >
                          {run.status}
                        </Badge>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {formatRelativeTime(run.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Workflow Builder Sheet */}
      <Sheet open={showBuilder} onOpenChange={(open) => !open && closeBuilder()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[700px] bg-background border-border overflow-y-auto"
        >
          <SheetHeader className="pb-6">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-foreground">
                {editingWorkflow ? 'Edit Workflow' : 'Create Workflow'}
              </SheetTitle>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 mr-2" />
                )}
                {editingWorkflow ? 'Save Changes' : 'Create & Activate'}
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6 pb-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Workflow Name *</Label>
                <Input
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  placeholder="e.g., New Client Welcome Sequence"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={builderDescription}
                  onChange={(e) => setBuilderDescription(e.target.value)}
                  placeholder="What does this automation do?"
                  rows={2}
                />
              </div>
            </div>

            {/* Triggers Section */}
            <div className="pt-4 border-t border-border">
              <TriggerSelector
                triggers={builderTriggers}
                onAdd={addTrigger}
                onRemove={removeTrigger}
                onUpdate={updateTrigger}
                pipelineStages={pipelineStages}
                maxTriggers={2}
              />
            </div>

            {/* Actions Section */}
            <div className="pt-4 border-t border-border">
              <ActionBuilder
                actions={builderActions}
                onAdd={addAction}
                onRemove={removeAction}
                onUpdate={updateAction}
                onReorder={reorderActions}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
