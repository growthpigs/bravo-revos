import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MessageSquare, Heart, Share2, Loader } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PostsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user?.id || '')
    .single()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('client_id', userData?.client_id || '')
    .order('created_at', { ascending: false })

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      status,
      metrics,
      created_at,
      campaign_id,
      campaigns(name)
    `)
    .eq('client_id', userData?.client_id || '')
    .order('created_at', { ascending: false })

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    published: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">LinkedIn Posts</h1>
          <p className="text-gray-600 mt-2">
            Create and manage LinkedIn posts for your campaigns
          </p>
        </div>
        <Link href="/dashboard/demo-post-creation">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </Link>
      </div>

      {posts && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post: any) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.campaigns && (
                        <Badge variant="outline">{post.campaigns.name}</Badge>
                      )}
                      <Badge className={statusColors[post.status]} variant="secondary">
                        {post.status}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-3 text-gray-900">
                      {post.content}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    <span>{post.metrics?.likes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{post.metrics?.comments || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Share2 className="h-4 w-4" />
                    <span>{post.metrics?.shares || 0}</span>
                  </div>
                  <div className="text-xs text-gray-500 ml-auto">
                    {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Link href={`/dashboard/posts/${post.id}`}>
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No posts yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first LinkedIn post to start engaging with your audience
            </p>
            <Link href="/dashboard/demo-post-creation">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {campaigns && campaigns.length > 0 && (
        <div className="mt-8 pt-8 border-t">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Campaigns ({campaigns.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign: any) => (
              <Card key={campaign.id} className="text-center py-6">
                <CardContent>
                  <h3 className="font-semibold text-gray-900 mb-2">{campaign.name}</h3>
                  <Link href={`/dashboard/campaigns/${campaign.id}`}>
                    <Button variant="outline" className="w-full">
                      View Campaign
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
