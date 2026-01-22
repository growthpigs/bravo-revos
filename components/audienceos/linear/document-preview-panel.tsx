"use client"

import React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  X,
  Download,
  ExternalLink,
  MoreHorizontal,
  Star,
  Share2,
  Trash2,
  Copy,
  FileText,
  Edit,
  History,
  FolderInput,
  Check,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SendToAiButton } from "@/components/ui/send-to-ai-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type DocumentType, type DocumentCategory, categoryLabels, categoryColors } from "./document-card"

interface Document {
  id: string
  name: string
  type: DocumentType
  category?: DocumentCategory
  description?: string
  thumbnail?: string
  content?: string
  updatedAt: string
  createdAt: string
  updatedBy?: string
  createdBy?: string
  size?: string
  shared?: boolean
  starred?: boolean
  useForTraining?: boolean
  tags?: string[]
  clientName?: string
  viewCount?: number
  downloadCount?: number
}

interface DocumentPreviewPanelProps {
  document: Document
  onClose: () => void
  onStar?: () => void
  onDownload?: () => void
  onShare?: () => void
  onDelete?: () => void
  onToggleTraining?: () => void
  isDownloading?: boolean
  isDeleting?: boolean
  className?: string
}

export function DocumentPreviewPanel({
  document,
  onClose,
  onStar,
  onDownload,
  onShare,
  onDelete,
  onToggleTraining,
  isDownloading,
  isDeleting,
  className,
}: DocumentPreviewPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background border-l border-border",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {document.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onStar}
            className={cn(
              "p-1.5 rounded transition-colors cursor-pointer",
              document.starred
                ? "text-yellow-500"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Star className={cn("w-4 h-4", document.starred && "fill-yellow-500")} />
          </button>
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className={cn(
              "p-1.5 rounded transition-colors",
              isDownloading
                ? "text-muted-foreground cursor-not-allowed"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
            )}
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors cursor-pointer">
            <ExternalLink className="w-4 h-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="w-4 h-4 mr-2" />
                Make a copy
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FolderInput className="w-4 h-4 mr-2" />
                Move to folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <History className="w-4 h-4 mr-2" />
                Version history
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} disabled={isDeleting} className="text-destructive">
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview area - fills available space */}
      <div className="flex-1 bg-secondary/50 flex items-center justify-center min-h-0">
        {document.thumbnail ? (
          <div className="relative w-full h-full">
            <Image
              src={document.thumbnail}
              alt={document.name}
              fill
              className="object-contain"
            />
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Preview not available</p>
          </div>
        )}
      </div>

      {/* Document info + Metadata - anchored to bottom */}
      <div className="border-t border-border">
        {/* Document title and description */}
        <div className="px-3 py-2 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            {document.name}
          </h2>
          {document.description && (
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">{document.description}</p>
          )}
        </div>

        {/* Metadata - 2x2 Grid (Label|Value | Label|Value) - all left-aligned */}
        <div className="px-3 py-2 max-h-[220px] overflow-y-auto">
          <div className="grid grid-cols-metadata-2x2 gap-x-3 gap-y-1.5 items-center">
            {/* Row 1: Category | Size */}
            <span className="text-xs text-muted-foreground">Category</span>
            <span>
              {document.category ? (
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", categoryColors[document.category])}>
                  {categoryLabels[document.category]}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">Size</span>
            <span className="text-xs text-foreground">{document.size || "—"}</span>

            {/* Row 2: Views | Downloads */}
            <span className="text-xs text-muted-foreground">Views</span>
            <span className="text-xs text-foreground">{document.viewCount ?? 0}</span>
            <span className="text-xs text-muted-foreground">Downloads</span>
            <span className="text-xs text-foreground">{document.downloadCount ?? 0}</span>

            {/* Row 3: Created | Updated */}
            <span className="text-xs text-muted-foreground">Created</span>
            <span className="text-xs text-foreground">
              {document.createdAt}
              {document.createdBy && <span className="text-muted-foreground"> by {document.createdBy}</span>}
            </span>
            <span className="text-xs text-muted-foreground">Updated</span>
            <span className="text-xs text-foreground">
              {document.updatedAt}
              {document.updatedBy && <span className="text-muted-foreground"> by {document.updatedBy}</span>}
            </span>

            {/* Row 4: Client | AI Training */}
            <span className="text-xs text-muted-foreground">Client</span>
            <span className="text-xs text-foreground">{document.clientName || "—"}</span>
            <span className="text-xs text-muted-foreground">AI Training</span>
            <span>
              {onToggleTraining ? (
                <button
                  onClick={onToggleTraining}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer",
                    document.useForTraining
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  {document.useForTraining ? (
                    <>
                      <Check className="w-3 h-3" />
                      Enabled
                    </>
                  ) : (
                    "Enable"
                  )}
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </span>

            {/* Row 5: Tags (spans remaining columns) */}
            {document.tags && document.tags.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground">Tags</span>
                <div className="col-span-3 flex flex-wrap gap-1">
                  {document.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons - 2x2 Grid */}
        <div className="p-3 border-t border-border">
          <div className="grid grid-cols-2 gap-2">
            <SendToAiButton
              context={{
                type: "document",
                id: document.id,
                title: document.name,
                metadata: {
                  category: document.category,
                  tags: document.tags,
                },
              }}
              label="Send to AI"
              className="h-9 text-xs"
            />
            <button
              onClick={onShare}
              className="flex items-center justify-center gap-1.5 h-9 bg-secondary text-foreground rounded-md text-xs font-medium hover:bg-secondary/80 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
            <button
              onClick={onDownload}
              disabled={isDownloading}
              className={cn(
                "flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-medium transition-colors",
                isDownloading
                  ? "bg-secondary/50 text-muted-foreground cursor-not-allowed"
                  : "bg-secondary text-foreground hover:bg-secondary/80 cursor-pointer"
              )}
            >
              {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isDownloading ? "Downloading..." : "Download"}
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className={cn(
                "flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-medium transition-colors",
                isDeleting
                  ? "text-red-500/50 border border-red-500/20 cursor-not-allowed"
                  : "text-red-500 border border-red-500/30 hover:bg-red-500/10 cursor-pointer"
              )}
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 mr-0.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export type { Document }
