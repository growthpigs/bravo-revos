import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function PodLeaderboard({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  // Get pod info
  const { data: pod, error: podError } = await supabase
    .from('pods')
    .select('id, name')
    .eq('id', params.id)
    .maybeSingle();

  if (podError || !pod) {
    notFound();
  }

  // Get top performers (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: topPosts, error: postsError } = await supabase
    .from('post_analytics')
    .select(
      `
      id,
      post_hook,
      post_content,
      impressions,
      likes,
      comments,
      shares,
      engagement_rate,
      posted_at,
      user_id,
      users (
        first_name,
        last_name,
        avatar_url
      )
    `
    )
    .eq('pod_id', params.id)
    .gte('posted_at', sevenDaysAgo.toISOString())
    .order('engagement_rate', { ascending: false })
    .limit(10);

  if (postsError) {
    console.error('[POD_LEADERBOARD] Error fetching posts:', postsError);
  }

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const getTotalEngagement = (post: any) => {
    return post.likes + post.comments + post.shares;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{pod?.name} Leaderboard</h1>
        <p className="text-gray-600">Top performers this week</p>
      </div>

      {topPosts && topPosts.length > 0 ? (
        <div className="space-y-4">
          {topPosts.map((post: any, index: number) => (
            <div key={post.id} className="border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                {/* Medal */}
                <div className="text-4xl font-bold text-center min-w-12 flex items-center justify-center">
                  {getMedalEmoji(index)}
                </div>

                {/* Content */}
                <div className="flex-1">
                  {/* User info */}
                  <div className="flex items-center gap-3 mb-3">
                    {post.users?.avatar_url && (
                      <img
                        src={post.users.avatar_url}
                        alt={post.users?.first_name}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <span className="font-semibold text-gray-900">
                      {post.users?.first_name} {post.users?.last_name}
                    </span>
                  </div>

                  {/* Post preview */}
                  <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                    {post.post_hook || post.post_content?.substring(0, 150) || 'No content'}
                    {post.post_content && post.post_content.length > 150 ? '...' : ''}
                  </p>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <div className="bg-blue-50 rounded p-3">
                      <div className="text-xs text-gray-600 font-medium">Impressions</div>
                      <div className="text-lg font-bold text-blue-900">{post.impressions}</div>
                    </div>

                    <div className="bg-red-50 rounded p-3">
                      <div className="text-xs text-gray-600 font-medium">Likes</div>
                      <div className="text-lg font-bold text-red-900">👍 {post.likes}</div>
                    </div>

                    <div className="bg-green-50 rounded p-3">
                      <div className="text-xs text-gray-600 font-medium">Comments</div>
                      <div className="text-lg font-bold text-green-900">💬 {post.comments}</div>
                    </div>

                    <div className="bg-purple-50 rounded p-3">
                      <div className="text-xs text-gray-600 font-medium">Shares</div>
                      <div className="text-lg font-bold text-purple-900">🔄 {post.shares}</div>
                    </div>

                    <div className="bg-amber-50 rounded p-3">
                      <div className="text-xs text-gray-600 font-medium">Engagement</div>
                      <div className="text-lg font-bold text-amber-900">
                        {getTotalEngagement(post)}
                      </div>
                    </div>
                  </div>

                  {/* Engagement rate */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Engagement Rate</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min(
                                (post.engagement_rate || 0) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {((post.engagement_rate || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-lg">No posts yet this week</p>
          <p className="text-gray-500 text-sm mt-2">
            Posts and their engagement data will appear here as members contribute to the pod.
          </p>
        </div>
      )}
    </div>
  );
}
