/**
 * Knowledge Base Constants
 *
 * Static configuration data for the knowledge base feature.
 * These were extracted from mock-knowledge-base.ts during cleanup.
 */

import type { KnowledgeBaseDocument, CategoryWithCount, DocumentSearchResult } from '@/types/knowledge-base'
import type { DocumentCategory, IndexStatus } from '@/types/database'

// Quick links for the knowledge base dashboard
export const quickLinks = [
  { title: 'Shopify Partner Portal', url: 'https://partners.shopify.com' },
  { title: 'Meta Business Suite', url: 'https://business.facebook.com' },
  { title: 'Google Tag Manager', url: 'https://tagmanager.google.com' },
  { title: 'Training Videos', url: '#' },
] as const

// Calculate category counts from documents
export function getCategoryCounts(documents: KnowledgeBaseDocument[]): CategoryWithCount[] {
  const counts: Record<string, number> = {
    all: documents.length,
    installation: 0,
    tech: 0,
    support: 0,
    process: 0,
    client_specific: 0,
  }

  documents.forEach((doc) => {
    if (counts[doc.category] !== undefined) {
      counts[doc.category]++
    }
  })

  return [
    { category: 'all', count: counts.all, label: 'All Categories' },
    { category: 'installation', count: counts.installation, label: 'Installation' },
    { category: 'tech', count: counts.tech, label: 'Technical' },
    { category: 'support', count: counts.support, label: 'Support' },
    { category: 'process', count: counts.process, label: 'Process' },
    { category: 'client_specific', count: counts.client_specific, label: 'Client-Specific' },
  ]
}

// Filter and search documents
export function filterDocuments(
  documents: KnowledgeBaseDocument[],
  filters: {
    query?: string
    category?: DocumentCategory | 'all'
    indexStatus?: IndexStatus | 'all'
    clientId?: string | 'global' | 'all'
  }
): KnowledgeBaseDocument[] {
  return documents.filter((doc) => {
    // Search query
    if (filters.query) {
      const query = filters.query.toLowerCase()
      const matchesTitle = doc.title.toLowerCase().includes(query)
      const matchesDescription = doc.description?.toLowerCase().includes(query)
      const matchesTags = doc.tags.some((tag) => tag.toLowerCase().includes(query))
      if (!matchesTitle && !matchesDescription && !matchesTags) {
        return false
      }
    }

    // Category filter
    if (filters.category && filters.category !== 'all' && doc.category !== filters.category) {
      return false
    }

    // Index status filter
    if (filters.indexStatus && filters.indexStatus !== 'all' && doc.index_status !== filters.indexStatus) {
      return false
    }

    // Client filter
    if (filters.clientId) {
      if (filters.clientId === 'global' && doc.client_id !== null) {
        return false
      }
      if (filters.clientId !== 'all' && filters.clientId !== 'global' && doc.client_id !== filters.clientId) {
        return false
      }
    }

    return true
  })
}

// Sort documents
export function sortDocuments(
  documents: KnowledgeBaseDocument[],
  sortBy: 'title' | 'created_at' | 'updated_at' | 'file_size' | 'usage_count',
  direction: 'asc' | 'desc'
): KnowledgeBaseDocument[] {
  return [...documents].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title)
        break
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
      case 'updated_at':
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        break
      case 'file_size':
        comparison = a.file_size - b.file_size
        break
      case 'usage_count':
        comparison = a.usage_count - b.usage_count
        break
    }

    return direction === 'desc' ? -comparison : comparison
  })
}

// Add search highlighting
export function addHighlighting(
  documents: KnowledgeBaseDocument[],
  query: string
): DocumentSearchResult[] {
  if (!query) {
    return documents.map((doc) => ({ ...doc }))
  }

  const terms = query.toLowerCase().split(' ').filter(Boolean)

  return documents.map((doc) => {
    const result: DocumentSearchResult = { ...doc }

    // Simple highlighting by wrapping matches in <mark> tags
    const highlightText = (text: string | null | undefined): string | undefined => {
      if (!text) return undefined
      let highlighted = text
      terms.forEach((term) => {
        const regex = new RegExp(`(${term})`, 'gi')
        highlighted = highlighted.replace(regex, '<mark>$1</mark>')
      })
      return highlighted
    }

    result.highlights = {
      title: highlightText(doc.title),
      description: highlightText(doc.description),
    }

    return result
  })
}
