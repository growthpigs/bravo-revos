"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useSettingsStore } from "@/stores/settings-store"
import { fetchWithCsrf } from "@/lib/csrf"
import { Bot, Sparkles, MessageSquare, Zap, BarChart3, CheckCircle2, Loader2 } from "lucide-react"
import type { TokenUsageStats } from "@/types/settings"

// Default token usage
const DEFAULT_TOKEN_USAGE: TokenUsageStats = {
  current_usage: 0,
  limit: 50000,
  percent_used: 0,
  usage_by_feature: {
    "Chat Assistant": 0,
    "Draft Replies": 0,
    "Alert Analysis": 0,
    "Document RAG": 0,
  },
  daily_usage: [],
}

// AI Features that can be toggled
const AI_FEATURES = [
  {
    id: "chat_assistant",
    name: "Chat Assistant",
    description: "Interactive AI chat for questions and tasks",
    icon: MessageSquare,
  },
  {
    id: "draft_replies",
    name: "Draft Replies",
    description: "AI-generated response drafts for emails and messages",
    icon: Sparkles,
  },
  {
    id: "alert_analysis",
    name: "Alert Analysis",
    description: "AI-powered client risk detection and suggestions",
    icon: Zap,
  },
  {
    id: "document_rag",
    name: "Document Search",
    description: "AI search across your knowledge base",
    icon: BarChart3,
  },
]

export function AIConfigurationSection() {
  const { toast } = useToast()
  const {
    tokenUsage,
    setTokenUsage,
    setHasUnsavedChanges,
  } = useSettingsStore()

  // Local form state
  const [isLoading, setIsLoading] = useState(true)
  const [assistantName, setAssistantName] = useState("Chi")
  const [responseTone, setResponseTone] = useState<"professional" | "casual" | "technical">("professional")
  const [responseLength, setResponseLength] = useState<"brief" | "detailed" | "comprehensive">("detailed")
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>(AI_FEATURES.map((f) => f.id))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load AI configuration on mount
  useEffect(() => {
    const fetchAIConfig = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/v1/settings/agency', {
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error('Failed to load settings')
        }

        const { data: agency } = await response.json()
        const config = agency.ai_config || {}

        // Populate form with fetched data
        setAssistantName(config.assistant_name || 'Chi')
        setResponseTone(config.response_tone || 'professional')
        setResponseLength(config.response_length || 'detailed')
        setEnabledFeatures(config.enabled_features || AI_FEATURES.map(f => f.id))

        // Set token usage
        setTokenUsage({
          current_usage: 0,
          limit: config.token_limit || 50000,
          usage_by_feature: {},
          daily_usage: [],
          percent_used: 0,
        })
      } catch (err) {
        console.error('[AIConfigurationSection] Error loading AI config:', err)
        setError('Failed to load AI configuration')
        setTokenUsage(DEFAULT_TOKEN_USAGE)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAIConfig()
  }, [setTokenUsage])

  const handleFeatureToggle = (featureId: string) => {
    setEnabledFeatures((prev) =>
      prev.includes(featureId) ? prev.filter((f) => f !== featureId) : [...prev, featureId]
    )
    setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetchWithCsrf('/api/v1/settings/agency', {
        method: 'PATCH',
        body: JSON.stringify({
          ai_config: {
            assistant_name: assistantName,
            response_tone: responseTone,
            response_length: responseLength,
            enabled_features: enabledFeatures,
            token_limit: tokenUsage?.limit || 50000,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save settings')
      }

      setHasUnsavedChanges(false)
      toast({
        title: "AI settings saved",
        description: "Your AI configuration has been updated.",
      })
    } catch (err) {
      console.error('[AIConfigurationSection] Error saving AI config:', err)
      const message = err instanceof Error ? err.message : 'Failed to save AI configuration'
      setError(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const usagePercent = tokenUsage?.percent_used || 0

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-secondary rounded-lg" />
        <div className="h-24 bg-secondary rounded-lg" />
        <div className="h-32 bg-secondary rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div>
        <h2 className="text-[12px] font-medium text-foreground flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5" />
          AI Configuration
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Customize AI behavior and monitor usage
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Token Usage Card */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[11px] font-medium flex items-center justify-between">
            <span>Token Usage This Month</span>
            <span className="text-[10px] font-normal text-muted-foreground">
              Resets Jan 1
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-3 pb-3">
          {/* Usage Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">
                {tokenUsage?.current_usage.toLocaleString()} / {tokenUsage?.limit.toLocaleString()} tokens
              </span>
              <span
                className={
                  usagePercent > 90
                    ? "text-red-600 dark:text-red-500 font-medium"
                    : usagePercent > 75
                      ? "text-amber-600 dark:text-amber-500"
                      : "text-emerald-600 dark:text-emerald-500"
                }
              >
                {usagePercent.toFixed(1)}% used
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  usagePercent > 90
                    ? "bg-red-500"
                    : usagePercent > 75
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Usage by Feature */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(tokenUsage?.usage_by_feature || {}).map(([feature, tokens]) => (
              <div key={feature} className="flex items-center justify-between p-1.5 rounded bg-muted/50">
                <span className="text-[10px]">{feature}</span>
                <span className="text-[10px] text-muted-foreground">{tokens.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Behavior Card */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[11px] font-medium">AI Behavior</CardTitle>
          <CardDescription className="text-[10px]">Configure how the AI assistant responds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-3 pb-3">
          {/* Assistant Name */}
          <div className="space-y-1">
            <Label htmlFor="assistant-name" className="text-[10px]">Assistant Name</Label>
            <Input
              id="assistant-name"
              value={assistantName}
              onChange={(e) => {
                setAssistantName(e.target.value)
                setHasUnsavedChanges(true)
              }}
              placeholder="Chi"
              className="bg-secondary border-border max-w-xs h-7 text-[11px]"
            />
            <p className="text-[9px] text-muted-foreground">
              The name used when the AI introduces itself
            </p>
          </div>

          {/* Response Tone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px]">Response Tone</Label>
              <Select
                value={responseTone}
                onValueChange={(value: "professional" | "casual" | "technical") => {
                  setResponseTone(value)
                  setHasUnsavedChanges(true)
                }}
              >
                <SelectTrigger className="bg-secondary border-border h-7 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional" className="text-[11px]">Professional</SelectItem>
                  <SelectItem value="casual" className="text-[11px]">Casual</SelectItem>
                  <SelectItem value="technical" className="text-[11px]">Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px]">Response Length</Label>
              <Select
                value={responseLength}
                onValueChange={(value: "brief" | "detailed" | "comprehensive") => {
                  setResponseLength(value)
                  setHasUnsavedChanges(true)
                }}
              >
                <SelectTrigger className="bg-secondary border-border h-7 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brief" className="text-[11px]">Brief</SelectItem>
                  <SelectItem value="detailed" className="text-[11px]">Detailed</SelectItem>
                  <SelectItem value="comprehensive" className="text-[11px]">Comprehensive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Features Card */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[11px] font-medium">AI Features</CardTitle>
          <CardDescription className="text-[10px]">Enable or disable specific AI capabilities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3">
          {AI_FEATURES.map((feature) => {
            const Icon = feature.icon
            const isEnabled = enabledFeatures.includes(feature.id)

            return (
              <div
                key={feature.id}
                className="flex items-center justify-between p-2.5 rounded-md bg-secondary/30 border border-border"
              >
                <div className="flex items-start gap-2">
                  <Icon className={`h-3.5 w-3.5 mt-0.5 ${isEnabled ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-[11px] font-medium">{feature.name}</p>
                    <p className="text-[9px] text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => handleFeatureToggle(feature.id)}
                  className="scale-90"
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2 pt-3 border-t border-border">
        <Button variant="outline" disabled={isSaving} className="h-7 text-[10px] bg-transparent">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="h-7 text-[10px]">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3 mr-1.5" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
