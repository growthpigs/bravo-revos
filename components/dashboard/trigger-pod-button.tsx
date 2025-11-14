'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TriggerPodButtonProps {
  campaignId: string;
  campaignName: string;
  lastPostUrl?: string | null;
  podId?: string | null;
}

export function TriggerPodButton({
  campaignId,
  campaignName,
  lastPostUrl,
  podId
}: TriggerPodButtonProps) {
  const [isTriggering, setIsTriggering] = useState(false);
  const router = useRouter();

  const handleTriggerPod = async () => {
    // Check if pod is associated
    if (!podId) {
      alert('No pod associated with this campaign. Please associate a pod first.');
      return;
    }

    // Get post URL
    let postUrl = lastPostUrl;
    if (!postUrl) {
      postUrl = prompt('Enter LinkedIn post URL:');
      if (!postUrl) {
        return; // User cancelled
      }
    }

    setIsTriggering(true);

    try {
      const response = await fetch('/api/campaigns/trigger-pod', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          post_url: postUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to trigger pod amplification');
      }

      const result = await response.json();
      console.log('Pod amplification triggered:', result);

      // Success
      alert(`Pod amplification triggered successfully! Activity ID: ${result.activity_id}`);
      router.refresh(); // Refresh the page to show updated data
    } catch (error) {
      console.error('Error triggering pod:', error);
      alert(`Failed to trigger pod amplification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTriggering(false);
    }
  };

  // Don't show button if no pod associated
  if (!podId) {
    return null;
  }

  return (
    <Button
      onClick={handleTriggerPod}
      variant="outline"
      className="gap-2"
      disabled={isTriggering}
    >
      {isTriggering ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Triggering...
        </>
      ) : (
        <>
          <Users2 className="h-4 w-4" />
          Trigger Pod Amplification
        </>
      )}
    </Button>
  );
}
