"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  X,
  Download,
  FileText,
  Tag,
  BarChart3,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import type { KnowledgeBaseDocument } from "@/types/knowledge-base"
import {
  formatFileSize,
  CATEGORY_LABELS,
  FILE_TYPE_INFO,
  INDEX_STATUS_INFO,
} from "@/types/knowledge-base"
import { SendToAiButton } from "@/components/ui/send-to-ai-button"
import { Share2, Trash2 } from "lucide-react"

interface DocumentPreviewModalProps {
  document: KnowledgeBaseDocument
  isOpen: boolean
  onClose: () => void
}

export function DocumentPreviewModal({
  document: doc,
  isOpen,
  onClose,
}: DocumentPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "details" | "analytics">("preview")
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(100)

  // Simulate loading
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      const timer = setTimeout(() => setIsLoading(false), 800)
      return () => clearTimeout(timer)
    }
  }, [isOpen, doc.id])

  // Reset state when document changes
  useEffect(() => {
    setCurrentPage(1)
    setZoom(100)
  }, [doc.id])

  const fileInfo = FILE_TYPE_INFO[doc.mime_type] || {
    label: "File",
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
  }

  const indexInfo = INDEX_STATUS_INFO[doc.index_status]

  // Render preview based on file type
  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    // Markdown/Text preview
    if (doc.mime_type === "text/markdown" || doc.mime_type === "text/plain") {
      return (
        <ScrollArea className="h-full">
          <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
            <pre className="text-[10px] whitespace-pre-wrap font-mono bg-muted p-3 rounded-lg">
              {`# ${doc.title}

${doc.description || "No description available."}

## Document Information
- Category: ${CATEGORY_LABELS[doc.category]}
- File Size: ${formatFileSize(doc.file_size)}
- Word Count: ${doc.word_count || "Unknown"}
- Upload Date: ${new Date(doc.created_at).toLocaleDateString()}

## Tags
${doc.tags.map((tag) => `- ${tag}`).join("\n")}

---

*This is a preview. Download the full document for complete content.*`}
            </pre>
          </div>
        </ScrollArea>
      )
    }

    // PDF preview placeholder
    if (doc.mime_type === "application/pdf") {
      return (
        <div className="flex flex-col h-full">
          {/* PDF Controls */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/50">
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-[10px]">
                Page {currentPage} of {doc.page_count || 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCurrentPage((p) => Math.min(doc.page_count || 1, p + 1))}
                disabled={currentPage === (doc.page_count || 1)}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setZoom((z) => Math.max(50, z - 25))}
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="text-[10px] w-10 text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setZoom((z) => Math.min(200, z + 25))}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* PDF Viewer Placeholder */}
          <div className="flex-1 flex items-center justify-center bg-muted/30 p-4">
            <div
              className="bg-white shadow-lg rounded-sm flex items-center justify-center text-muted-foreground"
              style={{
                width: `${(612 * zoom) / 100}px`,
                height: `${(792 * zoom) / 100}px`,
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            >
              <div className="text-center p-6">
                <FileText className="h-12 w-12 mx-auto mb-3 text-red-500/50" />
                <p className="text-[11px] font-medium text-gray-600">PDF Preview</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Page {currentPage} of {doc.page_count || 1}
                </p>
                <p className="text-[9px] text-gray-400 mt-3">
                  In production, this would render the actual PDF using PDF.js
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // DOCX preview placeholder
    return (
      <div className="flex items-center justify-center h-full bg-muted/30">
        <div className="text-center p-6">
          <FileText className="h-12 w-12 mx-auto mb-3 text-blue-500/50" />
          <p className="text-[11px] font-medium text-foreground">Document Preview</p>
          <p className="text-[10px] text-muted-foreground mt-1">{doc.file_name}</p>
          <p className="text-[10px] text-muted-foreground mt-3">
            {doc.word_count ? `${doc.word_count.toLocaleString()} words` : ""}
          </p>
          <Button variant="outline" size="sm" className="mt-3 h-7 text-[10px]">
            <Download className="mr-1.5 h-3 w-3" />
            Download to View
          </Button>
        </div>
      </div>
    )
  }

  // Render details tab
  const renderDetails = () => (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Description */}
          {doc.description && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground leading-relaxed">{doc.description}</p>
            </div>
          )}

          {/* Two-Column Metadata Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[10px]">
            {/* Left Column */}
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground mb-0.5">Category</p>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5">
                  {CATEGORY_LABELS[doc.category]}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Size</p>
                <p className="font-medium">{formatFileSize(doc.file_size)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Created</p>
                <p className="font-medium">
                  {new Date(doc.created_at).toLocaleDateString()}
                  {doc.uploader_name && (
                    <span className="text-muted-foreground font-normal"> by {doc.uploader_name}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground mb-0.5">Views</p>
                <p className="font-medium">{doc.usage_count || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Downloads</p>
                <p className="font-medium">--</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Updated</p>
                <p className="font-medium">
                  {new Date(doc.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Tags - Two Column Distribution */}
          {doc.tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground">Tags</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {doc.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0.5 justify-start">
                    <Tag className="mr-1 h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{tag}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Client & Index Status Row */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[10px]">
            {doc.client_name && (
              <div>
                <p className="text-muted-foreground mb-0.5">Client</p>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0.5">{doc.client_name}</Badge>
              </div>
            )}
            <div>
              <p className="text-muted-foreground mb-0.5">Index Status</p>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn("text-[9px] px-1.5 py-0.5", indexInfo.color, indexInfo.bgColor, "border-transparent")}
                >
                  {doc.index_status === "indexed" && <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />}
                  {doc.index_status === "indexing" && <Loader2 className="mr-0.5 h-2.5 w-2.5 animate-spin" />}
                  {doc.index_status === "failed" && <AlertCircle className="mr-0.5 h-2.5 w-2.5" />}
                  {indexInfo.label}
                </Badge>
                {doc.index_status === "failed" && (
                  <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px]">
                    <RefreshCw className="h-2.5 w-2.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Action Buttons - Fixed at Bottom */}
      <div className="border-t p-3 bg-background">
        <div className="grid grid-cols-2 gap-2">
          <SendToAiButton
            context={{
              type: "document",
              id: doc.id,
              title: doc.title,
              metadata: {
                category: doc.category,
                tags: doc.tags,
                fileName: doc.file_name,
              },
            }}
            label="Send to AI"
            className="h-8 text-[10px]"
          />
          <Button variant="outline" size="sm" className="h-8 text-[10px]">
            <Share2 className="mr-1.5 h-3 w-3" />
            Share
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[10px]">
            <Download className="mr-1.5 h-3 w-3" />
            Download
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[10px] text-destructive hover:text-destructive">
            <Trash2 className="mr-1.5 h-3 w-3" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  )

  // Render analytics tab
  const renderAnalytics = () => (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Usage Statistics */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-medium text-foreground">Usage Statistics</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-lg font-semibold">{doc.usage_count}</p>
              <p className="text-[9px] text-muted-foreground">AI Citations</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-lg font-semibold">--</p>
              <p className="text-[9px] text-muted-foreground">Views This Month</p>
            </div>
          </div>
        </div>

        {/* Usage Trend */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-medium text-foreground">Usage Trend</h3>
          <div className="h-24 bg-muted/50 rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
              <p className="text-[9px]">Chart available in production</p>
            </div>
          </div>
        </div>

        {/* Recent Citations */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-medium text-foreground">Recent Citations</h3>
          {doc.usage_count > 0 ? (
            <div className="space-y-2">
              <div className="p-2.5 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground text-[9px]">Dec 15, 2024</p>
                <p className="mt-0.5 text-[10px]">Referenced in chat about pixel installation</p>
              </div>
              <div className="p-2.5 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground text-[9px]">Dec 12, 2024</p>
                <p className="mt-0.5 text-[10px]">Used to answer GTM configuration question</p>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">No citations yet</p>
          )}
        </div>
      </div>
    </ScrollArea>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-[14px] font-medium truncate">{doc.title}</DialogTitle>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="outline" className={cn("text-[9px] px-1 py-0", fileInfo.color, fileInfo.bgColor, "border-transparent")}>
                  {fileInfo.label}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                {doc.client_name && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{doc.client_name}</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="outline" size="sm" className="h-7 text-[10px]">
                <Download className="mr-1.5 h-3 w-3" />
                Download
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0 mx-4 mt-2 w-fit h-7">
            <TabsTrigger value="preview" className="text-[10px] h-6 px-2.5">Preview</TabsTrigger>
            <TabsTrigger value="details" className="text-[10px] h-6 px-2.5">Details</TabsTrigger>
            <TabsTrigger value="analytics" className="text-[10px] h-6 px-2.5">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
            {renderPreview()}
          </TabsContent>

          <TabsContent value="details" className="flex-1 m-0 overflow-hidden">
            {renderDetails()}
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 m-0 overflow-hidden">
            {renderAnalytics()}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
