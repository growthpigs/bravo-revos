'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Loader, Trash2 } from 'lucide-react'
import { LinkDocumentModal } from './LinkDocumentModal'
import Link from 'next/link'

interface Document {
  id: string
  title: string
  description?: string
  file_type: string
  created_at: string
}

interface CampaignDocumentsSectionProps {
  campaignId: string
}

export function CampaignDocumentsSection({ campaignId }: CampaignDocumentsSectionProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLinkModal, setShowLinkModal] = useState(false)

  const fetchLinkedDocuments = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}/documents?limit=100`)
      if (res.ok) {
        const data = await res.json()
        // Extract document data from nested structure
        const docs = data.documents?.map((link: any) => link.knowledge_base_documents) || []
        setDocuments(docs.filter((doc: any) => doc))
      }
    } catch (error) {
      console.error('[CAMPAIGN_DOCS] Error fetching documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLinkedDocuments()
  }, [campaignId])

  const handleUnlink = async (documentId: string) => {
    if (!confirm('Are you sure you want to unlink this document from the campaign?')) {
      return
    }

    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/documents?document_id=${documentId}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        setDocuments(documents.filter((doc) => doc.id !== documentId))
      } else {
        alert('Failed to unlink document')
      }
    } catch (error) {
      console.error('[CAMPAIGN_DOCS] Error unlinking document:', error)
      alert('Error unlinking document')
    }
  }

  const handleDocumentLinked = () => {
    fetchLinkedDocuments()
    setShowLinkModal(false)
  }

  const fileTypeLabel = (type: string) => {
    switch (type) {
      case 'markdown':
        return 'Markdown'
      case 'pdf':
        return 'PDF'
      case 'url':
        return 'URL'
      case 'docx':
        return 'Document'
      default:
        return 'Document'
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>Campaign Posts</CardTitle>
                <CardDescription>
                  Posts and documents for this campaign ({documents.length})
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowLinkModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Link Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => {
                const createdDate = new Date(doc.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 line-clamp-1">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                          {fileTypeLabel(doc.file_type)}
                        </span>
                        <span className="text-xs text-gray-500">{createdDate}</span>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                          {doc.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <Link href={`/dashboard/knowledge-base?campaign_id=${campaignId}`}>
                        <Button variant="outline" size="sm">
                          View in KB
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlink(doc.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-4">No posts linked to this campaign yet</p>
              <p className="text-xs text-gray-500 mb-4">Create posts in Working Document chat and save them to this campaign to see them here.</p>
              <Button onClick={() => setShowLinkModal(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Link a Post
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showLinkModal && (
        <LinkDocumentModal
          campaignId={campaignId}
          onClose={() => setShowLinkModal(false)}
          onDocumentLinked={handleDocumentLinked}
        />
      )}
    </>
  )
}
