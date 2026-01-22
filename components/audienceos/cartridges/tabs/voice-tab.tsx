"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Mic, Plus, X, Settings, Check, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { fetchWithCsrf } from "@/lib/csrf"
import { type VoiceCartridge, type VoiceParams, getDefaultVoiceParams } from "@/types/cartridges"

export function VoiceTab() {
  const { toast } = useToast()
  const [voiceCartridges, setVoiceCartridges] = useState<VoiceCartridge[]>([])
  const [_editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    systemInstructions: "",
  })
  const [voiceParams, setVoiceParams] = useState<VoiceParams>(getDefaultVoiceParams())
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const updateVoiceParams = (updates: Partial<VoiceParams>) => {
    setVoiceParams((prev) => ({
      ...prev,
      ...updates,
    }))
  }

  const addTrait = (trait: string) => {
    if (!trait.trim()) return
    setVoiceParams((prev) => ({
      ...prev,
      personality: {
        ...prev.personality,
        traits: [...prev.personality.traits, trait],
      },
    }))
  }

  const removeTrait = (index: number) => {
    setVoiceParams((prev) => ({
      ...prev,
      personality: {
        ...prev.personality,
        traits: prev.personality.traits.filter((_, i) => i !== index),
      },
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Cartridge name is required",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetchWithCsrf("/api/v1/cartridges/voice", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          displayName: formData.displayName,
          systemInstructions: formData.systemInstructions,
          voiceParams,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save voice cartridge")
      }

      const newCartridge = await response.json()
      setVoiceCartridges((prev) => [...prev, newCartridge])

      toast({
        title: "Voice Cartridge Created",
        description: `"${formData.displayName || formData.name}" has been created successfully`,
      })

      setIsCreating(false)
      setFormData({ name: "", displayName: "", systemInstructions: "" })
      setVoiceParams(getDefaultVoiceParams())
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save voice cartridge"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Existing Cartridges */}
      {voiceCartridges.length === 0 && !isCreating ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mic className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Voice Cartridges</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create custom voice personalities for different campaigns and contexts.
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Voice Cartridge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cartridge Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {voiceCartridges.map((cartridge) => (
              <Card key={cartridge.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    {cartridge.displayName || cartridge.name}
                  </CardTitle>
                  <CardDescription>{cartridge.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Badge variant={cartridge.isActive ? "default" : "secondary"}>
                      {cartridge.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {cartridge.systemInstructions || "No instructions configured"}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(cartridge.id)}
                    >
                      <Settings className="mr-2 h-3 w-3" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center py-12">
                <Button variant="ghost" onClick={() => setIsCreating(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Voice
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Create/Edit Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create Voice Cartridge</CardTitle>
            <CardDescription>
              Define the tone, style, and personality for AI-generated content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Cartridge Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., professional-linkedin"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="e.g., Professional LinkedIn Voice"
                  value={formData.displayName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">System Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="Describe how this voice should communicate..."
                value={formData.systemInstructions}
                onChange={(e) => setFormData((prev) => ({ ...prev, systemInstructions: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>

            {/* Voice Parameters */}
            <Accordion type="single" collapsible className="w-full">
              {/* Tone Section */}
              <AccordionItem value="tone">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span>Tone & Attitude</span>
                    <Badge variant="outline" className="text-xs">
                      {voiceParams.tone.formality}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Formality Level</Label>
                    <Select
                      value={voiceParams.tone.formality}
                      onValueChange={(value: "professional" | "casual" | "friendly") =>
                        updateVoiceParams({ tone: { ...voiceParams.tone, formality: value } })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Enthusiasm Level</Label>
                      <span className="text-sm text-muted-foreground">{voiceParams.tone.enthusiasm}/10</span>
                    </div>
                    <Slider
                      value={[voiceParams.tone.enthusiasm]}
                      onValueChange={(values: number[]) =>
                        updateVoiceParams({ tone: { ...voiceParams.tone, enthusiasm: values[0] } })
                      }
                      min={0}
                      max={10}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Empathy Level</Label>
                      <span className="text-sm text-muted-foreground">{voiceParams.tone.empathy}/10</span>
                    </div>
                    <Slider
                      value={[voiceParams.tone.empathy]}
                      onValueChange={(values: number[]) =>
                        updateVoiceParams({ tone: { ...voiceParams.tone, empathy: values[0] } })
                      }
                      min={0}
                      max={10}
                      step={1}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Style Section */}
              <AccordionItem value="style">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span>Writing Style</span>
                    <Badge variant="outline" className="text-xs">
                      {voiceParams.style.sentenceLength}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Sentence Length</Label>
                    <Select
                      value={voiceParams.style.sentenceLength}
                      onValueChange={(value: "short" | "medium" | "long") =>
                        updateVoiceParams({ style: { ...voiceParams.style, sentenceLength: value } })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short (Punchy)</SelectItem>
                        <SelectItem value="medium">Medium (Balanced)</SelectItem>
                        <SelectItem value="long">Long (Detailed)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Paragraph Structure</Label>
                    <Select
                      value={voiceParams.style.paragraphStructure}
                      onValueChange={(value: "single" | "multi") =>
                        updateVoiceParams({ style: { ...voiceParams.style, paragraphStructure: value } })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single sentence paragraphs</SelectItem>
                        <SelectItem value="multi">Multi-sentence paragraphs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="emojis">Use Emojis</Label>
                    <Switch
                      id="emojis"
                      checked={voiceParams.style.useEmojis}
                      onCheckedChange={(checked) =>
                        updateVoiceParams({ style: { ...voiceParams.style, useEmojis: checked } })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="hashtags">Use Hashtags</Label>
                    <Switch
                      id="hashtags"
                      checked={voiceParams.style.useHashtags}
                      onCheckedChange={(checked) =>
                        updateVoiceParams({ style: { ...voiceParams.style, useHashtags: checked } })
                      }
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Personality Section */}
              <AccordionItem value="personality">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span>Personality</span>
                    <Badge variant="outline" className="text-xs">
                      {voiceParams.personality.traits.length} traits
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Voice Description</Label>
                    <Textarea
                      placeholder="Describe the personality in one or two sentences..."
                      value={voiceParams.personality.voiceDescription}
                      onChange={(e) =>
                        updateVoiceParams({
                          personality: { ...voiceParams.personality, voiceDescription: e.target.value },
                        })
                      }
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Personality Traits</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {voiceParams.personality.traits.map((trait, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {trait}
                          <button
                            type="button"
                            onClick={() => removeTrait(i)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Input
                      placeholder="Add a trait (e.g., 'confident', 'warm')"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addTrait(e.currentTarget.value)
                          e.currentTarget.value = ""
                        }
                      }}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Vocabulary Section */}
              <AccordionItem value="vocabulary">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span>Vocabulary</span>
                    <Badge variant="outline" className="text-xs">
                      {voiceParams.vocabulary.complexity}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Complexity Level</Label>
                    <Select
                      value={voiceParams.vocabulary.complexity}
                      onValueChange={(value: "simple" | "moderate" | "advanced") =>
                        updateVoiceParams({ vocabulary: { ...voiceParams.vocabulary, complexity: value } })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple (Everyday language)</SelectItem>
                        <SelectItem value="moderate">Moderate (Professional)</SelectItem>
                        <SelectItem value="advanced">Advanced (Specialized)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Cartridge
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false)
                  setFormData({ name: "", displayName: "", systemInstructions: "" })
                  setVoiceParams(getDefaultVoiceParams())
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
