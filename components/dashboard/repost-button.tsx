'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RepostButtonProps {
  campaignId: string;
  campaignName: string;
  hasPostTemplate: boolean;
  triggerWord?: string;
}

export function RepostButton({
  campaignId,
  campaignName,
  hasPostTemplate,
  triggerWord = 'guide',
}: RepostButtonProps) {
  const [isPosting, setIsPosting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    url?: string;
  } | null>(null);
  const router = useRouter();

  const handleRepost = async () => {
    if (!hasPostTemplate) {
      setResult({
        success: false,
        message: 'This campaign has no post content. Add content first.',
      });
      return;
    }

    const confirmed = confirm(
      `Post "${campaignName}" to LinkedIn now?\n\nThis will publish the campaign content and start monitoring for "${triggerWord}" comments.`
    );

    if (!confirmed) return;

    setIsPosting(true);
    setResult(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/repost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to repost');
      }

      setResult({
        success: true,
        message: data.message,
        url: data.post?.url,
      });

      // Refresh the page to show updated data
      router.refresh();
    } catch (error: any) {
      console.error('[RepostButton] Error:', error);
      setResult({
        success: false,
        message: error.message || 'Failed to post to LinkedIn',
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleRepost}
        variant="default"
        className="gap-2 bg-blue-600 hover:bg-blue-700"
        disabled={isPosting || !hasPostTemplate}
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

      {result && (
        <div
          className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
            result.success
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {result.success ? (
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p>{result.message}</p>
            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline mt-1 inline-block"
              >
                View on LinkedIn
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
