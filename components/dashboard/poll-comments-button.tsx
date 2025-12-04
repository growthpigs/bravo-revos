'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PollCommentsButtonProps {
  campaignId: string;
  campaignName: string;
}

export function PollCommentsButton({
  campaignId,
  campaignName,
}: PollCommentsButtonProps) {
  const [isPolling, setIsPolling] = useState(false);

  const handlePollComments = async () => {
    setIsPolling(true);
    toast.info('Checking for comments...', { id: 'poll-comments' });

    try {
      const response = await fetch('/api/test/poll-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: campaignId,
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        console.error('[PollCommentsButton] Failed to parse response:', responseText);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to poll (${response.status})`);
      }

      const { jobs_processed = 0, comments_found = 0, dms_sent = 0, connection_requests = 0, duration_ms = 0 } = data;

      if (comments_found > 0 || dms_sent > 0 || connection_requests > 0) {
        toast.success('Comments processed!', {
          id: 'poll-comments',
          description: `Found ${comments_found} trigger comments. Sent ${dms_sent} DMs, ${connection_requests} connection requests.`,
          duration: 8000,
        });
      } else if (jobs_processed > 0) {
        toast.info('No new trigger comments found', {
          id: 'poll-comments',
          description: `Checked ${jobs_processed} active post(s) in ${Math.round(duration_ms / 1000)}s.`,
          duration: 5000,
        });
      } else {
        toast.warning('No active posts to monitor', {
          id: 'poll-comments',
          description: 'Post to LinkedIn first, then poll for comments.',
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error('[PollCommentsButton] Error:', error);
      toast.error('Failed to poll comments', {
        id: 'poll-comments',
        description: error.message || 'Unknown error',
        duration: 5000,
      });
    } finally {
      setIsPolling(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="gap-2"
      onClick={handlePollComments}
      disabled={isPolling}
    >
      {isPolling ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          Poll Comments Now
        </>
      )}
    </Button>
  );
}
