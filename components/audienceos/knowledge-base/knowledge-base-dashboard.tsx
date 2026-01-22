"use client"

import type { ReactNode } from "react"
import { useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  FileText,
  Upload,
  Filter,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  FolderOpen,
  RefreshCw,
  MoreVertical,
  Eye,
  Download,
  Trash2,
  Edit,
  Clock,
  FileType,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { KnowledgeBaseDocument, DocumentSortField } from "@/types/knowledge-base"
import type { DocumentCategory, IndexStatus } from "@/types/database"
import { quickLinks } from "@/lib/constants/knowledge-base"
import {
  formatFileSize,
  FILE_TYPE_INFO,
  INDEX_STATUS_INFO,
} from "@/types/knowledge-base"
import { useKnowledgeBaseStore } from "@/stores/knowledge-base-store"
import { DocumentUploadModal } from "./document-upload-modal"
import { DocumentPreviewModal } from "./document-preview-modal"

// Sort option labels
const SORT_OPTIONS: { value: DocumentSortField; label: string }[] = [
  { value: "updated_at", label: "Recently Updated" },
  { value: "created_at", label: "Date Added" },
  { value: "title", label: "Title" },
  { value: "file_size", label: "File Size" },
  { value: "usage_count", label: "Most Used" },
]

export function KnowledgeBaseDashboard() {
  // Get state and actions from store
  const {
    filteredDocuments,
    selectedDocument,
    isLoading,
    categories,
    filters,
    sort,
    viewMode,
    isUploadModalOpen,
    isPreviewModalOpen,
    setSearchQuery,
    setCategory,
    setIndexStatus,
    setSortField,
    toggleSortDirection,
    setViewMode,
    openUploadModal,
    closeUploadModal,
    openPreviewModal,
    closePreviewModal,
    reindexDocument,
  } = useKnowledgeBaseStore()

  // Handle document actions
  const handlePreview = useCallback((doc: KnowledgeBaseDocument) => {
    openPreviewModal(doc)
  }, [openPreviewModal])

  const handleReindex = useCallback((doc: KnowledgeBaseDocument) => {
    reindexDocument(doc.id)
  }, [reindexDocument])

  // Get file type icon and color
  const getFileTypeInfo = (mimeType: string) => {
    return FILE_TYPE_INFO[mimeType] || {
      label: "File",
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
    }
  }

  // Get index status info
  const getIndexStatusInfo = (status: IndexStatus) => {
    return INDEX_STATUS_INFO[status]
  }

  // Render index status badge
  const renderIndexStatus = (status: IndexStatus) => {
    const info = getIndexStatusInfo(status)
    return (
      <Badge
        variant="outline"
        className={cn("text-[9px] px-1 py-0", info.color, info.bgColor, "border-transparent")}
      >
        {status === "indexing" && <Loader2 className="mr-0.5 h-2.5 w-2.5 animate-spin" />}
        {status === "indexed" && <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />}
        {status === "failed" && <AlertCircle className="mr-0.5 h-2.5 w-2.5" />}
        {info.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Knowledge Base</h1>
          <p className="text-[12px] text-muted-foreground">
            SOPs, training materials, and documentation for AI-powered search
          </p>
        </div>
        <Button onClick={openUploadModal} className="h-8 text-[11px]">
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Upload Document
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={filters.query}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 bg-secondary border-border h-7 text-[11px]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <Button
              key={cat.category}
              variant="outline"
              size="sm"
              className={cn(
                "h-7 text-[10px]",
                filters.category === cat.category
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent"
              )}
              onClick={() => setCategory(cat.category as DocumentCategory | "all")}
            >
              {cat.label}
              <Badge
                variant="secondary"
                className="ml-1.5 h-4 px-1 text-[9px] bg-background/50"
              >
                {cat.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Secondary Filters & View Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <Select
            value={filters.indexStatus}
            onValueChange={(value) => setIndexStatus(value as IndexStatus | "all")}
          >
            <SelectTrigger className="w-[130px] h-7 text-[11px]">
              <Filter className="mr-1.5 h-3 w-3" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[11px]">All Status</SelectItem>
              <SelectItem value="indexed" className="text-[11px]">Indexed</SelectItem>
              <SelectItem value="indexing" className="text-[11px]">Indexing</SelectItem>
              <SelectItem value="pending" className="text-[11px]">Pending</SelectItem>
              <SelectItem value="failed" className="text-[11px]">Failed</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sort.field} onValueChange={(value) => setSortField(value as DocumentSortField)}>
            <SelectTrigger className="w-[150px] h-7 text-[11px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-[11px]">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleSortDirection}
          >
            {sort.direction === "asc" ? (
              <SortAsc className="h-3.5 w-3.5" />
            ) : (
              <SortDesc className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6", viewMode === "grid" && "bg-background shadow-sm")}
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6", viewMode === "list" && "bg-background shadow-sm")}
            onClick={() => setViewMode("list")}
          >
            <List className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Results Count */}
      <div className="text-[10px] text-muted-foreground">
        {filteredDocuments.length} document{filteredDocuments.length !== 1 ? "s" : ""} found
      </div>

      {/* Documents Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onPreview={handlePreview}
              onReindex={handleReindex}
              getFileTypeInfo={getFileTypeInfo}
              renderIndexStatus={renderIndexStatus}
            />
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filteredDocuments.map((doc) => (
                <DocumentListItem
                  key={doc.id}
                  document={doc}
                  onPreview={handlePreview}
                  onReindex={handleReindex}
                  getFileTypeInfo={getFileTypeInfo}
                  renderIndexStatus={renderIndexStatus}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredDocuments.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-[12px] font-medium text-foreground mb-1">No documents found</h3>
          <p className="text-[10px] text-muted-foreground mb-4">
            {filters.query
              ? "Try adjusting your search or filters"
              : "Upload your first document to get started"}
          </p>
          {!filters.query && (
            <Button onClick={openUploadModal} className="h-7 text-[10px]">
              <Upload className="mr-1.5 h-3 w-3" />
              Upload Document
            </Button>
          )}
        </div>
      )}

      {/* Quick Links */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[11px] font-medium">Quick Links</CardTitle>
          <CardDescription className="text-[10px]">Frequently accessed resources</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {quickLinks.map((link) => (
              <a
                key={link.title}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 py-2.5 px-3 hover:bg-secondary/50 transition-colors group cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                <span className="text-[11px] text-foreground group-hover:text-primary truncate">{link.title}</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={closeUploadModal}
        onUploadComplete={() => {
          // Document will be added via store in future API integration
          closeUploadModal()
        }}
      />

      {/* Preview Modal */}
      {selectedDocument && (
        <DocumentPreviewModal
          document={selectedDocument}
          isOpen={isPreviewModalOpen}
          onClose={closePreviewModal}
        />
      )}
    </div>
  )
}

// Document Card Component (Grid View)
interface DocumentCardProps {
  document: KnowledgeBaseDocument
  onPreview: (doc: KnowledgeBaseDocument) => void
  onReindex: (doc: KnowledgeBaseDocument) => void
  getFileTypeInfo: (mimeType: string) => { label: string; color: string; bgColor: string }
  renderIndexStatus: (status: IndexStatus) => ReactNode
}

function DocumentCard({
  document: doc,
  onPreview,
  onReindex,
  getFileTypeInfo,
  renderIndexStatus,
}: DocumentCardProps) {
  const fileInfo = getFileTypeInfo(doc.mime_type)

  return (
    <Card className="group hover:border-primary/50 transition-colors bg-card border-border shadow-sm">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between gap-2">
          <Badge
            variant="outline"
            className={cn("text-[9px] px-1 py-0", fileInfo.color, fileInfo.bgColor, "border-transparent")}
          >
            <FileType className="mr-0.5 h-2.5 w-2.5" />
            {fileInfo.label}
          </Badge>
          <div className="flex items-center gap-1">
            {renderIndexStatus(doc.index_status)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onPreview(doc)} className="text-[11px]">
                  <Eye className="mr-1.5 h-3 w-3" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem className="text-[11px]">
                  <Download className="mr-1.5 h-3 w-3" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem className="text-[11px]">
                  <Edit className="mr-1.5 h-3 w-3" />
                  Edit
                </DropdownMenuItem>
                {doc.index_status === "failed" && (
                  <DropdownMenuItem onClick={() => onReindex(doc)} className="text-[11px]">
                    <RefreshCw className="mr-1.5 h-3 w-3" />
                    Re-index
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-[11px] text-destructive">
                  <Trash2 className="mr-1.5 h-3 w-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CardTitle
          className="text-[11px] font-medium text-foreground group-hover:text-primary transition-colors cursor-pointer line-clamp-2"
          onClick={() => onPreview(doc)}
        >
          {doc.title}
        </CardTitle>
        <CardDescription className="text-[10px] line-clamp-2">{doc.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        {/* Tags */}
        {doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {doc.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">
                {tag}
              </Badge>
            ))}
            {doc.tags.length > 3 && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                +{doc.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {new Date(doc.updated_at).toLocaleDateString()}
            </span>
            <span>{formatFileSize(doc.file_size)}</span>
          </div>
          {doc.client_name && (
            <Badge variant="outline" className="text-[9px] px-1 py-0">
              {doc.client_name}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Document List Item Component (List View) - Row pattern
function DocumentListItem({
  document: doc,
  onPreview,
  onReindex,
  getFileTypeInfo,
  renderIndexStatus,
}: DocumentCardProps) {
  const fileInfo = getFileTypeInfo(doc.mime_type)

  return (
    <div className="group flex items-center gap-3 py-3 px-4 hover:bg-secondary/50 transition-colors">
      {/* File Type Icon */}
      <div className={cn("p-2 rounded-md shrink-0", fileInfo.bgColor)}>
        <FileText className={cn("h-4 w-4", fileInfo.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3
            className="text-[11px] font-medium text-foreground group-hover:text-primary transition-colors cursor-pointer truncate"
            onClick={() => onPreview(doc)}
          >
            {doc.title}
          </h3>
          {renderIndexStatus(doc.index_status)}
        </div>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{doc.description}</p>
      </div>

      {/* Middle: Metadata (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-3 px-4 flex-shrink-0 text-[10px] text-muted-foreground">
        <span>{fileInfo.label}</span>
        <span>{formatFileSize(doc.file_size)}</span>
        <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
        {doc.client_name && <Badge variant="outline" className="text-[9px] px-1 py-0">{doc.client_name}</Badge>}
      </div>

      {/* Actions - inline right with hover reveal */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onPreview(doc)}
        >
          <Eye className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Download className="h-3 w-3" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-[11px]">
              <Edit className="mr-1.5 h-3 w-3" />
              Edit
            </DropdownMenuItem>
            {doc.index_status === "failed" && (
              <DropdownMenuItem onClick={() => onReindex(doc)} className="text-[11px]">
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Re-index
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[11px] text-destructive">
              <Trash2 className="mr-1.5 h-3 w-3" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
