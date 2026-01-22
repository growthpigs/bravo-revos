/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
/**
 * Knowledge Base Types
 * Based on features/knowledge-base.md spec
 */

import { DocumentCategory, IndexStatus } from './database'

// Extended document type with additional fields from spec
export interface KnowledgeBaseDocument {
  id: string
  agency_id: string
  title: string
  file_name: string
  file_size: number
  mime_type: string
  storage_path: string
  category: DocumentCategory
  client_id: string | null
  client_name?: string // Joined from client table
  page_count: number | null
  word_count: number | null
  index_status: IndexStatus
  gemini_file_id: string | null
  uploaded_by: string
  uploader_name?: string // Joined from user table
  is_active: boolean
  created_at: string
  updated_at: string
  // Additional fields from spec
  tags: string[]
  description: string | null
  usage_count: number
}

// Document upload request
export interface DocumentUploadRequest {
  file: File
  title: string
  category: DocumentCategory
  client_id?: string
  description?: string
  tags?: string[]
}

// Document update request
export interface DocumentUpdateRequest {
  title?: string
  category?: DocumentCategory
  client_id?: string | null
  description?: string | null
  tags?: string[]
}

// Search filters
export interface DocumentSearchFilters {
  query?: string
  category?: DocumentCategory | 'all'
  client_id?: string | 'global' | 'all'
  file_type?: 'pdf' | 'docx' | 'txt' | 'md' | 'all'
  index_status?: IndexStatus | 'all'
  date_from?: string
  date_to?: string
}

// Sort options
export type DocumentSortField = 'title' | 'created_at' | 'updated_at' | 'file_size' | 'usage_count'
export type SortDirection = 'asc' | 'desc'

export interface DocumentSortOption {
  field: DocumentSortField
  direction: SortDirection
}

// Category with count
export interface CategoryWithCount {
  category: DocumentCategory | 'all'
  count: number
  label: string
}

// Pagination
export interface DocumentPagination {
  cursor: string | null
  has_more: boolean
  total: number
}

// Document list response
export interface DocumentListResponse {
  documents: KnowledgeBaseDocument[]
  pagination: DocumentPagination
  categories: CategoryWithCount[]
}

// Search result with highlighting
export interface DocumentSearchResult extends KnowledgeBaseDocument {
  highlights?: {
    title?: string
    description?: string
    content?: string
  }
  relevance_score?: number
}

// Document preview data
export interface DocumentPreviewData {
  type: 'pdf' | 'docx' | 'markdown' | 'text'
  content: string
  pages?: number
  searchable_text?: string
}

// Document usage analytics
export interface DocumentUsageAnalytics {
  document_id: string
  total_citations: number
  avg_relevance_score: number
  usage_trend: 'up' | 'down' | 'stable'
  last_cited_at: string | null
  top_queries: string[]
}

// Category labels
export const CATEGORY_LABELS: Record<DocumentCategory | 'all', string> = {
  all: 'All Categories',
  installation: 'Installation',
  tech: 'Technical',
  support: 'Support',
  process: 'Process',
  client_specific: 'Client-Specific',
}

// File type info
export const FILE_TYPE_INFO: Record<string, { label: string; color: string; bgColor: string }> = {
  'application/pdf': {
    label: 'PDF',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    label: 'DOCX',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  'text/plain': {
    label: 'TXT',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
  },
  'text/markdown': {
    label: 'MD',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
}

// Index status info
export const INDEX_STATUS_INFO: Record<IndexStatus, { label: string; color: string; bgColor: string }> = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  indexing: {
    label: 'Indexing',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  indexed: {
    label: 'Indexed',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  failed: {
    label: 'Failed',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
}

// Allowed file types
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
]

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Get file type from mime type
export function getFileTypeLabel(mimeType: string): string {
  return FILE_TYPE_INFO[mimeType]?.label || 'Unknown'
}
