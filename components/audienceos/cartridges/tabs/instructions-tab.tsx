"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Upload, Eye, Trash2, Loader2, FileText, BookOpen, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { fetchWithCsrf } from "@/lib/csrf"
import { type InstructionCartridge } from "@/types/cartridges"

export function InstructionsTab() {
  const { toast } = useToast()
  const [instructionCartridges, setInstructionCartridges] = useState<InstructionCartridge[]>([])
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteInstructionId, setDeleteInstructionId] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newName.trim()) return

    setIsCreating(true)
    try {
      const response = await fetchWithCsrf("/api/v1/cartridges/instructions", {
        method: "POST",
        body: JSON.stringify({
          name: newName,
          description: newDescription,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to create instruction set")
      }

      const newInstruction = await response.json()
      setInstructionCartridges((prev) => [...prev, newInstruction])

      toast({
        title: "Instruction Set Created",
        description: `"${newName}" has been created successfully`,
      })

      setNewName("")
      setNewDescription("")
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create instruction set"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpload = async (instructionId: string) => {
    const input = document.createElement("input")
    input.type = "file"
    input.multiple = true
    input.accept = ".pdf,.txt,.docx,.md"

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files || files.length === 0) return

      setIsUploading(true)
      try {
        const formData = new FormData()
        Array.from(files).forEach((file) => {
          formData.append("files", file)
        })

        const response = await fetch(
          `/api/v1/cartridges/instructions/${instructionId}/upload`,
          {
            method: "POST",
            body: formData,
            credentials: "include",
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to upload documents")
        }

        const updatedInstruction = await response.json()
        setInstructionCartridges((prev) =>
          prev.map((i) => (i.id === instructionId ? updatedInstruction : i))
        )

        toast({
          title: "Documents Uploaded",
          description: `${files.length} document(s) uploaded successfully`,
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to upload documents"
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    }

    input.click()
  }

  const handleProcess = async (instructionId: string) => {
    setProcessingIds((prev) => new Set(prev).add(instructionId))
    try {
      const response = await fetchWithCsrf(
        `/api/v1/cartridges/instructions/${instructionId}/process`,
        {
          method: "POST",
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to process instruction")
      }

      const processedInstruction = await response.json()
      setInstructionCartridges((prev) =>
        prev.map((i) => (i.id === instructionId ? processedInstruction : i))
      )

      toast({
        title: "Processing Complete",
        description: "Your instruction set has been processed successfully",
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process instruction"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(instructionId)
        return next
      })
    }
  }

  const handleDelete = async (instructionId: string) => {
    setDeleteInstructionId(instructionId)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteInstructionId) return

    try {
      const response = await fetchWithCsrf(
        `/api/v1/cartridges/instructions/${deleteInstructionId}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete instruction")
      }

      setInstructionCartridges((prev) =>
        prev.filter((i) => i.id !== deleteInstructionId)
      )
      setShowDeleteModal(false)
      setDeleteInstructionId(null)

      toast({
        title: "Instruction Deleted",
        description: "Your instruction set has been deleted",
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete instruction"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: InstructionCartridge["processStatus"]) => {
    switch (status) {
      case "completed":
        return "default"
      case "processing":
        return "secondary"
      case "failed":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketing Instructions</CardTitle>
        <CardDescription>
          Upload training documents to teach specific marketing frameworks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create New */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <Label className="text-base font-medium">Create New Instruction Set</Label>
          <Input
            placeholder="Name (e.g., 'StoryBrand Framework')"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Textarea
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="min-h-[80px]"
          />
          <Button onClick={handleCreate} disabled={!newName.trim() || isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Instruction Set
              </>
            )}
          </Button>
        </div>

        {/* Existing Instructions */}
        {instructionCartridges.length > 0 && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Instruction Sets</Label>
            {instructionCartridges.map((instruction) => (
              <Card key={instruction.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      {instruction.name}
                    </CardTitle>
                    <Badge variant={getStatusColor(instruction.processStatus)}>
                      {instruction.processStatus}
                    </Badge>
                  </div>
                  {instruction.description && (
                    <CardDescription>{instruction.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Document Count */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {instruction.trainingDocs?.length || 0} document(s)
                    </div>

                    {/* Processing Progress */}
                    {instruction.processStatus === "processing" && (
                      <div className="space-y-1">
                        <Progress value={50} />
                        <p className="text-xs text-muted-foreground text-center">
                          Processing documents...
                        </p>
                      </div>
                    )}

                    {/* Extracted Knowledge Preview */}
                    {instruction.extractedKnowledge && (
                      <div className="p-3 bg-muted rounded text-sm">
                        <p className="font-medium mb-1">Extracted Knowledge:</p>
                        <ul className="list-disc list-inside text-muted-foreground">
                          {instruction.extractedKnowledge.frameworks?.slice(0, 3).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                          {(instruction.extractedKnowledge.frameworks?.length || 0) > 3 && (
                            <li className="text-muted-foreground">
                              +{(instruction.extractedKnowledge.frameworks?.length || 0) - 3} more...
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpload(instruction.id)}
                      >
                        <Upload className="mr-2 h-3 w-3" />
                        Upload Docs
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleProcess(instruction.id)}
                        disabled={
                          processingIds.has(instruction.id) ||
                          instruction.processStatus === "processing" ||
                          !instruction.trainingDocs?.length
                        }
                      >
                        {processingIds.has(instruction.id) ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-3 w-3" />
                            Process
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(instruction.id)}
                        disabled={isCreating || isUploading}
                      >
                        <Trash2 className="mr-2 h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {instructionCartridges.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No instruction sets created yet</p>
            <p className="text-sm mt-1">Create an instruction set and upload training documents</p>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Instruction Set</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this instruction set? This action cannot be undone and all associated training documents will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
