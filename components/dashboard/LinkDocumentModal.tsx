'use client'

import React, { useEffect, useState } from 'react'
import { X, Loader, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Document {
  id: string
  title: string
  description?: string
  file_type: string
  created_at: string
}

interface LinkDocumentModalProps {
  campaignId: string
  onClose: () => void
  onDocumentLinked: () => void
}

export function LinkDocumentModal({
  campaignId,
  onClose,
  onDocumentLinked,
}: LinkDocumentModalProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [linking, setLinking] = useState<string | null>(null)

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/knowledge-base?limit=100')
        if (res.ok) {
          const data = await res.json()
          setDocuments(data.documents || [])
        } else {
          setError('Failed to load documents')
        }
      } catch (err) {
        console.error('[LINK_DOC_MODAL] Error fetching documents:', err)
        setError('Error loading documents')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocuments()
  }, [])

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleLinkDocument = async (documentId: string) => {
    setLinking(documentId)
    setError('')

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 409) {
          setError('This document is already linked to the campaign')
        } else {
          setError(data.error || 'Failed to link document')
        }
        setLinking(null)
        return
      }

      onDocumentLinked()
    } catch (err) {
      console.error('[LINK_DOC_MODAL] Error linking document:', err)
      setError('Error linking document')
      setLinking(null)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Link Document to Campaign</DialogTitle>
          <DialogDescription>
            Select a document from your knowledge base to link to this campaign
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search documents by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-600">
                {searchTerm ? 'No documents match your search' : 'No documents in knowledge base'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredDocuments.map((doc) => {
                const createdDate = new Date(doc.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                const fileTypeLabel =
                  doc.file_type === 'markdown'
                    ? 'MD'
                    : doc.file_type === 'pdf'
                      ? 'PDF'
                      : doc.file_type === 'url'
                        ? 'URL'
                        : 'DOC'

                return (
                  <div
                    key={doc.id}
                    className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{doc.title}</p>
                      {doc.description && (
                        <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                          {doc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                          {fileTypeLabel}
                        </span>
                        <span className="text-xs text-gray-500">{createdDate}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleLinkDocument(doc.id)}
                      disabled={linking === doc.id}
                      className="ml-3 flex-shrink-0 gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      {linking === doc.id && (
                        <Loader className="h-4 w-4 animate-spin" />
                      )}
                      {linking === doc.id ? 'Linking...' : 'Link'}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Close Button */}
        <Button variant="outline" onClick={onClose} className="w-full">
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  )
}
