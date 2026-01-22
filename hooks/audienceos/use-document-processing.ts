import { useState, useCallback } from 'react'

interface ProcessingStatus {
  pending: number
  indexing: number
  indexed: number
  failed: number
  total: number
}

interface ProcessingResult {
  processed: number
  skipped: number
  failed: number
  details: Array<{
    id: string
    status: string
    error?: string
  }>
}

export function useDocumentProcessing() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState<ProcessingStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch current processing status
  const fetchStatus = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/v1/documents/process')

      // Handle auth/server errors gracefully - return empty status instead of throwing
      if (response.status === 401 || response.status === 500) {
        // Not authenticated or server error - just show empty state
        setStatus({
          pending: 0,
          indexing: 0,
          indexed: 0,
          failed: 0,
          total: 0
        })
        // Only set error for 500 (user should know server has issues)
        if (response.status === 500) {
          setError('Server temporarily unavailable')
        }
        return { counts: null, total: 0 }
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.status}`)
      }

      const data = await response.json()
      setStatus(data.counts ? {
        pending: data.counts.pending || 0,
        indexing: data.counts.indexing || 0,
        indexed: data.counts.indexed || 0,
        failed: data.counts.failed || 0,
        total: data.total || 0
      } : null)

      return data

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch processing status'
      setError(message)
      throw error
    }
  }, [])

  // Start processing pending documents
  const startProcessing = useCallback(async (): Promise<ProcessingResult> => {
    try {
      setIsProcessing(true)
      setError(null)

      // Get CSRF token from meta tag (consistent with upload hook)
      const csrfToken = getCsrfToken()
      if (!csrfToken) {
        throw new Error('CSRF token not found. Page may need to be reloaded.')
      }

      const response = await fetch('/api/v1/documents/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Processing failed: ${response.status}`)
      }

      const result = await response.json()

      // Refresh status after processing
      await fetchStatus()

      return result

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Processing failed'
      setError(message)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [fetchStatus])

  return {
    isProcessing,
    status,
    error,
    fetchStatus,
    startProcessing,
  }
}

// Helper to get CSRF token from meta tag (consistent with upload hook)
function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''

  const metaTag = document.querySelector('meta[name="csrf-token"]')
  if (metaTag) {
    return metaTag.getAttribute('content') || ''
  }
  return ''
}