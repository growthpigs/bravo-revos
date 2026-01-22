import { useState, useCallback } from 'react'

interface DocumentSearchResult {
  answer: string
  documentsSearched: Array<{
    id: string
    title: string
    category: string
    gemini_file_id: string
  }>
  query: string
  timestamp: string
}

interface SearchOptions {
  categories?: string[]
  client_id?: string
}

export function useDocumentSearch() {
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<DocumentSearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const searchDocuments = useCallback(async (
    query: string,
    options: SearchOptions = {}
  ): Promise<DocumentSearchResult> => {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required')
    }

    try {
      setIsSearching(true)
      setError(null)

      const response = await fetch('/api/v1/documents/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          ...options
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Search failed: ${response.status}`)
      }

      const result = await response.json()
      setResults(result)
      return result

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed'
      setError(message)
      throw error
    } finally {
      setIsSearching(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults(null)
    setError(null)
  }, [])

  return {
    isSearching,
    results,
    error,
    searchDocuments,
    clearResults,
  }
}