/**
 * Knowledge Base Store
 * Zustand state management for knowledge base feature
 * Connected to /api/v1/documents API
 */

import { create } from 'zustand'
import { fetchWithCsrf } from '@/lib/csrf'
import type { KnowledgeBaseDocument, DocumentSortField, SortDirection, CategoryWithCount } from '@/types/knowledge-base'
import type { DocumentCategory, IndexStatus } from '@/types/audienceos/database'
import { getCategoryCounts, filterDocuments, sortDocuments } from '@/lib/audienceos/constants/knowledge-base'

interface DocumentFilters {
  query: string
  category: DocumentCategory | 'all'
  indexStatus: IndexStatus | 'all'
  clientId: string | 'global' | 'all'
}

interface DocumentSort {
  field: DocumentSortField
  direction: SortDirection
}

type ViewMode = 'grid' | 'list'

interface KnowledgeBaseState {
  // Documents
  documents: KnowledgeBaseDocument[]
  filteredDocuments: KnowledgeBaseDocument[]
  selectedDocument: KnowledgeBaseDocument | null
  isLoading: boolean
  error: string | null

  // Categories
  categories: CategoryWithCount[]

  // Filters
  filters: DocumentFilters
  sort: DocumentSort
  viewMode: ViewMode

  // Modals
  isUploadModalOpen: boolean
  isPreviewModalOpen: boolean

  // Actions
  fetchDocuments: () => Promise<void>
  setDocuments: (documents: KnowledgeBaseDocument[]) => void
  setSelectedDocument: (document: KnowledgeBaseDocument | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void

  // Filter actions
  setSearchQuery: (query: string) => void
  setCategory: (category: DocumentCategory | 'all') => void
  setIndexStatus: (status: IndexStatus | 'all') => void
  setClientFilter: (clientId: string | 'global' | 'all') => void
  clearFilters: () => void

  // Sort actions
  setSortField: (field: DocumentSortField) => void
  setSortDirection: (direction: SortDirection) => void
  toggleSortDirection: () => void

  // View actions
  setViewMode: (mode: ViewMode) => void

  // Modal actions
  openUploadModal: () => void
  closeUploadModal: () => void
  openPreviewModal: (document: KnowledgeBaseDocument) => void
  closePreviewModal: () => void

  // Document actions
  addDocument: (document: KnowledgeBaseDocument) => void
  updateDocument: (id: string, updates: Partial<KnowledgeBaseDocument>) => void
  deleteDocument: (id: string) => Promise<boolean>
  reindexDocument: (id: string) => Promise<void>
  uploadDocument: (file: File, title: string, category: DocumentCategory, clientId?: string) => Promise<KnowledgeBaseDocument | null>

  // Refresh
  applyFiltersAndSort: () => void
  refreshDocuments: () => Promise<void>
}

const defaultFilters: DocumentFilters = {
  query: '',
  category: 'all',
  indexStatus: 'all',
  clientId: 'all',
}

const defaultSort: DocumentSort = {
  field: 'updated_at',
  direction: 'desc',
}

// Transform API response to KnowledgeBaseDocument format
function transformDocument(apiDoc: Record<string, unknown>): KnowledgeBaseDocument {
  const client = apiDoc.client as { name?: string } | null | undefined
  const uploader = apiDoc.uploader as { first_name?: string } | null | undefined

  return {
    id: apiDoc.id as string,
    agency_id: apiDoc.agency_id as string,
    title: apiDoc.title as string,
    file_name: apiDoc.file_name as string,
    file_size: apiDoc.file_size as number,
    mime_type: apiDoc.mime_type as string,
    storage_path: apiDoc.storage_path as string,
    category: apiDoc.category as DocumentCategory,
    client_id: (apiDoc.client_id as string) || null,
    client_name: client?.name || undefined,
    page_count: (apiDoc.page_count as number) || null,
    word_count: (apiDoc.word_count as number) || null,
    index_status: apiDoc.index_status as IndexStatus,
    gemini_file_id: (apiDoc.gemini_file_id as string) || null,
    uploaded_by: apiDoc.uploaded_by as string,
    uploader_name: uploader?.first_name || undefined,
    is_active: apiDoc.is_active as boolean,
    created_at: apiDoc.created_at as string,
    updated_at: apiDoc.updated_at as string,
    // Default values for fields that may not exist in DB
    tags: (apiDoc.tags as string[]) || [],
    description: (apiDoc.description as string) || null,
    usage_count: (apiDoc.usage_count as number) || 0,
  }
}

export const useKnowledgeBaseStore = create<KnowledgeBaseState>((set, get) => ({
  // Initial state - empty until fetched
  documents: [],
  filteredDocuments: [],
  selectedDocument: null,
  isLoading: false,
  error: null,
  categories: getCategoryCounts([]),
  filters: defaultFilters,
  sort: defaultSort,
  viewMode: 'grid',
  isUploadModalOpen: false,
  isPreviewModalOpen: false,

  // Fetch documents from API
  fetchDocuments: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await fetch('/api/v1/documents', { credentials: 'include' })

      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }

      const { data } = await response.json()
      const documents = (data || []).map(transformDocument)

      set({
        documents,
        isLoading: false,
      })
      get().applyFiltersAndSort()
      set((state) => ({
        categories: getCategoryCounts(state.documents),
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load documents',
        isLoading: false,
      })
    }
  },

  // Document setters
  setDocuments: (documents) => {
    set({ documents })
    get().applyFiltersAndSort()
  },

  setSelectedDocument: (selectedDocument) => set({ selectedDocument }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Filter setters
  setSearchQuery: (query) => {
    set((state) => ({
      filters: { ...state.filters, query },
    }))
    get().applyFiltersAndSort()
  },

  setCategory: (category) => {
    set((state) => ({
      filters: { ...state.filters, category },
    }))
    get().applyFiltersAndSort()
  },

  setIndexStatus: (indexStatus) => {
    set((state) => ({
      filters: { ...state.filters, indexStatus },
    }))
    get().applyFiltersAndSort()
  },

  setClientFilter: (clientId) => {
    set((state) => ({
      filters: { ...state.filters, clientId },
    }))
    get().applyFiltersAndSort()
  },

  clearFilters: () => {
    set({ filters: defaultFilters })
    get().applyFiltersAndSort()
  },

  // Sort setters
  setSortField: (field) => {
    set((state) => ({
      sort: { ...state.sort, field },
    }))
    get().applyFiltersAndSort()
  },

  setSortDirection: (direction) => {
    set((state) => ({
      sort: { ...state.sort, direction },
    }))
    get().applyFiltersAndSort()
  },

  toggleSortDirection: () => {
    set((state) => ({
      sort: {
        ...state.sort,
        direction: state.sort.direction === 'asc' ? 'desc' : 'asc',
      },
    }))
    get().applyFiltersAndSort()
  },

  // View mode
  setViewMode: (viewMode) => set({ viewMode }),

  // Modal actions
  openUploadModal: () => set({ isUploadModalOpen: true }),
  closeUploadModal: () => set({ isUploadModalOpen: false }),

  openPreviewModal: (document) =>
    set({
      selectedDocument: document,
      isPreviewModalOpen: true,
    }),

  closePreviewModal: () =>
    set({
      isPreviewModalOpen: false,
    }),

  // Document mutations
  addDocument: (document) => {
    set((state) => ({
      documents: [document, ...state.documents],
    }))
    get().applyFiltersAndSort()
    set((state) => ({
      categories: getCategoryCounts(state.documents),
    }))
  },

  updateDocument: (id, updates) => {
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.id === id ? { ...doc, ...updates } : doc
      ),
    }))
    get().applyFiltersAndSort()
    set((state) => ({
      categories: getCategoryCounts(state.documents),
    }))
  },

  deleteDocument: async (id) => {
    try {
      const response = await fetchWithCsrf(`/api/v1/documents/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id),
        selectedDocument: state.selectedDocument?.id === id ? null : state.selectedDocument,
      }))
      get().applyFiltersAndSort()
      set((state) => ({
        categories: getCategoryCounts(state.documents),
      }))

      return true
    } catch (error) {
      console.error('Failed to delete document:', error)
      return false
    }
  },

  reindexDocument: async (id) => {
    // Set status to indexing optimistically
    get().updateDocument(id, { index_status: 'indexing', gemini_file_id: null })

    try {
      const response = await fetchWithCsrf(`/api/v1/documents/process`, {
        method: 'POST',
        body: JSON.stringify({ document_id: id }),
      })

      if (!response.ok) {
        throw new Error('Failed to trigger reindex')
      }

      // Poll or wait for completion - for now just refresh after delay
      setTimeout(async () => {
        await get().fetchDocuments()
      }, 3000)
    } catch (error) {
      console.error('Failed to reindex document:', error)
      get().updateDocument(id, { index_status: 'failed' })
    }
  },

  uploadDocument: async (file, title, category, clientId) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title)
      formData.append('category', category)
      if (clientId) {
        formData.append('client_id', clientId)
      }

      const response = await fetchWithCsrf('/api/v1/documents', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type - browser will set it with boundary for FormData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload document')
      }

      const { data } = await response.json()
      const document = transformDocument(data)

      // Add to local state
      get().addDocument(document)

      return document
    } catch (error) {
      console.error('Failed to upload document:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to upload document' })
      return null
    }
  },

  // Apply filters and sort
  applyFiltersAndSort: () => {
    const { documents, filters, sort } = get()

    let filtered = filterDocuments(documents, {
      query: filters.query,
      category: filters.category,
      indexStatus: filters.indexStatus,
      clientId: filters.clientId,
    })

    filtered = sortDocuments(filtered, sort.field, sort.direction)

    set({ filteredDocuments: filtered })
  },

  // Refresh from API (alias for fetchDocuments)
  refreshDocuments: async () => {
    await get().fetchDocuments()
  },
}))
