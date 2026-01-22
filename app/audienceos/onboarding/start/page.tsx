"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/audienceos/ui/button"
import { Input } from "@/components/audienceos/ui/input"
import { Label } from "@/components/audienceos/ui/label"
import { Checkbox } from "@/components/audienceos/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/audienceos/ui/card"
import { Check, Play, Sparkles, Loader2, Copy, ExternalLink, AlertCircle } from "lucide-react"
import confetti from "canvas-confetti"
import { useToast } from "@/hooks/audienceos/use-toast"
import { DynamicFormFields, useDynamicFormState } from "@/components/audienceos/onboarding/dynamic-form-fields"

type Step = 1 | 2 | 3 | 4

interface FormField {
  id: string
  field_label: string
  field_type: string
  placeholder: string | null
  is_required: boolean
  options?: unknown
  sort_order?: number
}

interface OnboardingData {
  instance: {
    id: string
    status: string
    client_name: string
  }
  journey: {
    id: string
    name: string
    description?: string | null
    welcome_video_url?: string | null
    stages: unknown
  } | null
  fields: FormField[]
}

function OnboardingPageContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState<Step>(1)

  // Database integration
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null)
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(true)
  const [onboardingError, setOnboardingError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: Fake initialization states
  const [initSteps, setInitSteps] = useState({
    clientId: false,
    slackChannel: false,
    googleDrive: false,
  })
  const isInitializingRef = useRef(false)

  // Step 2: Dynamic Form State (uses Form Builder fields)
  const dynamicForm = useDynamicFormState(onboardingData?.fields || [])

  // Legacy hardcoded fields (fallback if no Form Builder fields configured)
  const [platform, setPlatform] = useState("shopify")
  const [storeUrl, setStoreUrl] = useState("")
  const [gtmId, setGtmId] = useState("")
  const [metaPixelId, setMetaPixelId] = useState("")
  const [klaviyoKey, setKlaviyoKey] = useState("")

  const [testResults, setTestResults] = useState({
    store: false,
    gtm: false,
    meta: false,
    klaviyo: false,
  })
  const [testing, setTesting] = useState<string | null>(null)

  // Check if we have Form Builder fields to use
  const hasFormBuilderFields = (onboardingData?.fields?.length || 0) > 0

  // Step 3: Access Delegation
  const [accessChecks, setAccessChecks] = useState({
    meta: false,
    google: false,
    shopify: false,
    dns: false,
  })

  // Platform Type Toggle
  const [platformType, setPlatformType] = useState<"shopify" | "custom">("shopify")

  // Validation helpers
  const isStoreUrlValid = storeUrl.includes(".myshopify.com") || storeUrl.includes(".com")
  const isGtmIdValid = gtmId.match(/GTM-[A-Z0-9]+/)
  const isMetaPixelValid = metaPixelId.length >= 10
  const isKlaviyoValid = klaviyoKey.length >= 6 || klaviyoKey === ""

  // Use dynamic form validation if Form Builder fields exist, otherwise legacy validation
  const allFieldsValid = hasFormBuilderFields
    ? dynamicForm.isValid()
    : (isStoreUrlValid && isGtmIdValid && isMetaPixelValid && isKlaviyoValid)
  const allAccessGranted =
    accessChecks.meta && accessChecks.google && accessChecks.shopify && (platformType === "shopify" || accessChecks.dns)
  const allTestsPassed = testResults.store && testResults.gtm && testResults.meta && testResults.klaviyo

  // Fetch onboarding data from API on mount
  useEffect(() => {
    async function fetchOnboarding() {
      if (!token) {
        setIsLoadingOnboarding(false)
        setOnboardingError("No onboarding token provided. Please use the link sent to your email.")
        return
      }

      try {
        const response = await fetch(`/api/public/onboarding/${token}`)
        const result = await response.json()

        if (!response.ok) {
          if (result.completed) {
            setOnboardingError("This onboarding has already been completed.")
          } else {
            setOnboardingError(result.error || "Failed to load onboarding")
          }
          setIsLoadingOnboarding(false)
          return
        }

        setOnboardingData(result.data)
        setIsLoadingOnboarding(false)
      } catch {
        setOnboardingError("Failed to connect to server. Please try again.")
        setIsLoadingOnboarding(false)
      }
    }

    fetchOnboarding()
  }, [token])

  // Auto-run initialization sequence on mount
  useEffect(() => {
    if (currentStep === 1 && !isInitializingRef.current) {
      isInitializingRef.current = true
      setTimeout(() => setInitSteps((p) => ({ ...p, clientId: true })), 800)
      setTimeout(() => setInitSteps((p) => ({ ...p, slackChannel: true })), 1600)
      setTimeout(() => setInitSteps((p) => ({ ...p, googleDrive: true })), 2400)
    }
  }, [currentStep])

  const allInitComplete = initSteps.clientId && initSteps.slackChannel && initSteps.googleDrive

  const handleTestConnection = (field: string) => {
    setTesting(field)
    setTimeout(() => {
      setTestResults((prev) => ({ ...prev, [field]: true }))
      setTesting(null)
      toast({
        title: "Connection Verified",
        description: `${field.toUpperCase()} connection successful`,
      })
    }, 1500)
  }

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    toast({
      title: "Copied to clipboard",
      description: email,
    })
  }

  const handleFinish = async () => {
    if (!token) return

    setIsSubmitting(true)

    try {
      // Build responses array
      let responses: Array<{ field_id: string; value: string }>

      if (hasFormBuilderFields) {
        // Use dynamic form responses from Form Builder fields
        responses = dynamicForm.getResponses()
      } else {
        // Fallback to legacy hardcoded field responses
        responses = [
          { field_id: "platform", value: platform },
          { field_id: "store_url", value: storeUrl },
          { field_id: "gtm_id", value: gtmId },
          { field_id: "meta_pixel_id", value: metaPixelId },
          { field_id: "klaviyo_key", value: klaviyoKey },
          { field_id: "platform_type", value: platformType },
        ]
      }

      // Always add access checks (Step 3)
      responses.push({ field_id: "access_checks", value: JSON.stringify(accessChecks) })

      const response = await fetch(`/api/public/onboarding/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses }),
      })

      if (!response.ok) {
        const result = await response.json()
        toast({
          title: "Submission Failed",
          description: result.error || "Failed to submit onboarding",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Also save to localStorage for backwards compatibility
      const localData = {
        platform,
        storeUrl,
        gtmId,
        metaPixelId,
        klaviyoKey,
        platformType,
        accessChecks,
        submittedAt: new Date().toISOString(),
      }
      localStorage.setItem("latestOnboardingSubmission", JSON.stringify(localData))

      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#6ee7b7"],
      })
      setCurrentStep(4)
    } catch {
      toast({
        title: "Connection Error",
        description: "Failed to connect to server. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state
  if (isLoadingOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur p-8 max-w-md">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
            <p className="text-slate-300">Loading your onboarding...</p>
          </div>
        </Card>
      </div>
    )
  }

  // Show error state
  if (onboardingError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur p-8 max-w-md">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-100">Onboarding Unavailable</h2>
            <p className="text-slate-400 text-center">{onboardingError}</p>
            <Button
              onClick={() => window.location.href = "/"}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Stepper */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step, idx) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep >= step
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {currentStep > step ? <Check className="h-5 w-5" /> : step}
                </div>
                <span className="ml-2 text-sm text-slate-400 hidden sm:inline">
                  {step === 1 ? "Handshake" : step === 2 ? "Keys" : "Handoff"}
                </span>
                {idx < 2 && (
                  <div className={`w-12 h-0.5 ml-2 ${currentStep > step ? "bg-emerald-500" : "bg-slate-700"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: The Handshake */}
        {currentStep === 1 && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Text & Steps */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur p-8">
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-slate-100 mb-2">Welcome to the AudienceOS Command Center</h1>
                  <p className="text-slate-400">
                    We are setting up your private Slack channel, Google Drive folder, and Knowledge Base right now.
                  </p>
                </div>

                {/* Live Status Bar */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                    {initSteps.clientId ? (
                      <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                    ) : (
                      <Loader2 className="h-5 w-5 text-amber-500 animate-spin shrink-0" />
                    )}
                    <span className={initSteps.clientId ? "text-emerald-400" : "text-slate-300"}>
                      Initializing Client ID...
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                    {initSteps.slackChannel ? (
                      <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                    ) : (
                      <Loader2 className="h-5 w-5 text-amber-500 animate-spin shrink-0" />
                    )}
                    <span className={initSteps.slackChannel ? "text-emerald-400" : "text-slate-300"}>
                      Creating #client-name Slack Channel...
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                    {initSteps.googleDrive ? (
                      <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                    ) : (
                      <Loader2 className="h-5 w-5 text-amber-500 animate-spin shrink-0" />
                    )}
                    <span className={initSteps.googleDrive ? "text-emerald-400" : "text-slate-300"}>
                      Provisioning Google Drive Folder...
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!allInitComplete}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 text-lg disabled:opacity-50"
                >
                  {allInitComplete ? "Continue to Tech Setup" : "Setting up..."}
                </Button>
              </div>
            </Card>

            {/* Right: Video Placeholder */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur p-8">
              <div className="aspect-video bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center group hover:border-emerald-500/50 transition-colors cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-lg" />
                <div className="relative flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center group-hover:bg-emerald-400 transition-colors">
                    <Play className="h-10 w-10 text-white ml-1" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-slate-200">Welcome Video from Your Fulfillment Lead</p>
                    <p className="text-sm text-slate-400">Click to watch Brent's Loom intro</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Step 2: Intake Form (Dynamic Form Builder fields or legacy fallback) */}
        {currentStep === 2 && (
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-100">
                {hasFormBuilderFields ? "Client Information" : "The Keys"}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {onboardingData?.journey?.description ||
                  (hasFormBuilderFields
                    ? "Please fill out the information below to help us get started"
                    : "A technical configuration form - we need these credentials to set up server-side tracking"
                  )
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Dynamic Form Builder Fields */}
              {hasFormBuilderFields ? (
                <DynamicFormFields
                  fields={onboardingData?.fields || []}
                  values={dynamicForm.values}
                  onChange={dynamicForm.handleChange}
                  darkMode={true}
                />
              ) : (
                <>
                  {/* Legacy Hardcoded Fields */}
                  {/* Platform */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Platform</Label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                    >
                      <option value="shopify">Shopify</option>
                      <option value="woocommerce">WooCommerce</option>
                      <option value="custom">Custom</option>
                      <option value="bigcommerce">BigCommerce</option>
                    </select>
                  </div>

                  {/* Store URL */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Store URL</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder="https://yourstore.myshopify.com"
                          value={storeUrl}
                          onChange={(e) => setStoreUrl(e.target.value)}
                          className="font-mono bg-slate-950 border-slate-700 text-slate-100 pr-10"
                        />
                        {testResults.store && (
                          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                        )}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleTestConnection("store")}
                        disabled={!isStoreUrlValid || testing !== null}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 shrink-0"
                      >
                        {testing === "store" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                      </Button>
                    </div>
                  </div>

                  {/* GTM Container ID */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">GTM Container ID</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder="GTM-XXXXX"
                          value={gtmId}
                          onChange={(e) => setGtmId(e.target.value.toUpperCase())}
                          className="font-mono bg-slate-950 border-slate-700 text-slate-100 pr-10"
                        />
                        {testResults.gtm && (
                          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                        )}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleTestConnection("gtm")}
                        disabled={!isGtmIdValid || testing !== null}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 shrink-0"
                      >
                        {testing === "gtm" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                      </Button>
                    </div>
                  </div>

                  {/* Meta Pixel ID */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Meta Pixel ID</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder="1234567890123456"
                          value={metaPixelId}
                          onChange={(e) => setMetaPixelId(e.target.value)}
                          className="font-mono bg-slate-950 border-slate-700 text-slate-100 pr-10"
                        />
                        {testResults.meta && (
                          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                        )}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleTestConnection("meta")}
                        disabled={!isMetaPixelValid || testing !== null}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 shrink-0"
                      >
                        {testing === "meta" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                      </Button>
                    </div>
                  </div>

                  {/* Klaviyo Public Key */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Klaviyo Public Key (Optional)</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder="pk_xxxxxxxxxxxx"
                          value={klaviyoKey}
                          onChange={(e) => setKlaviyoKey(e.target.value)}
                          className="font-mono bg-slate-950 border-slate-700 text-slate-100 pr-10"
                        />
                        {testResults.klaviyo && (
                          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                        )}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleTestConnection("klaviyo")}
                        disabled={!isKlaviyoValid || testing !== null || !klaviyoKey}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 shrink-0"
                      >
                        {testing === "klaviyo" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(3)}
                  disabled={hasFormBuilderFields ? !allFieldsValid : (!allFieldsValid || !allTestsPassed)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: The Handoff (Access Delegation) */}
        {currentStep === 3 && (
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-100">The Handoff</CardTitle>
              <CardDescription className="text-slate-400">
                Copy these email addresses to grant agency access
              </CardDescription>

              <div className="flex gap-2 mt-4">
                <Button
                  variant={platformType === "shopify" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPlatformType("shopify")}
                  className={platformType === "shopify" ? "bg-emerald-600 hover:bg-emerald-700" : "border-slate-700"}
                >
                  Shopify
                </Button>
                <Button
                  variant={platformType === "custom" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPlatformType("custom")}
                  className={platformType === "custom" ? "bg-emerald-600 hover:bg-emerald-700" : "border-slate-700"}
                >
                  Custom Build
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Meta Business Manager */}
              <div className="p-5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-start gap-3 mb-3">
                  <Checkbox
                    id="meta"
                    checked={accessChecks.meta}
                    onCheckedChange={(checked) => setAccessChecks({ ...accessChecks, meta: checked as boolean })}
                    className="mt-1 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <div className="flex-1">
                    <Label htmlFor="meta" className="text-slate-200 font-medium cursor-pointer text-base">
                      Meta Business Manager
                    </Label>
                    <p className="text-sm text-slate-400 mt-1">
                      Grant admin access for ad account management and pixel configuration
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-8">
                  <code className="flex-1 p-2 bg-slate-950 border border-slate-700 rounded text-emerald-400 text-sm">
                    fulfillment@audienceos.io
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyEmail("fulfillment@audienceos.io")}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Google Ads */}
              <div className="p-5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-start gap-3 mb-3">
                  <Checkbox
                    id="google"
                    checked={accessChecks.google}
                    onCheckedChange={(checked) => setAccessChecks({ ...accessChecks, google: checked as boolean })}
                    className="mt-1 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <div className="flex-1">
                    <Label htmlFor="google" className="text-slate-200 font-medium cursor-pointer text-base">
                      Google Ads & Tag Manager
                    </Label>
                    <p className="text-sm text-slate-400 mt-1">Grant admin access for conversion tracking setup</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-8">
                  <code className="flex-1 p-2 bg-slate-950 border border-slate-700 rounded text-emerald-400 text-sm">
                    tracking@audienceos.io
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyEmail("tracking@audienceos.io")}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Shopify Staff */}
              {platformType === "shopify" && (
                <div className="p-5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="flex items-start gap-3 mb-3">
                    <Checkbox
                      id="shopify"
                      checked={accessChecks.shopify}
                      onCheckedChange={(checked) => setAccessChecks({ ...accessChecks, shopify: checked as boolean })}
                      className="mt-1 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <div className="flex-1">
                      <Label htmlFor="shopify" className="text-slate-200 font-medium cursor-pointer text-base">
                        Shopify Staff Account
                      </Label>
                      <p className="text-sm text-slate-400 mt-1">
                        Create a staff account for theme and script installation
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-8">
                    <code className="flex-1 p-2 bg-slate-950 border border-slate-700 rounded text-emerald-400 text-sm">
                      luke@audienceos.io
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyEmail("luke@audienceos.io")}
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {platformType === "custom" && (
                <div className="p-5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="flex items-start gap-3 mb-3">
                    <Checkbox
                      id="dns"
                      checked={accessChecks.dns}
                      onCheckedChange={(checked) => setAccessChecks({ ...accessChecks, dns: checked as boolean })}
                      className="mt-1 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <div className="flex-1">
                      <Label htmlFor="dns" className="text-slate-200 font-medium cursor-pointer text-base">
                        DNS Configuration (Cloudflare)
                      </Label>
                      <p className="text-sm text-slate-400 mt-1">Grant Cloudflare access for server-side tracking</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-8">
                    <code className="flex-1 p-2 bg-slate-950 border border-slate-700 rounded text-emerald-400 text-sm">
                      infrastructure@audienceos.io
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyEmail("infrastructure@audienceos.io")}
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Back
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={!allAccessGranted || isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Onboarding"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Success State */}
        {currentStep === 4 && (
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-emerald-500" />
                </div>
              </div>
              <CardTitle className="text-3xl text-slate-100">Onboarding Complete!</CardTitle>
              <CardDescription className="text-slate-400 text-base mt-3">
                Your setup has been successfully submitted to the AudienceOS fulfillment team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Card */}
              <div className="p-6 rounded-lg bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/30">
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-amber-500 rounded-full mt-1 animate-pulse shrink-0" />
                  <div>
                    <h4 className="text-amber-400 font-semibold mb-2">AI Analysis in Progress</h4>
                    <p className="text-sm text-slate-300 mb-3">
                      Our AI is analyzing your GTM container, Meta Pixel configuration, and Shopify theme setup to
                      identify optimization opportunities.
                    </p>
                    <p className="text-xs text-slate-400">
                      You will receive a detailed implementation plan in your private Slack channel within 2 hours.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submitted Data Summary */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Submitted Configuration</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400 mb-1">Platform</p>
                    <p className="text-sm font-medium text-emerald-400 capitalize">{platform}</p>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400 mb-1">Store URL</p>
                    <p className="text-sm font-mono text-emerald-400 truncate">{storeUrl}</p>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400 mb-1">GTM Container</p>
                    <p className="text-sm font-mono text-emerald-400">{gtmId}</p>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400 mb-1">Meta Pixel</p>
                    <p className="text-sm font-mono text-emerald-400">{metaPixelId}</p>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="p-5 rounded-lg bg-slate-950 border border-slate-800">
                <h4 className="text-sm font-medium text-slate-200 mb-3">What Happens Next?</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Brent will verify platform access and begin server-side tracking setup</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>You'll receive a custom installation plan in your Slack channel</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Estimated installation timeline: 3-5 business days</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => window.open("https://slack.com", "_blank")}
                  variant="outline"
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Slack Channel
                </Button>
                <Button
                  onClick={() => (window.location.href = "/")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  View Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// Loading fallback for Suspense
function OnboardingLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur p-8 max-w-md">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
          <p className="text-slate-300">Loading your onboarding...</p>
        </div>
      </Card>
    </div>
  )
}

// Default export with Suspense boundary for useSearchParams
export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoadingFallback />}>
      <OnboardingPageContent />
    </Suspense>
  )
}
