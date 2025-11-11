'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Loader, Trash2 } from 'lucide-react'
import { LinkPostModal } from './LinkPostModal'
import Link from 'next/link'

interface Post {
  id: string
  title: string
  description?: string
  content: string
  file_type: string
  created_at: string
  metadata?: any
}

interface CampaignPostsSectionProps {
  campaignId: string
  onDataLoaded?: (posts: Post[]) => void
}

const FETCH_TIMEOUT = 8000 // 8 second timeout

export function CampaignPostsSection({ campaignId, onDataLoaded }: CampaignPostsSectionProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showLinkModal, setShowLinkModal] = useState(false)

  const fetchLinkedPosts = async () => {
    try {
      setIsLoading(true)
      setError('')

      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

      const res = await fetch(`/api/campaigns/${campaignId}/documents?limit=100`, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch posts`)
      }

      const data = await res.json()

      // Extract only posts (where metadata.is_post === true or source === 'chat_document_viewer')
      const allDocs = data.documents?.map((link: any) => link.knowledge_base_documents) || []
      const postsOnly = allDocs.filter((doc: any) => {
        return doc && (doc.metadata?.is_post === true || doc.metadata?.source === 'chat_document_viewer')
      })

      setPosts(postsOnly)
      if (onDataLoaded) {
        onDataLoaded(postsOnly)
      }
    } catch (error) {
      // Don't set error state - just log and continue with empty posts
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('[CAMPAIGN_POSTS] Error fetching posts:', error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLinkedPosts()
  }, [campaignId])

  const handleUnlink = async (postId: string) => {
    if (!confirm('Are you sure you want to remove this post from the campaign?')) {
      return
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

      const res = await fetch(
        `/api/campaigns/${campaignId}/documents?document_id=${postId}`,
        {
          method: 'DELETE',
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      if (res.ok) {
        setPosts(posts.filter((post) => post.id !== postId))
      } else {
        alert('Failed to remove post')
      }
    } catch (error) {
      console.error('[CAMPAIGN_POSTS] Error unlinking post:', error)
      alert('Error removing post')
    }
  }

  const handlePostLinked = () => {
    fetchLinkedPosts()
    setShowLinkModal(false)
  }

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <>
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              <div>
                <CardTitle className="text-green-900">Campaign Posts</CardTitle>
                <CardDescription className="text-green-700">
                  Posts to publish ({posts.length})
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowLinkModal(true)} className="gap-2" variant="outline">
              <Plus className="h-4 w-4" />
              Link Post
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 animate-spin text-green-400" />
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-2">
              {posts.map((post) => {
                const createdDate = new Date(post.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                return (
                  <div
                    key={post.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-white hover:bg-green-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 line-clamp-1">{post.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-medium">
                          Post
                        </span>
                        <span className="text-xs text-gray-500">{createdDate}</span>
                      </div>
                      {post.content && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {truncateContent(post.content)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <Link href={`/dashboard/working-document?post_id=${post.id}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlink(post.id)}
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
              <FileText className="h-8 w-8 text-green-300 mx-auto mb-2" />
              <p className="text-sm text-green-900 mb-4">No posts linked to this campaign yet</p>
              <p className="text-xs text-green-700 mb-4">Create posts in Working Document chat and save them to this campaign to see them here.</p>
              <Button onClick={() => setShowLinkModal(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Link a Post
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showLinkModal && (
        <LinkPostModal
          campaignId={campaignId}
          onClose={() => setShowLinkModal(false)}
          onPostLinked={handlePostLinked}
        />
      )}
    </>
  )
}
