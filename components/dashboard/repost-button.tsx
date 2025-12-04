'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RepostButtonProps {
  campaignId: string;
  campaignName: string;
  postTemplate: string | null;
  triggerWord: string | null;
}

export function RepostButton({
  campaignId,
  campaignName,
  postTemplate,
  triggerWord,
}: RepostButtonProps) {
  const [isPosting, setIsPosting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  const effectiveTriggerWord = triggerWord || 'guide';

  const handleRepost = async () => {
    if (!postTemplate) {
      toast.error('No post content', {
        description: 'This campaign has no post content. Add content first.',
      });
      return;
    }

    setDialogOpen(false);
    setIsPosting(true);

    toast.info('Publishing to LinkedIn...', { id: 'repost-progress' });

    try {
      const response = await fetch('/api/linkedin/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: postTemplate,
          campaignId: campaignId,
          triggerWord: effectiveTriggerWord,
        }),
      });

      // Handle empty or non-JSON responses
      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        console.error('[RepostButton] Failed to parse response:', responseText);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to post (${response.status})`);
      }

      const postUrl = data.post?.url;

      toast.success('Post published to LinkedIn!', {
        id: 'repost-progress',
        description: `Monitoring for "${effectiveTriggerWord}" comments.`,
        duration: 8000,
        action: postUrl
          ? {
              label: 'View Post',
              onClick: () => window.open(postUrl, '_blank'),
            }
          : undefined,
      });

      router.refresh();
    } catch (error: any) {
      console.error('[RepostButton] Error:', error);
      toast.error('Failed to post to LinkedIn', {
        id: 'repost-progress',
        description: error.message || 'Unknown error',
        duration: 5000,
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="default"
          className="gap-2 bg-blue-600 hover:bg-blue-700"
          disabled={isPosting || !postTemplate}
        >
          {isPosting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Post to LinkedIn
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Post to LinkedIn?</AlertDialogTitle>
          <AlertDialogDescription>
            This will publish &quot;{campaignName}&quot; to LinkedIn and start monitoring
            for &quot;{effectiveTriggerWord}&quot; comments.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRepost}>
            Post Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
