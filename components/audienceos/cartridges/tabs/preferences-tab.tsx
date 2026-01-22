"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Check, Edit, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { fetchWithCsrf } from "@/lib/csrf"
import { type PreferencesCartridge, getDefaultPreferences } from "@/types/cartridges"

export function PreferencesTab() {
  const { toast } = useToast()
  const [preferencesCartridge, setPreferencesCartridge] = useState<PreferencesCartridge | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(getDefaultPreferences())
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetchWithCsrf("/api/v1/cartridges/preferences", {
        method: "POST",
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save preferences")
      }

      const savedPreferences = await response.json()
      setPreferencesCartridge(savedPreferences)

      toast({
        title: "Preferences Saved",
        description: "Your content preferences have been updated successfully",
      })

      setIsEditing(false)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save preferences"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetchWithCsrf("/api/v1/cartridges/preferences", {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete preferences")
      }

      setPreferencesCartridge(null)
      setFormData(getDefaultPreferences())
      setShowDeleteModal(false)

      toast({
        title: "Preferences Deleted",
        description: "Your preferences cartridge has been deleted",
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete preferences"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const updateFormData = <K extends keyof typeof formData>(
    key: K,
    value: typeof formData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Preferences</CardTitle>
        <CardDescription>
          Configure default settings for AI-generated content
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing || !preferencesCartridge ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Language */}
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => updateFormData("language", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                    <SelectItem value="Portuguese">Portuguese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Platform */}
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) => updateFormData("platform", value as PreferencesCartridge["platform"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem value="Twitter">Twitter</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tone */}
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select
                  value={formData.tone}
                  onValueChange={(value) => updateFormData("tone", value as PreferencesCartridge["tone"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Professional">Professional</SelectItem>
                    <SelectItem value="Casual">Casual</SelectItem>
                    <SelectItem value="Friendly">Friendly</SelectItem>
                    <SelectItem value="Formal">Formal</SelectItem>
                    <SelectItem value="Humorous">Humorous</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Content Length */}
              <div className="space-y-2">
                <Label>Content Length</Label>
                <Select
                  value={formData.contentLength}
                  onValueChange={(value) => updateFormData("contentLength", value as PreferencesCartridge["contentLength"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Short">Short (50-100 words)</SelectItem>
                    <SelectItem value="Medium">Medium (100-200 words)</SelectItem>
                    <SelectItem value="Long">Long (200-300 words)</SelectItem>
                    <SelectItem value="Very Long">Very Long (300+ words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Emoji Usage */}
              <div className="space-y-2">
                <Label>Emoji Usage</Label>
                <Select
                  value={formData.emojiUsage}
                  onValueChange={(value) => updateFormData("emojiUsage", value as PreferencesCartridge["emojiUsage"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Minimal">Minimal</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Frequent">Frequent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Call to Action */}
              <div className="space-y-2">
                <Label>Call to Action</Label>
                <Select
                  value={formData.callToAction}
                  onValueChange={(value) => updateFormData("callToAction", value as PreferencesCartridge["callToAction"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Subtle">Subtle</SelectItem>
                    <SelectItem value="Clear">Clear</SelectItem>
                    <SelectItem value="Strong">Strong</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Hashtag Count Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Hashtag Count</Label>
                <span className="text-sm text-muted-foreground">{formData.hashtagCount}</span>
              </div>
              <Slider
                value={[formData.hashtagCount || 3]}
                onValueChange={(values: number[]) => updateFormData("hashtagCount", values[0])}
                min={0}
                max={10}
                step={1}
              />
            </div>

            {/* Personalization Level */}
            <div className="space-y-2">
              <Label>Personalization Level</Label>
              <Select
                value={formData.personalizationLevel}
                onValueChange={(value) => updateFormData("personalizationLevel", value as PreferencesCartridge["personalizationLevel"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                    Save Preferences
                  </>
                )}
              </Button>
              {preferencesCartridge && (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Language</p>
                <p className="text-sm text-muted-foreground">{preferencesCartridge.language}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Platform</p>
                <p className="text-sm text-muted-foreground">{preferencesCartridge.platform}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Tone</p>
                <p className="text-sm text-muted-foreground">{preferencesCartridge.tone}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Content Length</p>
                <p className="text-sm text-muted-foreground">{preferencesCartridge.contentLength}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Emoji Usage</p>
                <p className="text-sm text-muted-foreground">{preferencesCartridge.emojiUsage}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Call to Action</p>
                <p className="text-sm text-muted-foreground">{preferencesCartridge.callToAction}</p>
              </div>
            </div>
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Preferences
            </Button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Preferences Cartridge</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete your preferences cartridge? This action cannot be undone and your AI assistant will lose all preference configurations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
