'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Loader, Trash2, Share2 } from 'lucide-react'
import { LinkPostModal } from './LinkPostModal'
import Link from 'next/link'

interface Post {
  id: string
  title: string
  description?: string
  content: string
  file_type: string
  created_at: string
}

interface CampaignPostsSectionProps {
  campaignId: string
}

export function CampaignPostsSection({ campaignId }: CampaignPostsSectionProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLinkModal, setShowLinkModal] = useState(false)

  const fetchLinkedPosts = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}/documents?limit=100`)
      if (res.ok) {
        const data = await res.json()
        // Extract only posts (where metadata.is_post === true)
        const allDocs = data.documents?.map((link: any) => link.knowledge_base_documents) || []
        const postsOnly = allDocs.filter((doc: any) => {
          return doc && (doc.metadata?.is_post === true || doc.metadata?.source === 'chat_document_viewer')
        })
        setPosts(postsOnly)
      }
    } catch (error) {
      console.error('[CAMPAIGN_POSTS] Error fetching posts:', error)
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
      const res = await fetch(
        `/api/campaigns/${campaignId}/documents?document_id=${postId}`,
        { method: 'DELETE' }
      )

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

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-emerald-600" />
              <div>
                <CardTitle>Campaign Posts</CardTitle>
                <CardDescription>
                  Posts ready to publish ({posts.length})
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowLinkModal(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" />
              Add Post
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-3">
              {posts.map((post) => {
                const createdDate = new Date(post.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                return (
                  <div
                    key={post.id}
                    className="flex flex-col p-4 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 line-clamp-1">{post.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{createdDate}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlink(post.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {truncateContent(post.content, 150)}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Share2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-2">No posts yet</p>
              <p className="text-xs text-gray-600 mb-4 max-w-sm mx-auto">
                Create posts in Working Document chat, then save them to this campaign.
              </p>
              <Button onClick={() => setShowLinkModal(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Post
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
