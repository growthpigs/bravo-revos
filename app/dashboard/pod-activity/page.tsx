'use client';

/**
 * Pod Activity Feed
 * Shows urgent reshare activities from pod members
 */

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users2, ThumbsUp, MessageCircle, Repeat2, ExternalLink, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface PodActivity {
  id: string;
  pod_id: string;
  pod_name: string;
  post_id: string;
  post_url: string;
  engagement_type: 'like' | 'comment' | 'repost';
  scheduled_for: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  execution_attempts: number;
  last_error: string | null;
}

const getEngagementIcon = (type: string) => {
  switch (type) {
    case 'like':
      return ThumbsUp;
    case 'comment':
      return MessageCircle;
    case 'repost':
      return Repeat2;
    default:
      return ThumbsUp;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-green-600 bg-green-50';
    case 'failed':
      return 'text-red-600 bg-red-50';
    case 'pending':
      return 'text-yellow-600 bg-yellow-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export default function PodActivityPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<PodActivity[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const supabase = useMemo(() => createClient(), []);

  // Authenticate user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        console.error('Auth error:', error);
        window.location.href = '/login';
        return;
      }

      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        window.location.href = '/login';
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Load pod activities
  useEffect(() => {
    if (user) {
      loadActivities();
    }
  }, [user, filterStatus]);

  const loadActivities = async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      // Get activities for pods where user is a member
      let query = supabase
        .from('pod_activities')
        .select(`
          *,
          pods!inner(name, client_id),
          pod_members!inner(user_id)
        `)
        .eq('pod_members.user_id', user.id)
        .order('scheduled_for', { ascending: true });

      // Apply status filter
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading activities:', error);
        return;
      }

      // Transform data
      const transformedActivities = (data || []).map((activity: any) => ({
        id: activity.id,
        pod_id: activity.pod_id,
        pod_name: activity.pods.name,
        post_id: activity.post_id,
        post_url: activity.post_url,
        engagement_type: activity.engagement_type,
        scheduled_for: activity.scheduled_for,
        status: activity.status,
        created_at: activity.created_at,
        execution_attempts: activity.execution_attempts || 0,
        last_error: activity.last_error,
      }));

      setActivities(transformedActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteActivity = async (activityId: string) => {
    // TODO: Implement manual execution
    console.log('Execute activity:', activityId);
  };

  const formatTimeRemaining = (scheduledFor: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledFor);
    const diff = scheduled.getTime() - now.getTime();

    if (diff < 0) return 'Overdue';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d remaining`;
    }

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m remaining`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pod Activity Feed</h1>
          <p className="text-muted-foreground">Engagement activities from your pods</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filterStatus === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('all')}
        >
          All Activities
        </Button>
        <Button
          variant={filterStatus === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('pending')}
        >
          Pending
        </Button>
        <Button
          variant={filterStatus === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('completed')}
        >
          Completed
        </Button>
        <Button
          variant={filterStatus === 'failed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('failed')}
        >
          Failed
        </Button>
      </div>

      {/* Activity List */}
      {activities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              {filterStatus === 'all'
                ? 'No pod activities yet'
                : `No ${filterStatus} activities`}
            </p>
            {filterStatus === 'all' && (
              <p className="text-sm text-muted-foreground">
                Join or create a pod to see engagement activities here
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const EngagementIcon = getEngagementIcon(activity.engagement_type);
            const isPending = activity.status === 'pending';
            const isUrgent = isPending && new Date(activity.scheduled_for) < new Date(Date.now() + 3600000); // < 1 hour

            return (
              <Card key={activity.id} className={isUrgent ? 'border-yellow-300 bg-yellow-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Engagement Type Icon */}
                    <div className={`p-2 rounded-lg ${isPending ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <EngagementIcon className={`h-5 w-5 ${isPending ? 'text-blue-600' : 'text-gray-600'}`} />
                    </div>

                    {/* Activity Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 capitalize">
                            {activity.engagement_type} Required
                          </h3>
                          <p className="text-sm text-gray-500">
                            Pod: {activity.pod_name}
                          </p>
                        </div>
                        <Badge className={getStatusColor(activity.status)}>
                          {activity.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {activity.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                          {activity.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {activity.status}
                        </Badge>
                      </div>

                      {/* Time Info */}
                      {isPending && (
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className={`text-sm ${isUrgent ? 'text-yellow-700 font-medium' : 'text-gray-500'}`}>
                            {formatTimeRemaining(activity.scheduled_for)}
                            {isUrgent && ' ⚠️'}
                          </span>
                        </div>
                      )}

                      {/* Error Info */}
                      {activity.last_error && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">
                          {activity.last_error}
                          {activity.execution_attempts > 0 && (
                            <span className="ml-2 text-xs">
                              ({activity.execution_attempts} attempts)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(activity.post_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Post
                        </Button>
                        {isPending && (
                          <Button
                            size="sm"
                            onClick={() => handleExecuteActivity(activity.id)}
                          >
                            Execute Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
