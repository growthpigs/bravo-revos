'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Plus, Calendar, Eye, Pencil, Trash2, MoreVertical, Heart, MessageSquare, Share2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'

interface Post {
  id: string
  content: string
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  campaign_id: string | null
  scheduled_for: string | null
  published_at: string | null
  created_at: string
  metrics: {
    likes?: number
    comments?: number
    shares?: number
  }
  campaigns?: {
    id: string
    name: string
  }
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const router = useRouter()

  useEffect(() => {
    fetchPosts()
  }, [filter])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.set('status', filter)
      }
      const response = await fetch(`/api/posts?${params.toString()}`)
      const data = await response.json()
      if (data.success) {
        setPosts(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const response = await fetch(`/api/posts?id=${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setPosts(posts.filter(p => p.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
  }

  const getStatusBadge = (status: Post['status']) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-700',
      scheduled: 'bg-blue-100 text-blue-700',
      published: 'bg-emerald-100 text-emerald-700',
      failed: 'bg-red-100 text-red-700',
    }
    return (
      <Badge className={styles[status]} variant="secondary">
        {status}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getPreview = (content: string, maxLength = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength).trim() + '...'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Posts</h1>
          <p className="text-slate-600 mt-1">
            Manage your LinkedIn posts
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard')}>
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Posts Count */}
      <p className="text-sm text-slate-600">
        {posts.length} {posts.length === 1 ? 'post' : 'posts'}
      </p>

      {/* Posts List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading posts...</div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">No posts yet</h3>
            <p className="text-slate-600 mt-2">
              Create your first LinkedIn post by typing &quot;write&quot; or &quot;post&quot; in the chat.
            </p>
            <Button className="mt-4" onClick={() => router.push('/dashboard')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Content Preview */}
                    <p className="text-slate-900 line-clamp-3">
                      {getPreview(post.content)}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                      <span>{formatDate(post.created_at)}</span>
                      {post.campaigns && (
                        <Badge variant="outline" className="text-xs">
                          {post.campaigns.name}
                        </Badge>
                      )}
                      {post.scheduled_for && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(post.scheduled_for)}
                        </span>
                      )}
                    </div>

                    {/* Metrics (if published) */}
                    {post.status === 'published' && (
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {post.metrics?.likes || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {post.metrics?.comments || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="h-3 w-3" />
                          {post.metrics?.shares || 0}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-2">
                    {getStatusBadge(post.status)}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(post.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
