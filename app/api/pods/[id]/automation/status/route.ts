/**
 * Pod Automation Status API
 * Returns queue health and pending activities for a pod
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAutomationQueueStatus } from '@/lib/queues/pod-automation-queue';
import { getPodEngagementStats, getPendingActivities } from '@/lib/pods/engagement-scheduler';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const podId = params.id;

    if (!podId) {
      return NextResponse.json(
        { error: 'Pod ID is required' },
        { status: 400 }
      );
    }

    // Get queue status
    const queueStatus = await getAutomationQueueStatus();

    // Get pod engagement stats
    const podStats = await getPodEngagementStats(podId);

    // Get pending activities count
    const pendingActivities = await getPendingActivities(podId, 100);

    // Get pod info from database
    const supabase = await createClient();
    const { data: pod } = await supabase
      .from('pod')
      .select('id, name, status')
      .eq('id', podId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      pod: {
        id: podId,
        name: pod?.name || 'Unknown',
        status: pod?.status || 'inactive',
      },
      queue: queueStatus,
      stats: podStats,
      pending: {
        activities: pendingActivities.length,
        likeCount: pendingActivities.filter(a => a.engagement_type === 'like').length,
        commentCount: pendingActivities.filter(a => a.engagement_type === 'comment').length,
      },
    });
  } catch (error) {
    console.error('[AUTOMATION_STATUS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
