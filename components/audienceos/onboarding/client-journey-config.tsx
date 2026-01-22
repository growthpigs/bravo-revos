"use client"

import { useEffect, useState } from "react"
import { useOnboardingStore } from "@/stores/onboarding-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Video, Sparkles, Loader2, Save, FileText } from "lucide-react"
import { toast } from "sonner"

export function ClientJourneyConfig() {
  const { journeys, selectedJourneyId, saveJourney, isSavingJourney, fetchJourneys } = useOnboardingStore()

  const selectedJourney = journeys.find((j) => j.id === selectedJourneyId)

  const [welcomeVideoUrl, setWelcomeVideoUrl] = useState("")
  const [formIntroText, setFormIntroText] = useState("")
  const [aiAnalysisPrompt, setAiAnalysisPrompt] = useState("")

  // Load selected journey data
  useEffect(() => {
    fetchJourneys()
  }, [fetchJourneys])

  useEffect(() => {
    if (selectedJourney) {
      setWelcomeVideoUrl(selectedJourney.welcome_video_url || "")
      setFormIntroText(selectedJourney.description || "")
      setAiAnalysisPrompt(selectedJourney.ai_analysis_prompt || "")
    }
  }, [selectedJourney])

  const handleSave = async () => {
    if (!selectedJourneyId) {
      toast.error("No journey selected")
      return
    }

    await saveJourney({
      welcome_video_url: welcomeVideoUrl || null,
      description: formIntroText || null,
      ai_analysis_prompt: aiAnalysisPrompt || null,
    })

    toast.success("Journey configuration saved")
  }

  // Example AI analysis output preview
  const exampleOutput = `Based on the client's intake data:

**Tracking Status:** Meta Pixel detected, but not firing on all key pages
**Event Match Quality:** 7.2/10 - Good baseline, room for improvement
**Recommendations:**
1. Add Purchase event to thank-you page
2. Configure CAPI for server-side tracking
3. Set up value-based optimization with revenue data`

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Welcome Video Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Welcome Video</CardTitle>
          </div>
          <CardDescription>
            Set the welcome video that new clients will see at the start of their onboarding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="videoUrl">Video URL</Label>
            <Input
              id="videoUrl"
              placeholder="https://vimeo.com/... or https://youtube.com/..."
              value={welcomeVideoUrl}
              onChange={(e) => setWelcomeVideoUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Supports Vimeo and YouTube URLs
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form Introduction Text */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Form Introduction</CardTitle>
          </div>
          <CardDescription>
            Optional intro text displayed above the intake form fields
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="formIntro">Introduction Text</Label>
            <Textarea
              id="formIntro"
              placeholder="Welcome! Please fill out this short form to help us get started with your account setup..."
              value={formIntroText}
              onChange={(e) => setFormIntroText(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to show no introduction. Supports up to 500 characters.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">AI Analysis Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure the AI prompt template used to analyze client intake data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="aiPrompt">Prompt Template</Label>
            <Textarea
              id="aiPrompt"
              placeholder="Analyze this client's tracking data and provide insights on..."
              value={aiAnalysisPrompt}
              onChange={(e) => setAiAnalysisPrompt(e.target.value)}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              This prompt will be used with the client&apos;s intake form data to generate insights
            </p>
          </div>

          {/* AI Analysis Preview */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Example Output Preview</span>
            </div>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
              {exampleOutput}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSavingJourney}>
          {isSavingJourney ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
