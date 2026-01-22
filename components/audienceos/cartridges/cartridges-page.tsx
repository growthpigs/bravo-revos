"use client"

import React, { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Mic,
  Palette,
  SlidersHorizontal,
  FileText,
  Building2
} from "lucide-react"
import { VoiceTab } from "./tabs/voice-tab"
import { StyleTab } from "./tabs/style-tab"
import { PreferencesTab } from "./tabs/preferences-tab"
import { InstructionsTab } from "./tabs/instructions-tab"
import { BrandTab } from "./tabs/brand-tab"
import type { CartridgeType } from "@/types/cartridges"

const tabs = [
  { id: "voice" as const, label: "Voice", icon: Mic, description: "Tone and personality" },
  { id: "style" as const, label: "Style", icon: Palette, description: "Writing style preferences" },
  { id: "preferences" as const, label: "Preferences", icon: SlidersHorizontal, description: "Content preferences" },
  { id: "instructions" as const, label: "Instructions", icon: FileText, description: "AI behavior rules" },
  { id: "brand" as const, label: "Brand", icon: Building2, description: "Brand identity + Benson" },
]

interface CartridgesPageProps {
  initialTab?: CartridgeType
}

export function CartridgesPage({ initialTab = "voice" }: CartridgesPageProps) {
  const [activeTab, setActiveTab] = useState<CartridgeType>(initialTab)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Cartridges</h2>
        <p className="text-muted-foreground">
          Configure how the AI assistant communicates on your behalf.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CartridgeType)}>
        <TabsList className="grid w-full grid-cols-5">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="voice" className="mt-6">
          <VoiceTab />
        </TabsContent>

        <TabsContent value="style" className="mt-6">
          <StyleTab />
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <PreferencesTab />
        </TabsContent>

        <TabsContent value="instructions" className="mt-6">
          <InstructionsTab />
        </TabsContent>

        <TabsContent value="brand" className="mt-6">
          <BrandTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
