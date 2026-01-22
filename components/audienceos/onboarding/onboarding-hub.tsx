"use client"

import { useState } from "react"
import { useOnboardingStore } from "@/stores/onboarding-store"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ActiveOnboardings } from "./active-onboardings"
import { ClientJourneyConfig } from "./client-journey-config"
import { FormBuilder } from "./form-builder"
import { TriggerOnboardingModal } from "./trigger-onboarding-modal"
import { Plus, Link, ExternalLink, Users, Settings, FileText } from "lucide-react"
import { toast } from "sonner"

interface OnboardingHubProps {
  onClientClick?: (clientId: string) => void
}

export function OnboardingHub({ onClientClick }: OnboardingHubProps) {
  const { activeTab, setActiveTab, selectedInstance } = useOnboardingStore()
  const [showTriggerModal, setShowTriggerModal] = useState(false)

  const handleCopyPortalLink = async () => {
    if (selectedInstance?.portal_url) {
      // Guard: Check if clipboard API is available (HTTPS, supported browser)
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
          await navigator.clipboard.writeText(selectedInstance.portal_url)
          toast.success("Portal link copied to clipboard")
        } catch {
          toast.error("Failed to copy to clipboard")
        }
      } else {
        toast.error("Clipboard not available (requires HTTPS)")
      }
    } else {
      toast.error("Select an onboarding first")
    }
  }

  const handleViewAsClient = () => {
    if (selectedInstance?.portal_url) {
      // Security: Validate URL starts with https:// to prevent javascript: injection
      const url = selectedInstance.portal_url
      if (url.startsWith("https://") || url.startsWith("http://")) {
        window.open(url, "_blank", "noopener,noreferrer")
      } else {
        toast.error("Invalid portal URL")
      }
    } else {
      toast.error("Select an onboarding first")
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Onboarding & Intake Hub</h1>
          <p className="text-muted-foreground mt-1">
            Manage client onboarding pipeline and intake forms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyPortalLink}>
            <Link className="mr-2 h-4 w-4" />
            Copy Portal Link
          </Button>
          <Button variant="outline" size="sm" onClick={handleViewAsClient}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View as Client
          </Button>
          <Button size="sm" onClick={() => setShowTriggerModal(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Trigger Onboarding
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "active" | "journey" | "form-builder")}
      >
        <TabsList className="w-fit">
          <TabsTrigger value="active" className="gap-2">
            <Users className="h-4 w-4" />
            Active Onboardings
          </TabsTrigger>
          <TabsTrigger value="journey" className="gap-2">
            <Settings className="h-4 w-4" />
            Client Journey
          </TabsTrigger>
          <TabsTrigger value="form-builder" className="gap-2">
            <FileText className="h-4 w-4" />
            Form Builder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6 pb-[150px]">
          <ActiveOnboardings onClientClick={onClientClick} />
        </TabsContent>

        <TabsContent value="journey" className="mt-6 pb-[150px]">
          <ClientJourneyConfig />
        </TabsContent>

        <TabsContent value="form-builder" className="mt-6 pb-[150px]">
          <FormBuilder />
        </TabsContent>
      </Tabs>

      {/* Trigger Onboarding Modal */}
      <TriggerOnboardingModal
        open={showTriggerModal}
        onOpenChange={setShowTriggerModal}
      />
    </div>
  )
}
