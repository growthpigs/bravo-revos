"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
import { Upload, FileText, Eye, Trash2, Loader2, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { fetchWithCsrf } from "@/lib/csrf"
import { type StyleCartridge } from "@/types/cartridges"

export function StyleTab() {
  const { toast } = useToast()
  const [styleCartridge, setStyleCartridge] = useState<StyleCartridge | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch("/api/v1/cartridges/style/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to upload files")
      }

      const uploadedCartridge = await response.json()
      setStyleCartridge(uploadedCartridge)
      setSelectedFiles([])

      toast({
        title: "Files Uploaded",
        description: `${selectedFiles.length} file(s) uploaded successfully`,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload files"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!styleCartridge) return

    setIsAnalyzing(true)
    try {
      const response = await fetchWithCsrf("/api/v1/cartridges/style/analyze", {
        method: "POST",
        body: JSON.stringify({
          cartridgeId: styleCartridge.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to analyze style")
      }

      const analyzedCartridge = await response.json()
      setStyleCartridge(analyzedCartridge)

      toast({
        title: "Analysis Complete",
        description: "Your writing style has been analyzed successfully",
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to analyze style"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDelete = async () => {
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!styleCartridge) return

    setIsDeleting(true)
    try {
      const response = await fetchWithCsrf("/api/v1/cartridges/style", {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete style cartridge")
      }

      setStyleCartridge(null)
      setShowDeleteModal(false)

      toast({
        title: "Style Cartridge Deleted",
        description: "Your style cartridge has been deleted",
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete style"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Writing Style Learning</CardTitle>
        <CardDescription>
          Upload documents to teach the AI your unique writing style
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="space-y-4">
          <Label>Upload Style Documents</Label>
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
            <Input
              type="file"
              multiple
              accept=".pdf,.txt,.docx,.md"
              onChange={handleFileSelect}
              className="hidden"
              id="style-upload"
            />
            <Label htmlFor="style-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, TXT, DOCX, MD (max 10MB each)
              </p>
            </Label>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(idx)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button onClick={handleUpload} className="w-full" disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {selectedFiles.length} File{selectedFiles.length > 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Existing Files */}
        {styleCartridge && styleCartridge.sourceFiles.length > 0 && (
          <div className="space-y-2">
            <Label>Uploaded Documents</Label>
            {styleCartridge.sourceFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{file.fileName}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {(file.fileSize / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Analysis Section */}
        {styleCartridge && styleCartridge.sourceFiles.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label>Style Analysis</Label>
                <p className="text-sm text-muted-foreground">
                  Status: <Badge variant="outline">{styleCartridge.analysisStatus}</Badge>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Analyze Style
                    </>
                  )}
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>

            {/* Progress indicator for analyzing status */}
            {styleCartridge.analysisStatus === "analyzing" && (
              <div className="space-y-2">
                <Progress value={33} />
                <p className="text-xs text-muted-foreground text-center">
                  Analyzing writing patterns...
                </p>
              </div>
            )}

            {/* Learned Style Display */}
            {styleCartridge.learnedStyle && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Learned Patterns</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Tone:</strong> {styleCartridge.learnedStyle.toneAnalysis}</p>
                  {styleCartridge.learnedStyle.writingPatterns.length > 0 && (
                    <div>
                      <strong>Writing Patterns:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {styleCartridge.learnedStyle.writingPatterns.map((pattern, i) => (
                          <li key={i}>{pattern}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {styleCartridge.learnedStyle.structurePreferences.length > 0 && (
                    <div>
                      <strong>Structure Preferences:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {styleCartridge.learnedStyle.structurePreferences.map((pref, i) => (
                          <li key={i}>{pref}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!styleCartridge && selectedFiles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Upload documents to begin style learning</p>
            <p className="text-sm mt-1">The AI will analyze your writing patterns</p>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Style Cartridge</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete your style cartridge? This action cannot be undone and your AI assistant will lose all learned writing style patterns.
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
