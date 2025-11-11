'use client'

import React, { useEffect, useState } from 'react'
import { X, Loader, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Post {
  id: string
  title: string
  content: string
  created_at: string
}

interface LinkPostModalProps {
  campaignId: string
  onClose: () => void
  onPostLinked: () => void
}

export function LinkPostModal({ campaignId, onClose, onPostLinked }: LinkPostModalProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [linkedPostIds, setLinkedPostIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPostId, setSelectedPostId] = useState<string>('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAvailablePosts()
    fetchLinkedPosts()
  }, [campaignId])

  const fetchAvailablePosts = async () => {
    try {
      const res = await fetch('/api/knowledge-base?limit=100')
      if (res.ok) {
        const data = await res.json()
        // Filter for posts (where metadata.is_post === true or source === 'chat_document_viewer')
        const allDocs = data.documents || []
        const postsOnly = allDocs.filter((doc: any) => {
          return doc.metadata?.is_post === true || doc.metadata?.source === 'chat_document_viewer'
        })
        setPosts(postsOnly)
        if (postsOnly.length > 0 && !selectedPostId) {
          setSelectedPostId(postsOnly[0].id)
        }
      }
    } catch (error) {
      console.error('[LINK_POST] Error fetching posts:', error)
      setError('Failed to load posts')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLinkedPosts = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/documents?limit=100`)
      if (res.ok) {
        const data = await res.json()
        const linkedIds = data.documents
          ?.map((link: any) => link.knowledge_base_documents?.id)
          .filter(Boolean) || []
        setLinkedPostIds(linkedIds)
      }
    } catch (error) {
      console.error('[LINK_POST] Error fetching linked posts:', error)
    }
  }

  const handleLink = async () => {
    if (!selectedPostId) {
      setError('Please select a post')
      return
    }

    try {
      setIsLinking(true)
      setError('')

      const res = await fetch(`/api/campaigns/${campaignId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: selectedPostId }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 409) {
          setError('This post is already linked to the campaign')
        } else {
          throw new Error(data.error || 'Failed to link post')
        }
        return
      }

      onPostLinked()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to link post'
      setError(errorMsg)
    } finally {
      setIsLinking(false)
    }
  }

  const filteredPosts = posts.filter(
    (post) =>
      !linkedPostIds.includes(post.id) &&
      post.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const unlinkPosts = posts.filter((post) => linkedPostIds.includes(post.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 hover:bg-gray-100"
          aria-label="Close modal"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {/* Header */}
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Link Posts to Campaign</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Available Posts Section */}
        <div className="mb-8">
          <h3 className="mb-3 font-semibold text-gray-900">Available Posts</h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredPosts.length === 0 && posts.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-6 text-center">
              <p className="text-sm text-gray-600">No posts found. Create posts in Working Document chat first.</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-6 text-center">
              <p className="text-sm text-gray-600">No available posts match your search or all posts are already linked.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredPosts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPostId(post.id)}
                    className={`w-full text-left p-3 transition-colors border-l-4 ${
                      selectedPostId === post.id
                        ? 'bg-emerald-50 border-l-emerald-600'
                        : 'border-l-transparent hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-gray-900 line-clamp-1">{post.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Already Linked Section */}
        {unlinkPosts.length > 0 && (
          <div className="mb-8 pb-8 border-b">
            <h3 className="mb-3 font-semibold text-gray-900">Already Linked ({unlinkPosts.length})</h3>
            <div className="space-y-2">
              {unlinkPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 line-clamp-1">{post.title}</p>
                  </div>
                  <span className="text-xs text-emerald-700 ml-2 whitespace-nowrap">✓ Linked</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLinking}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          >
            Close
          </button>
          <button
            onClick={handleLink}
            disabled={isLinking || !selectedPostId || filteredPosts.length === 0}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isLinking ? (
              <div className="flex items-center justify-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                Linking...
              </div>
            ) : (
              'Link Selected Post'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
