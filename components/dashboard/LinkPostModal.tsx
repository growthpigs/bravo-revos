'use client'

import React, { useEffect, useState } from 'react'
import { X, Loader, ChevronDown } from 'lucide-react'

interface Post {
  id: string
  title: string
  created_at: string
  metadata?: any
}

interface LinkPostModalProps {
  campaignId: string
  onClose: () => void
  onPostLinked: () => void
}

const FETCH_TIMEOUT = 8000

export function LinkPostModal({ campaignId, onClose, onPostLinked }: LinkPostModalProps) {
  const [availablePosts, setAvailablePosts] = useState<Post[]>([])
  const [linkedPostIds, setLinkedPostIds] = useState<Set<string>>(new Set())
  const [selectedPostId, setSelectedPostId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAvailablePosts()
  }, [])

  const fetchAvailablePosts = async () => {
    try {
      setIsLoading(true)
      setError('')

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

      // Fetch all documents
      const res = await fetch('/api/knowledge-base?limit=1000', {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch posts`)
      }

      const data = await res.json()
      const allDocs = data.documents || data.data || []

      // Filter to only posts (is_post=true or source=chat_document_viewer)
      const posts = allDocs.filter(
        (doc: any) => doc.metadata?.is_post === true || doc.metadata?.source === 'chat_document_viewer'
      )

      setAvailablePosts(posts)

      // Fetch linked posts to mark them
      const linkedRes = await fetch(`/api/campaigns/${campaignId}/documents?limit=100`, {
        signal: controller.signal,
      })

      if (linkedRes.ok) {
        const linkedData = await linkedRes.json()
        const linkedDocs = linkedData.documents?.map((link: any) => link.knowledge_base_documents) || []
        const linkedIds = new Set(linkedDocs.map((doc: any) => doc.id).filter(Boolean))
        setLinkedPostIds(linkedIds)
      }

      if (posts.length > 0 && !selectedPostId) {
        setSelectedPostId(posts[0].id)
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('[LINK_POST_MODAL] Error:', error.message)
        setError('Failed to load posts. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLinkPost = async () => {
    if (!selectedPostId) {
      setError('Please select a post')
      return
    }

    try {
      setIsLinking(true)
      setError('')

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

      const res = await fetch(`/api/campaigns/${campaignId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: selectedPostId }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`HTTP ${res.status}: ${errorText}`)
      }

      setSuccessMessage('Post linked successfully!')
      setLinkedPostIds(new Set([...linkedPostIds, selectedPostId]))

      setTimeout(() => {
        onPostLinked()
      }, 1000)
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('[LINK_POST_MODAL] Error linking:', error.message)
        setError('Failed to link post. Please try again.')
      }
    } finally {
      setIsLinking(false)
    }
  }

  const filteredPosts = availablePosts.filter(
    (post) => post.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedPost = availablePosts.find((p) => p.id === selectedPostId)
  const isPostLinked = linkedPostIds.has(selectedPostId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 hover:bg-gray-100"
          aria-label="Close modal"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        <h2 className="mb-2 text-xl font-bold text-gray-900">Link Post to Campaign</h2>
        <p className="mb-4 text-sm text-gray-600">
          Select a post from your knowledge base to link to this campaign
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-lg bg-green-50 p-3">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center rounded-lg border border-gray-300 bg-gray-50 py-8">
            <Loader className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Loading posts...</span>
          </div>
        ) : availablePosts.length === 0 ? (
          <div className="rounded-lg border border-gray-300 bg-gray-50 py-8 text-center">
            <p className="text-sm text-gray-500">No posts found</p>
            <p className="mt-1 text-xs text-gray-400">Create posts in Working Document chat first</p>
          </div>
        ) : (
          <>
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Post
              </label>
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-300 bg-white">
                {filteredPosts.length === 0 ? (
                  <div className="px-3 py-2 text-center text-xs text-gray-500">
                    No posts match your search
                  </div>
                ) : (
                  filteredPosts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPostId(post.id)}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                        selectedPostId === post.id
                          ? 'bg-blue-50 text-blue-900'
                          : 'text-gray-900 hover:bg-gray-50'
                      } ${isPostLinked && linkedPostIds.has(post.id) ? 'opacity-60' : ''}`}
                    >
                      <div className="font-medium line-clamp-1">{post.title}</div>
                      {isPostLinked && linkedPostIds.has(post.id) && (
                        <div className="text-xs text-green-600 font-medium">✓ Already linked</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLinking}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLinkPost}
            disabled={isLinking || !selectedPostId || availablePosts.length === 0 || isPostLinked}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLinking ? (
              <div className="flex items-center justify-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                Linking...
              </div>
            ) : isPostLinked ? (
              'Already Linked'
            ) : (
              'Link Post'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
