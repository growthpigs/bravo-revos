"use client"

import React, { useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useSlideTransition } from "@/hooks/use-slide-transition"
import { useToast } from "@/hooks/use-toast"
import { fetchWithCsrf } from "@/lib/csrf"
import { cn } from "@/lib/utils"
import {
  DocumentCard,
  type DocumentCategory,
  categoryLabels,
} from "@/components/linear/document-card"
import { DocumentPreviewPanel, type Document } from "@/components/linear/document-preview-panel"
import { DocumentUploadModal } from "@/components/linear/document-upload-modal"
import { DriveLinkModal } from "@/components/knowledge-base/drive-link-modal"
import { ProcessingPanel } from "@/components/knowledge-base/processing-panel"
import { SearchPanel } from "@/components/knowledge-base/search-panel"
import { ListHeader } from "@/components/linear"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Upload,
  FolderOpen,
  Star,
  Clock,
  Search,
  Settings,
  Cloud,
  Users,
  ChevronDown,
  Download,
  Share2,
  Trash2,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

// Diiiploy - Knowledge Base Documents (initial data, will be replaced by API)
const initialDocuments: Document[] = [
  {
    id: "doc-1",
    name: "New Client Onboarding Playbook",
    type: "document",
    category: "onboarding",
    description: "Complete onboarding workflow: kickoff call → brand audit → campaign setup → reporting cadence",
    updatedAt: "2 hours ago",
    createdAt: "Dec 10, 2025",
    updatedBy: "Roderic",
    createdBy: "Brent",
    size: "48 KB",
    shared: true,
    starred: true,
    useForTraining: true,
    tags: ["onboarding", "playbook", "process"],
    viewCount: 342,
    downloadCount: 89,
  },
  {
    id: "doc-2",
    name: "Monthly ROI Dashboard Template",
    type: "spreadsheet",
    category: "reporting",
    description: "Client-facing performance dashboard with ROAS, CPA, and conversion tracking",
    updatedAt: "1 day ago",
    createdAt: "Nov 15, 2025",
    updatedBy: "Trevor",
    createdBy: "Roderic",
    size: "256 KB",
    shared: true,
    starred: true,
    useForTraining: true,
    tags: ["dashboard", "roi", "template"],
    viewCount: 567,
    downloadCount: 234,
  },
  {
    id: "doc-3",
    name: "Sunrise Wellness Brand Kit",
    type: "pdf",
    category: "creative",
    description: "Logo usage, color palette (#2E7D32, #81C784), typography (Poppins), and image guidelines",
    updatedAt: "3 days ago",
    createdAt: "Oct 28, 2025",
    updatedBy: "Chase",
    size: "12.4 MB",
    shared: true,
    starred: false,
    clientName: "Sunrise Wellness",
    tags: ["brand", "wellness", "healthcare"],
    viewCount: 156,
    downloadCount: 45,
  },
  {
    id: "doc-4",
    name: "Q1 2026 Growth Strategy",
    type: "presentation",
    category: "strategy",
    description: "Cross-channel expansion plan: Google Ads + Meta + LinkedIn for B2B lead gen clients",
    updatedAt: "1 week ago",
    createdAt: "Dec 5, 2025",
    updatedBy: "Brent",
    createdBy: "Brent",
    size: "8.7 MB",
    shared: true,
    starred: true,
    tags: ["strategy", "q1-2026", "growth"],
    viewCount: 89,
    downloadCount: 23,
  },
  {
    id: "doc-5",
    name: "Media Buying Agreement v3",
    type: "document",
    category: "contracts",
    description: "Standard contract for ad spend management: fee structure, reporting SLAs, termination clauses",
    updatedAt: "2 weeks ago",
    createdAt: "Aug 20, 2025",
    updatedBy: "Legal Team",
    createdBy: "Brent",
    size: "124 KB",
    shared: true,
    starred: false,
    tags: ["contract", "legal", "media-buying"],
    viewCount: 234,
    downloadCount: 78,
  },
  {
    id: "doc-6",
    name: "Google Ads Certification Prep Guide",
    type: "document",
    category: "training",
    description: "Study materials for Search, Display, Video, and Shopping certifications",
    updatedAt: "3 weeks ago",
    createdAt: "Jul 15, 2025",
    updatedBy: "Trevor",
    createdBy: "Trevor",
    size: "2.3 MB",
    shared: true,
    starred: true,
    useForTraining: true,
    tags: ["google-ads", "certification", "training"],
    viewCount: 678,
    downloadCount: 312,
  },
  {
    id: "doc-7",
    name: "Content Calendar Master",
    type: "spreadsheet",
    category: "templates",
    description: "12-month social media planning template with platform-specific posting schedules",
    updatedAt: "1 month ago",
    createdAt: "Jun 10, 2025",
    updatedBy: "Chase",
    createdBy: "Chase",
    size: "89 KB",
    shared: true,
    starred: false,
    tags: ["social-media", "content", "calendar"],
    viewCount: 445,
    downloadCount: 267,
  },
  {
    id: "doc-8",
    name: "Metro Realty Campaign Assets",
    type: "folder",
    category: "creative",
    description: "Winter 2025 campaign: video ads, display banners, landing page designs",
    updatedAt: "5 days ago",
    createdAt: "Nov 20, 2025",
    updatedBy: "Creative Team",
    size: "456 MB",
    shared: true,
    starred: false,
    clientName: "Metro Realty",
    tags: ["real-estate", "campaign", "creative"],
    viewCount: 123,
  },
  {
    id: "doc-9",
    name: "Meta Ads Manager Walkthrough",
    type: "document",
    category: "training",
    description: "Business Manager setup, pixel installation, custom audience building, and campaign structure",
    updatedAt: "2 months ago",
    createdAt: "May 25, 2025",
    updatedBy: "Roderic",
    createdBy: "Roderic",
    size: "1.8 MB",
    shared: true,
    starred: false,
    useForTraining: true,
    tags: ["meta", "facebook", "training"],
    viewCount: 389,
    downloadCount: 145,
  },
]

type ViewFilter = "all" | "starred" | "recent"

interface FilterConfig {
  id: ViewFilter
  label: string
  icon: React.ReactNode
}

const viewFilters: FilterConfig[] = [
  { id: "all", label: "All Files", icon: <FolderOpen className="w-4 h-4" /> },
  { id: "starred", label: "Starred", icon: <Star className="w-4 h-4" /> },
  { id: "recent", label: "Recent", icon: <Clock className="w-4 h-4" /> },
]

const categories: (DocumentCategory | "all")[] = [
  "all",
  "onboarding",
  "reporting",
  "creative",
  "strategy",
  "contracts",
  "templates",
  "training",
]

// Extract unique client names from documents
function getUniqueClients(docs: Document[]): string[] {
  const clients = docs
    .map(d => d.clientName)
    .filter((c): c is string => Boolean(c))
  return [...new Set(clients)].sort()
}

export function KnowledgeBase() {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | "all">("all")
  const [clientFilter, setClientFilter] = useState<string | "all">("all")
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isDriveLinkModalOpen, setIsDriveLinkModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("documents")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Get unique clients for filter dropdown
  const availableClients = useMemo(() => getUniqueClients(documents), [documents])

  const slideTransition = useSlideTransition()

  // Filter documents
  const filteredDocuments = useMemo((): Document[] => {
    let result: Document[] = documents

    // Apply view filter
    switch (viewFilter) {
      case "starred":
        result = result.filter((d) => d.starred)
        break
      case "recent":
        // Already sorted by recent, just show top items
        result = result.slice(0, 6)
        break
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      result = result.filter((d) => d.category === categoryFilter)
    }

    // Apply client filter
    if (clientFilter !== "all") {
      result = result.filter((d) => d.clientName === clientFilter)
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query) ||
          d.tags?.some((t) => t.toLowerCase().includes(query))
      )
    }

    return result
  }, [documents, viewFilter, categoryFilter, clientFilter, searchQuery])

  // Toggle star status on a document
  const handleStar = useCallback(async (docId: string) => {
    const doc = documents.find(d => d.id === docId)
    if (!doc) return

    const newStarred = !doc.starred

    // Optimistic update
    setDocuments(prev =>
      prev.map(d => d.id === docId ? { ...d, starred: newStarred } : d)
    )
    setSelectedDocument(prev =>
      prev?.id === docId ? { ...prev, starred: newStarred } : prev
    )

    // Only call API for real documents (not mock data)
    if (!docId.startsWith('doc-') && !docId.startsWith('drive-')) {
      try {
        const response = await fetchWithCsrf(`/api/v1/documents/${docId}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_starred: newStarred }),
        })

        if (!response.ok) {
          // Revert on error
          setDocuments(prev =>
            prev.map(d => d.id === docId ? { ...d, starred: !newStarred } : d)
          )
          setSelectedDocument(prev =>
            prev?.id === docId ? { ...prev, starred: !newStarred } : prev
          )
          toast({
            title: "Failed to update",
            description: "Could not update star status. Please try again.",
            variant: "destructive",
          })
          return
        }
      } catch {
        // Revert on error
        setDocuments(prev =>
          prev.map(d => d.id === docId ? { ...d, starred: !newStarred } : d)
        )
        setSelectedDocument(prev =>
          prev?.id === docId ? { ...prev, starred: !newStarred } : prev
        )
        toast({
          title: "Failed to update",
          description: "Network error. Please try again.",
          variant: "destructive",
        })
        return
      }
    }

    toast({
      title: newStarred ? "Added to starred" : "Removed from starred",
      description: doc.name,
    })
  }, [documents])

  // Toggle AI training status on a document
  const handleToggleTraining = useCallback(async (docId: string) => {
    const doc = documents.find(d => d.id === docId)
    if (!doc) return

    const newTraining = !doc.useForTraining

    // Optimistic update
    setDocuments(prev =>
      prev.map(d => d.id === docId ? { ...d, useForTraining: newTraining } : d)
    )
    setSelectedDocument(prev =>
      prev?.id === docId ? { ...prev, useForTraining: newTraining } : prev
    )

    // Only call API for real documents (not mock data)
    if (!docId.startsWith('doc-') && !docId.startsWith('drive-')) {
      try {
        const response = await fetchWithCsrf(`/api/v1/documents/${docId}`, {
          method: 'PATCH',
          body: JSON.stringify({ use_for_training: newTraining }),
        })

        if (!response.ok) {
          // Revert on error
          setDocuments(prev =>
            prev.map(d => d.id === docId ? { ...d, useForTraining: !newTraining } : d)
          )
          setSelectedDocument(prev =>
            prev?.id === docId ? { ...prev, useForTraining: !newTraining } : prev
          )
          toast({
            title: "Failed to update",
            description: "Could not update training status. Please try again.",
            variant: "destructive",
          })
          return
        }
      } catch {
        // Revert on error
        setDocuments(prev =>
          prev.map(d => d.id === docId ? { ...d, useForTraining: !newTraining } : d)
        )
        setSelectedDocument(prev =>
          prev?.id === docId ? { ...prev, useForTraining: !newTraining } : prev
        )
        toast({
          title: "Failed to update",
          description: "Network error. Please try again.",
          variant: "destructive",
        })
        return
      }
    }

    toast({
      title: newTraining ? "Enabled for AI training" : "Disabled for AI training",
      description: doc.name,
    })
  }, [documents])

  // Download a document
  const handleDownload = useCallback(async (docId: string) => {
    const doc = documents.find(d => d.id === docId)
    if (!doc) return

    setIsDownloading(true)
    try {
      const response = await fetchWithCsrf(`/api/v1/documents/${docId}/download`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to download document')
      }

      const { data } = await response.json()

      // Create a blob and trigger download
      if (data.url) {
        const link = document.createElement('a')
        link.href = data.url
        link.download = doc.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      toast({
        title: "Download started",
        description: doc.name,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download document'
      toast({
        title: "Download failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }, [documents, toast])

  // Share a document
  const handleShare = useCallback(async (docId: string) => {
    const doc = documents.find(d => d.id === docId)
    if (!doc) return

    try {
      // TODO: Implement share modal/dialog
      // For now, copy link to clipboard
      const url = `${window.location.origin}/knowledge-base/${docId}`
      await navigator.clipboard.writeText(url)
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard",
      })
    } catch (_error) {
      toast({
        title: "Share failed",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }, [documents])

  // Delete a document
  const handleDelete = useCallback(async (docId: string) => {
    const doc = documents.find(d => d.id === docId)
    if (!doc) return

    // Show confirmation dialog
    setShowDeleteModal(true)
  }, [documents])

  // Confirm delete
  const handleConfirmDelete = useCallback(async () => {
    if (!selectedDocument) return

    setIsDeleting(true)
    try {
      const response = await fetchWithCsrf(`/api/v1/documents/${selectedDocument.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete document')
      }

      // Close preview panel and modal
      setSelectedDocument(null)
      setShowDeleteModal(false)

      // Remove from list
      setDocuments(prev => prev.filter(d => d.id !== selectedDocument.id))

      toast({
        title: "Document deleted",
        description: selectedDocument.name,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete document'
      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }, [selectedDocument, toast])

  // Add a document from Google Drive
  const handleAddDriveLink = useCallback(async (url: string, displayName?: string) => {
    // Extract file ID from URL for optimistic placeholder
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    const fileId = fileIdMatch?.[1] || `temp-${Date.now()}`
    const tempId = `temp-${fileId}`

    // Create optimistic placeholder
    const placeholderDoc: Document = {
      id: tempId,
      name: displayName || "Google Drive Document",
      type: "document",
      category: "templates",
      description: "Importing from Google Drive...",
      updatedAt: "Just now",
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      updatedBy: "You",
      size: "Processing...",
      shared: false,
      starred: false,
      useForTraining: false,
      tags: ["drive-import"],
      viewCount: 0,
    }

    // Add placeholder to list
    setDocuments(prev => [placeholderDoc, ...prev])

    try {
      const response = await fetchWithCsrf('/api/v1/documents/drive', {
        method: 'POST',
        body: JSON.stringify({
          url,
          display_name: displayName,
          category: 'process',
        }),
      })

      if (!response.ok) {
        // Remove placeholder on error
        setDocuments(prev => prev.filter(d => d.id !== tempId))
        const errorData = await response.json().catch(() => ({}))
        toast({
          title: "Import failed",
          description: errorData.error || "Could not import from Google Drive. Please try again.",
          variant: "destructive",
        })
        return
      }

      const { data } = await response.json()

      // Replace placeholder with real document
      setDocuments(prev =>
        prev.map(d => d.id === tempId ? {
          id: data.id,
          name: data.title,
          type: "document",
          category: data.category || "templates",
          description: "Imported from Google Drive",
          updatedAt: "Just now",
          createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          updatedBy: "You",
          size: `${data.file_size || 0} bytes`,
          shared: false,
          starred: data.is_starred || false,
          useForTraining: data.use_for_training || false,
          tags: ["drive-import"],
          viewCount: 0,
        } as Document : d)
      )

      toast({
        title: "Document imported",
        description: `"${data.title}" has been imported from Google Drive`,
      })
    } catch {
      // Remove placeholder on network error
      setDocuments(prev => prev.filter(d => d.id !== tempId))
      toast({
        title: "Import failed",
        description: "Network error. Please check your connection and try again.",
        variant: "destructive",
      })
    }
  }, [])

  // Helper to render document cards with proper typing
  const renderDocumentCard = (doc: Document, mode: "compact" | "grid" | "list") => (
    <DocumentCard
      key={doc.id}
      {...doc}
      viewMode={mode}
      selected={selectedDocument?.id === doc.id}
      onClick={() => setSelectedDocument(doc)}
      onStar={() => handleStar(doc.id)}
      onToggleTraining={() => handleToggleTraining(doc.id)}
    />
  )

  return (
    <div className="flex h-full overflow-hidden">
      {/* Document list - shrinks when preview panel is open */}
      <motion.div
        initial={false}
        animate={{ width: selectedDocument ? 400 : "100%" }}
        transition={slideTransition}
        className="flex flex-col border-r border-border overflow-hidden"
        style={{ minWidth: selectedDocument ? 400 : undefined, flexShrink: selectedDocument ? 0 : undefined }}
      >
        <ListHeader
          title="X Knowledge Base"
          count={activeTab === "documents" ? filteredDocuments.length : undefined}
          onSearch={activeTab === "documents" ? setSearchQuery : undefined}
          searchValue={activeTab === "documents" ? searchQuery : ""}
          searchPlaceholder="Search documents..."
          searchAsButton={activeTab === "documents"}
          viewMode={!selectedDocument && activeTab === "documents" ? (viewMode === "grid" ? "board" : "list") : undefined}
          onViewModeChange={!selectedDocument && activeTab === "documents" ? (mode) => setViewMode(mode === "board" ? "grid" : "list") : undefined}
          actions={
            !selectedDocument && activeTab === "documents" && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setIsDriveLinkModalOpen(true)}>
                  <Cloud className="h-4 w-4" />
                  From Drive
                </Button>
                <Button size="sm" className="h-8 gap-1.5" onClick={() => setIsUploadModalOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </div>
            )
          }
        />

        {/* Tabs Navigation */}
        {!selectedDocument && (
          <div className="px-4 py-2 border-b border-border">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="documents" className="flex items-center gap-1.5">
                  <FolderOpen className="w-3 h-3" />
                  Documents
                </TabsTrigger>
                <TabsTrigger value="search" className="flex items-center gap-1.5">
                  <Search className="w-3 h-3" />
                  Search
                </TabsTrigger>
                <TabsTrigger value="processing" className="flex items-center gap-1.5">
                  <Settings className="w-3 h-3" />
                  Processing
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Filters - only for documents tab */}
        {!selectedDocument && activeTab === "documents" && (
          <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
            {/* View filters */}
            <div className="flex items-center gap-1">
              {viewFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setViewFilter(filter.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    viewFilter === filter.id
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {filter.icon}
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Category filter */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "px-2.5 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
                    categoryFilter === cat
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {cat === "all" ? "All" : categoryLabels[cat]}
                </button>
              ))}
            </div>

            {/* Client filter dropdown */}
            {availableClients.length > 0 && (
              <>
                <div className="w-px h-6 bg-border" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={clientFilter !== "all" ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-7 px-2 text-xs gap-1",
                        clientFilter !== "all" && "bg-primary/10 text-primary border border-primary/30"
                      )}
                    >
                      <Users className="h-3.5 w-3.5" />
                      {clientFilter === "all" ? "Client" : clientFilter}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem
                      onClick={() => setClientFilter("all")}
                      className={cn(
                        "text-sm cursor-pointer",
                        clientFilter === "all" && "bg-primary/10 text-primary"
                      )}
                    >
                      All Clients
                    </DropdownMenuItem>
                    {availableClients.map((client) => (
                      <DropdownMenuItem
                        key={client}
                        onClick={() => setClientFilter(client)}
                        className={cn(
                          "text-sm cursor-pointer",
                          clientFilter === client && "bg-primary/10 text-primary"
                        )}
                      >
                        {client}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        )}

        {/* Content Area - natural flow */}
        <div className="flex-1">
          {!selectedDocument ? (
            // Tab content when no document is selected
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsContent value="documents" className="mt-0 h-full">
                {filteredDocuments.length > 0 ? (
                  viewMode === "grid" ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                      {filteredDocuments.map((doc) => renderDocumentCard(doc, "grid"))}
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-lg overflow-hidden m-4">
                      {filteredDocuments.map((doc) => renderDocumentCard(doc, "list"))}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <FolderOpen className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No documents found</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="search" className="mt-0 h-full">
                <div className="p-4">
                  <SearchPanel />
                </div>
              </TabsContent>

              <TabsContent value="processing" className="mt-0 h-full">
                <div className="p-4">
                  <ProcessingPanel onProcessingComplete={() => {
                    // Refresh document list after processing
                    // In a real app, this would refetch from API
                  }} />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            // Compact list when document is selected
            <div>
              {filteredDocuments.map((doc) => renderDocumentCard(doc, "compact"))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Preview/Editor panel - fills remaining space */}
      <AnimatePresence mode="wait">
        {selectedDocument && (
          <motion.div
            key="document-preview"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={slideTransition}
            className="flex-1 flex flex-col bg-background overflow-hidden min-w-0"
          >
            <DocumentPreviewPanel
              document={selectedDocument}
              onClose={() => setSelectedDocument(null)}
              onStar={() => handleStar(selectedDocument.id)}
              onDownload={() => handleDownload(selectedDocument.id)}
              onShare={() => handleShare(selectedDocument.id)}
              onDelete={() => handleDelete(selectedDocument.id)}
              onToggleTraining={() => handleToggleTraining(selectedDocument.id)}
              isDownloading={isDownloading}
              isDeleting={isDeleting}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />

      {/* Drive Link Modal */}
      <DriveLinkModal
        isOpen={isDriveLinkModalOpen}
        onClose={() => setIsDriveLinkModalOpen(false)}
        onAddDriveLink={handleAddDriveLink}
      />

      {/* Delete confirmation modal */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDocument?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
