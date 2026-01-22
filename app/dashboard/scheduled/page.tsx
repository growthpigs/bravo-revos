import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Target } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ScheduledActionsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Get scheduled posts
  const { data: posts } = await supabase
    .from('post')
    .select(`
      id,
      content,
      status,
      scheduled_for,
      created_at,
      campaign_id,
      campaigns(name)
    `)
    .eq('user_id', user?.id || '')
    .eq('status', 'scheduled')
    .order('scheduled_for', { ascending: true })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getTimeUntil = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()

    if (diffMs < 0) return 'Overdue'

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`
    if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`
    return 'Soon'
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scheduled Actions</h1>
          <p className="text-gray-500 mt-1">
            View and manage all scheduled posts and actions
          </p>
        </div>
        <Badge variant="outline" className="h-8 px-4">
          {posts?.length || 0} scheduled
        </Badge>
      </div>

      {!posts || posts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No scheduled actions
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Use the chat to schedule posts and they&apos;ll appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post: any) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {post.content.length > 100
                        ? `${post.content.substring(0, 100)}...`
                        : post.content}
                    </CardTitle>
                    <CardDescription className="mt-2 flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {(post.campaigns as any)?.name || 'No campaign'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(post.scheduled_for)}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                    {getTimeUntil(post.scheduled_for)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <p className="line-clamp-2">{post.content}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Created {new Date(post.created_at).toLocaleDateString()}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {post.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
