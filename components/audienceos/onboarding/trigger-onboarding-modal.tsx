"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOnboardingStore } from "@/stores/onboarding-store"
import { Mail, Info, Loader2, Globe } from "lucide-react"
import { toast } from "sonner"
import { SEOPreviewCard } from "./seo-preview-card"

interface TriggerOnboardingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SEOSummary {
  total_keywords: number
  traffic_value: number
  top_10_keywords: number
  competitors_count: number
  domain_rank: number | null
  backlinks: number | null
}

interface Competitor {
  domain: string
  intersecting_keywords: number
}

export function TriggerOnboardingModal({ open, onOpenChange }: TriggerOnboardingModalProps) {
  const { triggerOnboarding, isTriggeringOnboarding } = useOnboardingStore()

  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [clientWebsite, setClientWebsite] = useState("")
  const [clientTier, setClientTier] = useState<"Core" | "Enterprise">("Core")

  // SEO enrichment state
  const [seoLoading, setSeoLoading] = useState(false)
  const [seoData, setSeoData] = useState<{ summary: SEOSummary | null; competitors: Competitor[] } | null>(null)
  const [seoError, setSeoError] = useState<string | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setClientName("")
      setClientEmail("")
      setClientWebsite("")
      setClientTier("Core")
      setSeoLoading(false)
      setSeoData(null)
      setSeoError(null)
    }
  }, [open])

  // Debounced SEO enrichment
  const fetchSEOData = useCallback(async (domain: string) => {
    if (!domain || domain.trim() === "") {
      setSeoData(null)
      setSeoError(null)
      return
    }

    setSeoLoading(true)
    setSeoError(null)

    try {
      const response = await fetch("/api/v1/seo/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain })
      })

      if (!response.ok) {
        const error = await response.json()
        setSeoError(error.error || "Failed to fetch SEO data")
        setSeoData(null)
        return
      }

      const result = await response.json()
      if (result.success && result.summary) {
        setSeoData({
          summary: result.summary,
          competitors: result.competitors || []
        })
        setSeoError(null)
      } else {
        setSeoData(null)
        setSeoError(result.error || "Unable to retrieve SEO data for this domain")
      }
    } catch (error) {
      setSeoError("Failed to fetch SEO data")
      setSeoData(null)
      console.error("SEO enrichment error:", error)
    } finally {
      setSeoLoading(false)
    }
  }, [])

  // Debounced website URL handler (500ms debounce)
  const handleWebsiteChange = useCallback((url: string) => {
    setClientWebsite(url)

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchSEOData(url)
    }, 500)
  }, [fetchSEOData])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientName.trim() || !clientEmail.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    const onboardingData = {
      client_name: clientName,
      client_email: clientEmail,
      client_tier: clientTier,
      website_url: clientWebsite || undefined,
      ...(seoData?.summary && {
        seo_data: {
          ...seoData,
          fetched_at: new Date().toISOString(),
        },
      }),
    }

    const instance = await triggerOnboarding(onboardingData)

    if (instance) {
      // Check if email was actually sent (instance includes email_sent flag)
      const emailSent = instance?.email_sent === true

      if (emailSent) {
        toast.success("Onboarding link sent!", {
          description: `An onboarding email has been sent to ${clientEmail}${seoData?.summary ? " with SEO data" : ""}`,
        })
      } else {
        // Email failed to send, but instance was created
        toast.warning("Onboarding created, but email failed", {
          description: `The onboarding link was created successfully, but we couldn't send an email to ${clientEmail}. You can copy the link manually from the Active Onboardings tab.`,
          duration: 5000,
        })
      }
      onOpenChange(false)
    } else {
      toast.error("Failed to trigger onboarding")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trigger Onboarding</DialogTitle>
          <DialogDescription>
            Start the onboarding process for a new client
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              placeholder="Acme Corporation"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientEmail">Primary Contact Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="clientEmail"
                type="email"
                placeholder="contact@acme.com"
                className="pl-10"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientWebsite">
              Website URL <span className="text-muted-foreground">(optional - for SEO enrichment)</span>
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="clientWebsite"
                type="text"
                placeholder="acme.com"
                className="pl-10"
                value={clientWebsite}
                onChange={(e) => handleWebsiteChange(e.target.value)}
              />
            </div>
          </div>

          {/* SEO Preview Card */}
          {(seoLoading || seoData || seoError) && (
            <SEOPreviewCard
              loading={seoLoading}
              domain={clientWebsite}
              summary={seoData?.summary || null}
              competitors={seoData?.competitors || []}
              error={seoError || undefined}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="clientTier">Client Tier</Label>
            <Select value={clientTier} onValueChange={(v) => setClientTier(v as "Core" | "Enterprise")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Core">Core</SelectItem>
                <SelectItem value="Enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">What happens next?</p>
                <p className="text-muted-foreground mt-1">
                  The client will receive an email with a link to complete their onboarding form.
                  You can track their progress in the Active Onboardings tab.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isTriggeringOnboarding}>
              {isTriggeringOnboarding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Onboarding Link"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
