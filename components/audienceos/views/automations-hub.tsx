"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useSlideTransition } from "@/hooks/use-slide-transition"
import { useToast } from "@/hooks/use-toast"
import { fetchWithCsrf } from "@/lib/csrf"
import { useAutomationsStore } from "@/stores/automations-store"
import { cn } from "@/lib/utils"
import { ListHeader } from "@/components/linear"
import {
  Zap,
  Users,
  Mail,
  Bell,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  MessageSquare,
  FileText,
  Database,
  Plus,
  Play,
  Pause,
  MoreHorizontal,
  Trash2,
  Copy,
  X,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Icons for integrations
function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  )
}

interface AutomationTemplate {
  id: string
  name: string
  description: string
  category: "onboarding" | "monitoring" | "communication" | "triage"
  icon: React.ReactNode
  status: "active" | "inactive" | "draft"
  runs: number
  lastRun: string | null
  steps: AutomationStep[]
}

// Step configuration types for automation workflows
interface StepConfig {
  // Trigger configs
  stage?: string
  schedule?: string
  channels?: string
  // Delay configs
  duration?: number
  unit?: 'minutes' | 'hours' | 'days'
  // Action configs
  template?: string
  pattern?: string
  channel?: string
  endpoint?: string
  priority?: string
  recipient?: string
  source?: string
  model?: string
  delay?: string
  // Condition configs
  condition?: string
  threshold?: number
}

interface AutomationStep {
  id: string
  order: number
  name: string
  type: "trigger" | "delay" | "action" | "condition"
  config: StepConfig
  icon: React.ReactNode
}

// Mock automation templates
const automationTemplates: AutomationTemplate[] = [
  {
    id: "1",
    name: "New Client Welcome Sequence",
    description: "Automated welcome flow when a client is added",
    category: "onboarding",
    icon: <Users className="h-4 w-4" />,
    status: "active",
    runs: 24,
    lastRun: "2h ago",
    steps: [
      { id: "s1", order: 1, name: "Client Added to Pipeline", type: "trigger", config: { stage: "Onboarding" }, icon: <Zap className="h-3.5 w-3.5" /> },
      { id: "s2", order: 2, name: "Wait 1 hour", type: "delay", config: { duration: 1, unit: "hours" }, icon: <Clock className="h-3.5 w-3.5" /> },
      { id: "s3", order: 3, name: "Send Welcome Email", type: "action", config: { template: "welcome" }, icon: <Mail className="h-3.5 w-3.5" /> },
      { id: "s4", order: 4, name: "Create Slack Channel", type: "action", config: { pattern: "#client-{name}" }, icon: <SlackIcon className="h-3.5 w-3.5" /> },
      { id: "s5", order: 5, name: "Schedule Kickoff Call", type: "action", config: { delay: "2 days" }, icon: <Calendar className="h-3.5 w-3.5" /> },
    ],
  },
  {
    id: "2",
    name: "Stuck Pipeline Alert",
    description: "Alert team when client is stuck > 5 days",
    category: "monitoring",
    icon: <AlertTriangle className="h-4 w-4" />,
    status: "active",
    runs: 156,
    lastRun: "1h ago",
    steps: [
      { id: "s1", order: 1, name: "Daily Pipeline Scan", type: "trigger", config: { schedule: "daily_9am" }, icon: <Clock className="h-3.5 w-3.5" /> },
      { id: "s2", order: 2, name: "Check Days in Stage", type: "condition", config: { condition: "days > 5" }, icon: <AlertTriangle className="h-3.5 w-3.5" /> },
      { id: "s3", order: 3, name: "Send Slack Alert", type: "action", config: { channel: "#fulfillment" }, icon: <SlackIcon className="h-3.5 w-3.5" /> },
    ],
  },
  {
    id: "3",
    name: "Pixel Health Monitor",
    description: "Daily check for zero-event pixels",
    category: "monitoring",
    icon: <Sparkles className="h-4 w-4" />,
    status: "active",
    runs: 89,
    lastRun: "3h ago",
    steps: [
      { id: "s1", order: 1, name: "Daily at 8 AM", type: "trigger", config: { schedule: "daily_8am" }, icon: <Clock className="h-3.5 w-3.5" /> },
      { id: "s2", order: 2, name: "Check Meta API", type: "action", config: { endpoint: "/events" }, icon: <Database className="h-3.5 w-3.5" /> },
      { id: "s3", order: 3, name: "If Events = 0", type: "condition", config: { condition: "events == 0" }, icon: <AlertTriangle className="h-3.5 w-3.5" /> },
      { id: "s4", order: 4, name: "Create Support Ticket", type: "action", config: { priority: "high" }, icon: <FileText className="h-3.5 w-3.5" /> },
    ],
  },
  {
    id: "4",
    name: "Urgent Triage Bot",
    description: "AI-powered urgent message detection",
    category: "triage",
    icon: <MessageSquare className="h-4 w-4" />,
    status: "active",
    runs: 12,
    lastRun: "1d ago",
    steps: [
      { id: "s1", order: 1, name: "New Slack Message", type: "trigger", config: { channels: "all" }, icon: <SlackIcon className="h-3.5 w-3.5" /> },
      { id: "s2", order: 2, name: "AI Analyze Urgency", type: "action", config: { model: "claude" }, icon: <Sparkles className="h-3.5 w-3.5" /> },
      { id: "s3", order: 3, name: "If Urgency > 7", type: "condition", config: { threshold: 7 }, icon: <AlertTriangle className="h-3.5 w-3.5" /> },
      { id: "s4", order: 4, name: "Create High Priority Ticket", type: "action", config: { priority: "high" }, icon: <FileText className="h-3.5 w-3.5" /> },
      { id: "s5", order: 5, name: "Send SMS Alert", type: "action", config: { recipient: "Brent" }, icon: <Bell className="h-3.5 w-3.5" /> },
    ],
  },
  {
    id: "5",
    name: "Weekly Report Generator",
    description: "Auto-generate client performance reports",
    category: "communication",
    icon: <FileText className="h-4 w-4" />,
    status: "inactive",
    runs: 8,
    lastRun: "7d ago",
    steps: [
      { id: "s1", order: 1, name: "Every Monday 9 AM", type: "trigger", config: { schedule: "weekly_monday" }, icon: <Clock className="h-3.5 w-3.5" /> },
      { id: "s2", order: 2, name: "Pull Ad Performance Data", type: "action", config: { source: "meta+google" }, icon: <Database className="h-3.5 w-3.5" /> },
      { id: "s3", order: 3, name: "Generate Report", type: "action", config: { template: "weekly" }, icon: <FileText className="h-3.5 w-3.5" /> },
      { id: "s4", order: 4, name: "Send to Client", type: "action", config: { channel: "email" }, icon: <Mail className="h-3.5 w-3.5" /> },
    ],
  },
  {
    id: "6",
    name: "Off-boarding Checklist",
    description: "Automated cleanup when client leaves",
    category: "onboarding",
    icon: <CheckCircle2 className="h-4 w-4" />,
    status: "draft",
    runs: 0,
    lastRun: null,
    steps: [
      { id: "s1", order: 1, name: "Client Moved to Off-boarding", type: "trigger", config: { stage: "Off-boarding" }, icon: <Zap className="h-3.5 w-3.5" /> },
      { id: "s2", order: 2, name: "Archive Slack Channel", type: "action", config: {}, icon: <SlackIcon className="h-3.5 w-3.5" /> },
      { id: "s3", order: 3, name: "Export Client Data", type: "action", config: {}, icon: <Database className="h-3.5 w-3.5" /> },
      { id: "s4", order: 4, name: "Send Farewell Email", type: "action", config: { template: "farewell" }, icon: <Mail className="h-3.5 w-3.5" /> },
    ],
  },
]

type FilterTab = "all" | "active" | "inactive" | "draft"

interface FilterTabConfig {
  id: FilterTab
  label: string
  icon: React.ReactNode
  count: number
}

const categoryLabels: Record<string, string> = {
  onboarding: "Onboarding",
  monitoring: "Monitoring",
  communication: "Communication",
  triage: "Triage",
}

const stepTypeColors: Record<string, string> = {
  trigger: "bg-blue-500 text-white",
  delay: "bg-slate-500 text-white",
  action: "bg-emerald-500 text-white",
  condition: "bg-amber-500 text-white",
}

export function AutomationsHub() {
  const { toast } = useToast()
  const { toggleWorkflow, deleteWorkflow } = useAutomationsStore()

  const [selectedAutomation, setSelectedAutomation] = useState<AutomationTemplate | null>(null)
  const [selectedStep, setSelectedStep] = useState<AutomationStep | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isTestingStep, setIsTestingStep] = useState(false)
  const [isSavingStep, setIsSavingStep] = useState(false)

  const slideTransition = useSlideTransition()

  // Handler functions
  const handleToggleStatus = async (automation: AutomationTemplate) => {
    const newStatus = automation.status === "active" ? "inactive" : "active"
    const isActive = newStatus === "active"

    try {
      const success = await toggleWorkflow(automation.id, isActive)
      if (success) {
        toast({
          title: "Automation updated",
          description: `Automation is now ${newStatus}`,
          variant: "default",
        })
        // Update local state
        if (selectedAutomation) {
          setSelectedAutomation({ ...selectedAutomation, status: newStatus as "active" | "inactive" | "draft" })
        }
      } else {
        throw new Error("Failed to toggle automation")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to toggle automation"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleDuplicate = async () => {
    if (!selectedAutomation) return
    setIsDuplicating(true)

    try {
      const response = await fetchWithCsrf(`/api/v1/workflows/${selectedAutomation.id}/duplicate`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to duplicate automation")
      }

      toast({
        title: "Automation duplicated",
        description: `${selectedAutomation.name} has been duplicated`,
        variant: "default",
      })

      // Close detail panel
      setSelectedAutomation(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to duplicate automation"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedAutomation) return
    setIsDeleting(true)

    try {
      const success = await deleteWorkflow(selectedAutomation.id)
      if (success) {
        toast({
          title: "Automation deleted",
          description: "The automation has been removed",
          variant: "default",
        })
        setShowDeleteModal(false)
        setSelectedAutomation(null)
      } else {
        throw new Error("Failed to delete automation")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete automation"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDelete = () => {
    setShowDeleteModal(true)
  }

  const handleTestStep = async () => {
    if (!selectedStep || !selectedAutomation) return
    setIsTestingStep(true)

    try {
      const response = await fetchWithCsrf(`/api/v1/workflows/${selectedAutomation.id}/steps/${selectedStep.id}/test`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to test step")
      }

      const result = await response.json()
      toast({
        title: "Step tested",
        description: `Test execution completed successfully`,
        variant: "default",
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to test step"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsTestingStep(false)
    }
  }

  const handleSaveStep = async () => {
    if (!selectedStep || !selectedAutomation) return
    setIsSavingStep(true)

    try {
      const response = await fetchWithCsrf(`/api/v1/workflows/${selectedAutomation.id}/steps/${selectedStep.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: selectedStep.name,
          config: selectedStep.config,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save step")
      }

      toast({
        title: "Step saved",
        description: `${selectedStep.name} configuration has been updated`,
        variant: "default",
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save step"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSavingStep(false)
    }
  }

  // Calculate counts
  const counts = useMemo(() => {
    return {
      all: automationTemplates.length,
      active: automationTemplates.filter((a) => a.status === "active").length,
      inactive: automationTemplates.filter((a) => a.status === "inactive").length,
      draft: automationTemplates.filter((a) => a.status === "draft").length,
    }
  }, [])

  const filterTabs: FilterTabConfig[] = [
    { id: "all", label: "All", icon: <Zap className="w-4 h-4" />, count: counts.all },
    { id: "active", label: "Active", icon: <Play className="w-4 h-4" />, count: counts.active },
    { id: "inactive", label: "Inactive", icon: <Pause className="w-4 h-4" />, count: counts.inactive },
    { id: "draft", label: "Draft", icon: <FileText className="w-4 h-4" />, count: counts.draft },
  ]

  // Filter automations
  const filteredAutomations = useMemo(() => {
    let automations = automationTemplates

    // Apply status filter
    if (activeFilter !== "all") {
      automations = automations.filter((a) => a.status === activeFilter)
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      automations = automations.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query) ||
          a.category.toLowerCase().includes(query)
      )
    }

    return automations
  }, [activeFilter, searchQuery])

  // When automation is selected, select first step
  const handleSelectAutomation = (automation: AutomationTemplate) => {
    setSelectedAutomation(automation)
    setSelectedStep(automation.steps[0] || null)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT PANEL - Automations list (shrinks when detail is open) */}
      <motion.div
        initial={false}
        animate={{ width: selectedAutomation ? 280 : "100%" }}
        transition={slideTransition}
        className="flex flex-col border-r border-border overflow-hidden"
        style={{ minWidth: selectedAutomation ? 280 : undefined, flexShrink: selectedAutomation ? 0 : undefined }}
      >
        <ListHeader
          title="Automations"
          count={filteredAutomations.length}
          onSearch={!selectedAutomation ? setSearchQuery : undefined}
          searchValue={!selectedAutomation ? searchQuery : undefined}
          searchPlaceholder="Search automations..."
          actions={
            !selectedAutomation && (
              <Button size="sm" className="h-8 gap-1.5">
                <Plus className="h-4 w-4" />
                New Automation
              </Button>
            )
          }
        />

        {/* Filter tabs - hide when compact */}
        {!selectedAutomation && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border overflow-x-auto">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
                  activeFilter === tab.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className="text-xs text-muted-foreground">({tab.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Automations list - natural flow */}
        <div className="flex-1">
          {filteredAutomations.length > 0 ? (
            filteredAutomations.map((automation) => (
              <AutomationItem
                key={automation.id}
                automation={automation}
                selected={selectedAutomation?.id === automation.id}
                compact={!!selectedAutomation}
                onClick={() => handleSelectAutomation(automation)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Zap className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No automations found</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* MIDDLE PANEL - Steps list (when automation selected) */}
      <AnimatePresence mode="wait">
        {selectedAutomation && (
          <motion.div
            key="steps-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={slideTransition}
            className="border-r border-border flex flex-col bg-background overflow-hidden"
            style={{ minWidth: 0 }}>
          {/* Header */}
          <div className="h-[52px] px-4 flex items-center justify-between border-b border-border shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
                {selectedAutomation.icon}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-medium text-foreground truncate">{selectedAutomation.name}</h2>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Switch
                checked={selectedAutomation.status === "active"}
                onCheckedChange={() => handleToggleStatus(selectedAutomation)}
                className="scale-90"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicating || isDeleting}>
                    {isDuplicating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {isDuplicating ? "Duplicating..." : "Duplicate"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive" disabled={isDeleting || isDuplicating}>
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    {isDeleting ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedAutomation(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Status bar */}
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  selectedAutomation.status === "active" && "border-emerald-500/50 text-emerald-600 bg-emerald-500/10",
                  selectedAutomation.status === "inactive" && "border-slate-500/50 text-slate-600",
                  selectedAutomation.status === "draft" && "border-amber-500/50 text-amber-600 bg-amber-500/10"
                )}
              >
                {selectedAutomation.status === "active" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />}
                {selectedAutomation.status.charAt(0).toUpperCase() + selectedAutomation.status.slice(1)}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {selectedAutomation.runs} runs
              </span>
              <span className="text-[10px] text-muted-foreground">
                Last: {selectedAutomation.lastRun || "Never"}
              </span>
            </div>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2">
              <Play className="h-3 w-3 mr-1" />
              Run Now
            </Button>
          </div>

          {/* Workflow Steps header */}
          <div className="px-4 py-2 border-b border-border">
            <h3 className="text-xs font-medium text-foreground">Workflow Steps</h3>
          </div>

          {/* Steps list */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              {selectedAutomation.steps.map((step, idx) => (
                <div key={step.id}>
                  {/* Step item */}
                  <button
                    onClick={() => setSelectedStep(step)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer",
                      selectedStep?.id === step.id
                        ? "bg-primary/5 border-primary/30"
                        : "bg-card border-border hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0",
                        stepTypeColors[step.type]
                      )}>
                        {step.order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-foreground block truncate">
                          {step.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {step.type}
                        </span>
                      </div>
                      {step.icon}
                    </div>
                  </button>

                  {/* Connector line */}
                  {idx < selectedAutomation.steps.length - 1 && (
                    <div className="flex justify-center py-0.5">
                      <div className="w-0.5 h-3 bg-border" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add step button */}
            <button className="w-full mt-3 p-2 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer">
              <Plus className="h-3 w-3" />
              Add Step
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* RIGHT PANEL - Step configuration (when step selected) */}
      <AnimatePresence mode="wait">
        {selectedAutomation && selectedStep && (
          <motion.div
            key="config-panel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={slideTransition}
            className="flex-1 flex flex-col bg-background">
          {/* Panel Header */}
          <div className="h-[52px] px-4 flex items-center justify-between border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-md",
                selectedStep.type === "trigger" && "bg-blue-500/10",
                selectedStep.type === "delay" && "bg-slate-500/10",
                selectedStep.type === "action" && "bg-emerald-500/10",
                selectedStep.type === "condition" && "bg-amber-500/10"
              )}>
                {selectedStep.icon}
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  {selectedStep.name}
                </h3>
                <span className="text-xs text-muted-foreground capitalize">
                  {selectedStep.type} configuration
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleTestStep}
                disabled={isTestingStep}
              >
                {isTestingStep ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 mr-1.5" />
                )}
                {isTestingStep ? "Testing..." : "Test Step"}
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleSaveStep}
                disabled={isSavingStep}
              >
                {isSavingStep && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                {isSavingStep ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          {/* Configuration Content - natural flow */}
          <div className="flex-1 p-4">
            <StepConfiguration step={selectedStep} />
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete automation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedAutomation?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface AutomationItemProps {
  automation: AutomationTemplate
  selected: boolean
  compact: boolean
  onClick: () => void
}

function AutomationItem({ automation, selected, compact, onClick }: AutomationItemProps) {
  if (compact) {
    // Compact view when detail panel is open
    return (
      <div
        className={cn(
          "px-3 py-2.5 transition-colors border-b border-border/30 cursor-pointer",
          selected
            ? "bg-primary/10 border-l-2 border-l-primary"
            : "hover:bg-secondary/50 border-l-2 border-l-transparent"
        )}
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full shrink-0",
            automation.status === "active" && "bg-emerald-500",
            automation.status === "inactive" && "bg-slate-400",
            automation.status === "draft" && "bg-amber-500"
          )} />
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium text-foreground truncate">
              {automation.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                {automation.steps.length} steps
              </span>
              <span className="text-[10px] text-muted-foreground">
                {automation.runs} runs
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full view when no detail panel
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors border-l-2 border-b border-border/30 cursor-pointer",
        selected
          ? "bg-secondary border-l-primary"
          : "border-l-transparent hover:bg-secondary/50"
      )}
      onClick={onClick}
    >
      {/* Status indicator */}
      <div className="pt-1.5">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            automation.status === "active" && "bg-emerald-500",
            automation.status === "inactive" && "bg-slate-400",
            automation.status === "draft" && "bg-amber-500"
          )}
        />
      </div>

      {/* Icon */}
      <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
        {automation.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-foreground truncate">
            {automation.name}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {automation.lastRun || "Never"}
          </span>
        </div>
        <p className="text-sm text-foreground truncate mb-1">
          {automation.description}
        </p>

        {/* Tags row */}
        <div className="flex items-center gap-2 mt-2">
          {/* Category badge */}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
            {categoryLabels[automation.category]}
          </span>

          {/* Steps count */}
          <span className="text-[10px] text-muted-foreground">
            {automation.steps.length} steps
          </span>

          {/* Runs count */}
          <span className="text-[10px] text-muted-foreground">
            {automation.runs} runs
          </span>
        </div>
      </div>
    </div>
  )
}

interface StepConfigurationProps {
  step: AutomationStep
}

function StepConfiguration({ step }: StepConfigurationProps) {
  return (
    <div className="max-w-lg space-y-4">
      {/* Step Type Badge */}
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "text-xs px-2 py-0.5 capitalize",
            step.type === "trigger" && "border-blue-500/50 text-blue-600",
            step.type === "delay" && "border-slate-500/50 text-slate-600",
            step.type === "action" && "border-emerald-500/50 text-emerald-600",
            step.type === "condition" && "border-amber-500/50 text-amber-600"
          )}
        >
          {step.type}
        </Badge>
      </div>

      {/* Name Field */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Step Name</label>
        <Input defaultValue={step.name} className="h-9" />
      </div>

      {/* Type-specific configuration */}
      {step.type === "trigger" && <TriggerConfig config={step.config} />}
      {step.type === "delay" && <DelayConfig config={step.config} />}
      {step.type === "action" && <ActionConfig config={step.config} />}
      {step.type === "condition" && <ConditionConfig config={step.config} />}
    </div>
  )
}

function TriggerConfig({ config }: { config: StepConfig }) {
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
        <h4 className="text-xs font-medium text-blue-600 mb-3">TRIGGER SETTINGS</h4>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">When this happens:</label>
            <select
              defaultValue={config.schedule ? "scheduled" : config.channels ? "slack_message" : "client_added"}
              className="w-full h-9 text-sm rounded-md border border-border bg-background px-3"
            >
              <option value="client_added">Client added to pipeline</option>
              <option value="stage_change">Client stage changes</option>
              <option value="slack_message">New Slack message</option>
              <option value="scheduled">Scheduled time</option>
            </select>
          </div>
          {config.stage && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Stage:</label>
              <select
                defaultValue={config.stage}
                className="w-full h-9 text-sm rounded-md border border-border bg-background px-3"
              >
                <option value="Onboarding">Onboarding</option>
                <option value="Installation">Installation</option>
                <option value="Live">Live</option>
                <option value="Off-boarding">Off-boarding</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DelayConfig({ config }: { config: StepConfig }) {
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg border border-slate-500/20 bg-slate-500/5">
        <h4 className="text-xs font-medium text-slate-600 mb-3">DELAY SETTINGS</h4>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            defaultValue={config.duration || 1}
            className="w-20 h-9"
          />
          <select
            defaultValue={config.unit || "hours"}
            className="h-9 text-sm rounded-md border border-border bg-background px-3"
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function ActionConfig({ config }: { config: StepConfig }) {
  // Determine default action type based on config
  const getDefaultActionType = () => {
    if (config.template) return "send_email"
    if (config.pattern) return "create_slack_channel"
    if (config.channel) return "send_slack_message"
    if (config.priority) return "create_ticket"
    return "send_email"
  }

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
        <h4 className="text-xs font-medium text-emerald-600 mb-3">ACTION SETTINGS</h4>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Action type:</label>
            <select
              defaultValue={getDefaultActionType()}
              className="w-full h-9 text-sm rounded-md border border-border bg-background px-3"
            >
              <option value="send_email">Send email</option>
              <option value="create_slack_channel">Create Slack channel</option>
              <option value="send_slack_message">Send Slack message</option>
              <option value="create_ticket">Create ticket</option>
              <option value="update_client">Update client</option>
            </select>
          </div>
          {config.template && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Template:</label>
              <select
                defaultValue={config.template}
                className="w-full h-9 text-sm rounded-md border border-border bg-background px-3"
              >
                <option value="welcome">Welcome Email</option>
                <option value="kickoff">Kickoff Confirmation</option>
                <option value="weekly">Weekly Report</option>
                <option value="farewell">Farewell Email</option>
              </select>
            </div>
          )}
          {config.channel && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Channel:</label>
              <Input defaultValue={config.channel} className="h-9" placeholder="#channel-name" />
            </div>
          )}
          {config.pattern && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Channel pattern:</label>
              <Input defaultValue={config.pattern} className="h-9 font-mono" placeholder="#client-{name}" />
              <p className="text-[10px] text-muted-foreground">Use {"{name}"} for client name</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ConditionConfig({ config }: { config: StepConfig }) {
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
        <h4 className="text-xs font-medium text-amber-600 mb-3">CONDITION SETTINGS</h4>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">If:</label>
            <Input
              defaultValue={config.condition || (config.threshold ? `urgency > ${config.threshold}` : "")}
              className="h-9 font-mono"
              placeholder="days > 5"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <div className="flex-1 border-t border-border" />
            <span className="text-[10px] text-muted-foreground">Then continue to next step</span>
            <div className="flex-1 border-t border-border" />
          </div>
        </div>
      </div>
    </div>
  )
}
