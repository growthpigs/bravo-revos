"use client"

import { useState, useCallback, useRef } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Upload,
  X,
  FileText,
  File,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import type { DocumentCategory } from "@/types/database"
import {
  CATEGORY_LABELS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  formatFileSize,
  FILE_TYPE_INFO,
} from "@/types/knowledge-base"

interface DocumentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete: () => void
}

interface FileWithPreview {
  file: File
  id: string
  status: "pending" | "uploading" | "success" | "error"
  progress: number
  error?: string
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
}: DocumentUploadModalProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<DocumentCategory>("process")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form
  const resetForm = useCallback(() => {
    setFiles([])
    setTitle("")
    setDescription("")
    setCategory("process")
    setTags([])
    setTagInput("")
    setIsUploading(false)
  }, [])

  // Handle close
  const handleClose = useCallback(() => {
    if (!isUploading) {
      resetForm()
      onClose()
    }
  }, [isUploading, resetForm, onClose])

  // Validate file
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `File type not supported. Allowed: PDF, DOCX, TXT, MD`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: ${formatFileSize(MAX_FILE_SIZE)}`
    }
    return null
  }

  // Add files
  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles: FileWithPreview[] = []

    newFiles.forEach((file) => {
      const error = validateFile(file)
      validFiles.push({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: error ? "error" : "pending",
        progress: 0,
        error: error || undefined,
      })
    })

    setFiles((prev) => [...prev, ...validFiles])

    // Auto-fill title from first file if empty
    if (!title && validFiles.length > 0 && !validFiles[0].error) {
      const fileName = validFiles[0].file.name
      const titleFromFile = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
      setTitle(titleFromFile)
    }
  }, [title])

  // Remove file
  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      addFiles(droppedFiles)
    },
    [addFiles]
  )

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(Array.from(e.target.files))
      }
    },
    [addFiles]
  )

  // Add tag
  const addTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag])
    }
    setTagInput("")
  }, [tagInput, tags])

  // Remove tag
  const removeTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove))
  }, [])

  // Handle tag input keydown
  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault()
        addTag()
      } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
        setTags((prev) => prev.slice(0, -1))
      }
    },
    [addTag, tagInput, tags.length]
  )

  // Upload files
  const handleUpload = useCallback(async () => {
    const validFiles = files.filter((f) => f.status === "pending")
    if (validFiles.length === 0 || !title.trim()) return

    setIsUploading(true)

    // Simulate upload for each file
    for (const fileWithPreview of validFiles) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileWithPreview.id ? { ...f, status: "uploading" as const, progress: 0 } : f
        )
      )

      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        setFiles((prev) =>
          prev.map((f) => (f.id === fileWithPreview.id ? { ...f, progress } : f))
        )
      }

      // Mark as complete
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileWithPreview.id ? { ...f, status: "success" as const, progress: 100 } : f
        )
      )
    }

    setIsUploading(false)

    // Wait a moment then close
    await new Promise((resolve) => setTimeout(resolve, 500))
    resetForm()
    onUploadComplete()
  }, [files, title, resetForm, onUploadComplete])

  // Get file icon
  const getFileIcon = (mimeType: string) => {
    const info = FILE_TYPE_INFO[mimeType]
    if (info) {
      return <FileText className={cn("h-6 w-6", info.color)} />
    }
    return <File className="h-6 w-6 text-muted-foreground" />
  }

  // Can upload?
  const canUpload =
    files.some((f) => f.status === "pending") && title.trim().length > 0 && !isUploading

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-[14px] font-semibold">Upload Document</DialogTitle>
          <DialogDescription className="text-[11px]">
            Upload documents for AI-powered search and knowledge retrieval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {/* Drop Zone */}
          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg p-4 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50",
              files.length > 0 && "pb-3"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept={ALLOWED_MIME_TYPES.join(",")}
              onChange={handleFileInputChange}
            />

            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-1.5" />
            <p className="text-[11px] text-muted-foreground mb-0.5">
              Drag and drop files here, or{" "}
              <button
                type="button"
                className="text-primary hover:underline cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </p>
            <p className="text-[10px] text-muted-foreground">
              PDF, DOCX, TXT, MD up to {formatFileSize(MAX_FILE_SIZE)}
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-1.5">
              {files.map((fileWithPreview) => (
                <div
                  key={fileWithPreview.id}
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-lg border",
                    fileWithPreview.status === "error"
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-border bg-muted/50"
                  )}
                >
                  <div className="shrink-0">{getFileIcon(fileWithPreview.file.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">{fileWithPreview.file.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatFileSize(fileWithPreview.file.size)}
                    </p>
                    {fileWithPreview.error && (
                      <p className="text-[10px] text-destructive mt-0.5">{fileWithPreview.error}</p>
                    )}
                    {fileWithPreview.status === "uploading" && (
                      <div className="mt-1.5 h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${fileWithPreview.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {fileWithPreview.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFile(fileWithPreview.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                    {fileWithPreview.status === "uploading" && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {fileWithPreview.status === "success" && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {fileWithPreview.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Document Details */}
          <div className="space-y-3 pt-1.5">
            {/* Title */}
            <div className="space-y-1">
              <Label htmlFor="title" className="text-[10px]">Title</Label>
              <Input
                id="title"
                placeholder="Document title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-7 text-[11px] bg-secondary border-border"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <Label htmlFor="category" className="text-[10px]">Category</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as DocumentCategory)}>
                <SelectTrigger id="category" className="h-7 text-[11px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(CATEGORY_LABELS) as [DocumentCategory | "all", string][])
                    .filter(([key]) => key !== "all")
                    .map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-[11px]">
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="description" className="text-[10px]">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the document content"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-[11px] bg-secondary border-border"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <Label htmlFor="tags" className="text-[10px]">Tags (optional)</Label>
              <div className="flex flex-wrap gap-1 p-1.5 min-h-[32px] border rounded-md bg-background">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[9px] gap-0.5 px-1 py-0">
                    {tag}
                    <button
                      type="button"
                      className="hover:text-foreground cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
                <Input
                  id="tags"
                  className="flex-1 min-w-[100px] border-0 p-0 h-5 text-[11px] focus-visible:ring-0"
                  placeholder={tags.length === 0 ? "Add tags..." : ""}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={addTag}
                />
              </div>
              <p className="text-[9px] text-muted-foreground">
                Press Enter or comma to add a tag
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading} className="h-7 text-[10px]">
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!canUpload} className="h-7 text-[10px]">
            {isUploading ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-3 w-3" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
