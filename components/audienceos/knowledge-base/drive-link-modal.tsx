"use client"

import { useState, useCallback, useRef, useEffect } from "react"
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
import { Cloud, Loader2, AlertCircle } from "lucide-react"

interface DriveLinkModalProps {
  isOpen: boolean
  onClose: () => void
  onAddDriveLink: (url: string, displayName?: string) => Promise<void>
}

/**
 * Extract Drive file ID from various URL formats
 */
function extractDriveFileId(url: string): string | null {
  // Format: https://drive.google.com/file/d/{fileId}/...
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileMatch) return fileMatch[1]

  // Format: https://docs.google.com/document/d/{fileId}/...
  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  if (docMatch) return docMatch[1]

  // Format: https://docs.google.com/spreadsheets/d/{fileId}/...
  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (sheetMatch) return sheetMatch[1]

  // Format: https://docs.google.com/presentation/d/{fileId}/...
  const slideMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/)
  if (slideMatch) return slideMatch[1]

  // Format: ?id={fileId}
  const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (queryMatch) return queryMatch[1]

  return null
}

/**
 * Check if URL is a valid Google Drive/Docs URL
 */
function isValidDriveUrl(url: string): boolean {
  return (
    url.includes("drive.google.com") ||
    url.includes("docs.google.com")
  )
}

export function DriveLinkModal({
  isOpen,
  onClose,
  onAddDriveLink,
}: DriveLinkModalProps) {
  const [url, setUrl] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset form on close
  const resetForm = useCallback(() => {
    setUrl("")
    setDisplayName("")
    setError(null)
    setIsLoading(false)
  }, [])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm()
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, resetForm])

  // Handle close
  const handleClose = useCallback(() => {
    if (!isLoading) {
      resetForm()
      onClose()
    }
  }, [isLoading, resetForm, onClose])

  // Validate and submit
  const handleSubmit = useCallback(async () => {
    const trimmedUrl = url.trim()

    // Validate URL
    if (!trimmedUrl) {
      setError("Please enter a URL")
      return
    }

    if (!isValidDriveUrl(trimmedUrl)) {
      setError("Please enter a valid Google Drive or Docs URL")
      return
    }

    const fileId = extractDriveFileId(trimmedUrl)
    if (!fileId) {
      setError("Could not extract file ID from URL")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onAddDriveLink(trimmedUrl, displayName.trim() || undefined)
      resetForm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add document")
    } finally {
      setIsLoading(false)
    }
  }, [url, displayName, onAddDriveLink, resetForm, onClose])

  // Check if URL is valid for enabling button
  const isUrlValid = url.trim() && isValidDriveUrl(url.trim()) && extractDriveFileId(url.trim())

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-[14px] font-semibold flex items-center gap-2">
            <Cloud className="h-4 w-4 text-blue-500" />
            Add from Google Drive
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Paste a link to a Google Doc, Sheet, Slides, or Drive file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {/* URL Input */}
          <div className="space-y-1">
            <Label htmlFor="drive-url" className="text-[10px]">
              Google Drive URL
            </Label>
            <Input
              ref={inputRef}
              id="drive-url"
              type="url"
              placeholder="https://docs.google.com/document/d/..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isUrlValid && !isLoading) {
                  handleSubmit()
                }
              }}
              className="h-8 text-[11px] bg-secondary border-border"
            />
          </div>

          {/* Display Name (optional) */}
          <div className="space-y-1">
            <Label htmlFor="display-name" className="text-[10px]">
              Display Name (optional)
            </Label>
            <Input
              id="display-name"
              placeholder="Leave blank to auto-detect"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-8 text-[11px] bg-secondary border-border"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <p className="text-[10px]">{error}</p>
            </div>
          )}

          {/* Help Text */}
          <p className="text-[10px] text-muted-foreground">
            Supported: Google Docs, Sheets, Slides, and Drive files
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="h-7 text-[10px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isUrlValid || isLoading}
            className="h-7 text-[10px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Cloud className="mr-1.5 h-3 w-3" />
                Add Document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
