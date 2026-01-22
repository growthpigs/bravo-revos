import { useState } from 'react'
import { useKnowledgeBaseStore } from '@/stores/knowledge-base-store'
import type { KnowledgeBaseDocument } from '@/types/knowledge-base'
import type { DocumentCategory } from '@/types/database'

interface UploadOptions {
  title: string
  category: DocumentCategory
  clientId?: string
}

export function useDocumentUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const addDocument = useKnowledgeBaseStore((state) => state.addDocument)

  const uploadDocument = async (file: File, options: UploadOptions): Promise<KnowledgeBaseDocument | null> => {
    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      // Validate file
      const validMimeTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
      if (!validMimeTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT are allowed')
      }

      const maxSize = 50 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error('File size exceeds 50MB limit')
      }

      if (!options.title.trim()) {
        throw new Error('Title is required')
      }

      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', options.title)
      formData.append('category', options.category)
      if (options.clientId) {
        formData.append('client_id', options.clientId)
      }

      // Simulate upload progress (actual tracking would require fetch with progress events)
      setProgress(25)

      // Upload via API
      const response = await fetch('/api/v1/documents', {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRF-Token': getCsrfToken(),
        },
      })

      setProgress(75)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const { data: document } = await response.json()

      // Add to store
      addDocument(document as KnowledgeBaseDocument)

      setProgress(100)
      return document
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  return {
    uploadDocument,
    isUploading,
    progress,
    error,
  }
}

// Helper to get CSRF token from meta tag or cookie
function getCsrfToken(): string {
  // Try to get from meta tag first
  const metaTag = document.querySelector('meta[name="csrf-token"]')
  if (metaTag) {
    return metaTag.getAttribute('content') || ''
  }

  // Fallback: generate a dummy token (in production, use actual CSRF token)
  return ''
}
