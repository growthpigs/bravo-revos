"use client"

import React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  File,
  Folder,
  MoreHorizontal,
  Star,
  Clock,
  Users,
  Download,
  Share2,
  Edit,
  Trash2,
  ExternalLink,
  Copy,
  Sparkles,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type DocumentType = "document" | "spreadsheet" | "presentation" | "image" | "video" | "pdf" | "folder" | "other"
export type DocumentCategory = "onboarding" | "reporting" | "creative" | "strategy" | "contracts" | "templates" | "training"

interface DocumentCardProps {
  id: string
  name: string
  type: DocumentType
  category?: DocumentCategory
  description?: string
  thumbnail?: string
  updatedAt: string
  updatedBy?: string
  size?: string
  shared?: boolean
  starred?: boolean
  selected?: boolean
  useForTraining?: boolean
  onClick?: () => void
  onStar?: () => void
  onToggleTraining?: () => void
  viewMode?: "grid" | "list" | "compact"
}

const getTypeIcon = (type: DocumentType, size: "sm" | "lg" = "sm") => {
  const className = size === "lg" ? "w-8 h-8" : "w-5 h-5"
  const icons: Record<DocumentType, React.ReactNode> = {
    document: <FileText className={className} />,
    spreadsheet: <FileSpreadsheet className={className} />,
    presentation: <FileText className={className} />,
    image: <FileImage className={className} />,
    video: <FileVideo className={className} />,
    pdf: <FileText className={className} />,
    folder: <Folder className={className} />,
    other: <File className={className} />,
  }
  return icons[type]
}

const typeColors: Record<DocumentType, string> = {
  document: "bg-blue-500/10 text-blue-500",
  spreadsheet: "bg-emerald-500/10 text-emerald-500",
  presentation: "bg-orange-500/10 text-orange-500",
  image: "bg-pink-500/10 text-pink-500",
  video: "bg-purple-500/10 text-purple-500",
  pdf: "bg-red-500/10 text-red-500",
  folder: "bg-yellow-500/10 text-yellow-500",
  other: "bg-slate-500/10 text-slate-400",
}

const categoryLabels: Record<DocumentCategory, string> = {
  onboarding: "Onboarding",
  reporting: "Reporting",
  creative: "Creative",
  strategy: "Strategy",
  contracts: "Contracts",
  templates: "Templates",
  training: "Training",
}

const categoryColors: Record<DocumentCategory, string> = {
  onboarding: "bg-blue-500/10 text-blue-500",
  reporting: "bg-emerald-500/10 text-emerald-500",
  creative: "bg-pink-500/10 text-pink-500",
  strategy: "bg-purple-500/10 text-purple-500",
  contracts: "bg-orange-500/10 text-orange-500",
  templates: "bg-cyan-500/10 text-cyan-500",
  training: "bg-yellow-500/10 text-yellow-500",
}

export function DocumentCard({
  id: _id,
  name,
  type,
  category,
  description,
  thumbnail,
  updatedAt,
  updatedBy: _updatedBy,
  size,
  shared = false,
  starred = false,
  selected = false,
  useForTraining = false,
  onClick,
  onStar,
  onToggleTraining,
  viewMode = "grid",
}: DocumentCardProps) {
  // Keyboard handler for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onClick?.()
    }
  }

  // Compact view for master-detail pattern (when detail panel is open)
  if (viewMode === "compact") {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-selected={selected}
        className={cn(
          "px-3 py-2.5 cursor-pointer transition-colors border-b border-border/30",
          selected
            ? "bg-primary/10 border-l-2 border-l-primary"
            : "hover:bg-secondary/50 border-l-2 border-l-transparent"
        )}
        onClick={onClick}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-2">
          {/* Type icon */}
          <div
            className={cn(
              "w-6 h-6 rounded flex items-center justify-center flex-shrink-0",
              typeColors[type]
            )}
          >
            {getTypeIcon(type)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium text-foreground truncate">
              {name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {category && (
                <span className="text-[10px] text-muted-foreground truncate">
                  {categoryLabels[category]}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">
                {updatedAt}
              </span>
            </div>
          </div>
          {starred && (
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
          )}
          {useForTraining && (
            <Sparkles className="w-3 h-3 text-foreground flex-shrink-0" />
          )}
        </div>
      </div>
    )
  }

  if (viewMode === "list") {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-selected={selected}
        className={cn(
          "flex items-center gap-4 px-4 py-3 border-b border-border cursor-pointer transition-colors",
          selected ? "bg-secondary" : "hover:bg-secondary/50"
        )}
        onClick={onClick}
        onKeyDown={handleKeyDown}
      >
        {/* Icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            typeColors[type]
          )}
        >
          {getTypeIcon(type)}
        </div>

        {/* Name and meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">{name}</span>
            {starred && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground leading-tight truncate">{description}</p>
          )}
        </div>

        {/* Category */}
        {category && (
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded font-medium flex-shrink-0",
              categoryColors[category]
            )}
          >
            {categoryLabels[category]}
          </span>
        )}

        {/* Shared indicator */}
        {shared && (
          <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}

        {/* AI Training toggle */}
        {onToggleTraining && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleTraining()
            }}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex-shrink-0",
              useForTraining
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
            title={useForTraining ? "Remove from AI training" : "Use for AI training"}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {useForTraining && <Check className="w-3 h-3" />}
          </button>
        )}

        {/* Updated */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span>{updatedAt}</span>
        </div>

        {/* Size */}
        {size && (
          <span className="text-xs text-muted-foreground w-16 text-right flex-shrink-0">
            {size}
          </span>
        )}

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="w-4 h-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="w-4 h-4 mr-2" />
              Make a copy
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="w-4 h-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // Grid view
  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={selected}
      className={cn(
        "bg-card border border-border rounded-lg overflow-hidden cursor-pointer transition-all group",
        selected ? "border-primary ring-1 ring-primary" : "hover:border-primary/50"
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {/* Thumbnail or icon */}
      <div className="aspect-[4/3] bg-secondary/50 flex items-center justify-center relative">
        {thumbnail ? (
          <Image src={thumbnail} alt={name} fill className="object-cover" />
        ) : (
          <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center", typeColors[type])}>
            {getTypeIcon(type, "lg")}
          </div>
        )}

        {/* Star button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStar?.()
          }}
          className={cn(
            "absolute top-2 right-2 p-1.5 rounded transition-all cursor-pointer",
            starred
              ? "text-yellow-500"
              : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
          )}
        >
          <Star className={cn("w-4 h-4", starred && "fill-yellow-500")} />
        </button>

        {/* Folder icon overlay */}
        {type === "folder" && (
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            Folder
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-medium text-foreground text-sm truncate">{name}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="w-4 h-4 mr-2" />
                Make a copy
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {description && (
          <p className="text-xs text-muted-foreground leading-tight line-clamp-2 mb-2">
            {description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {category && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded font-medium",
                  categoryColors[category]
                )}
              >
                {categoryLabels[category]}
              </span>
            )}
            {shared && <Users className="w-3.5 h-3.5" />}
            {/* AI Training toggle in grid */}
            {onToggleTraining && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleTraining()
                }}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer",
                  useForTraining
                    ? "bg-foreground text-background"
                    : "hover:bg-secondary"
                )}
                title={useForTraining ? "Remove from AI training" : "Use for AI training"}
              >
                <Sparkles className="w-3 h-3" />
                {useForTraining && <Check className="w-2.5 h-2.5" />}
              </button>
            )}
          </div>
          <span>{updatedAt}</span>
        </div>
      </div>
    </div>
  )
}

// Skeleton for loading state
export function DocumentCardSkeleton({ viewMode = "grid" }: { viewMode?: "grid" | "list" | "compact" }) {
  if (viewMode === "compact") {
    return (
      <div className="px-3 py-2.5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-muted animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            <div className="h-2 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (viewMode === "list") {
    return (
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          <div className="h-3 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-5 w-16 bg-muted rounded animate-pulse" />
        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="aspect-[4/3] bg-muted animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
      </div>
    </div>
  )
}

export { categoryLabels, categoryColors }
