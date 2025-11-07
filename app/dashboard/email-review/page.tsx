'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface EmailReview {
  id: string;
  lead_id: string;
  original_text: string;
  extracted_email: string;
  confidence_score: number;
  extraction_method: 'regex' | 'gpt4';
  status: 'pending' | 'approved' | 'rejected' | 'manual_entry';
  created_at: string;
}

export default function EmailReviewPage() {
  const [reviews, setReviews] = useState<EmailReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [manualEmails, setManualEmails] = useState<Record<string, string>>({});

  // Load pending reviews
  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const fetchPendingReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/email-extraction/reviews?status=pending');
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      } else {
        toast.error('Failed to load pending reviews');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load pending reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string, email: string) => {
    setProcessingId(reviewId);
    try {
      const response = await fetch(`/api/email-extraction/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          extracted_email: email,
        }),
      });

      if (response.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        toast.success('Email approved');
      } else {
        toast.error('Failed to approve email');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to approve email');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reviewId: string) => {
    setProcessingId(reviewId);
    try {
      const response = await fetch(`/api/email-extraction/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
        }),
      });

      if (response.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        toast.success('Email rejected');
      } else {
        toast.error('Failed to reject email');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to reject email');
    } finally {
      setProcessingId(null);
    }
  };

  const handleManualEntry = async (reviewId: string) => {
    const email = manualEmails[reviewId];
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    await handleApprove(reviewId, email);
    setManualEmails((prev) => {
      const next = { ...prev };
      delete next[reviewId];
      return next;
    });
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-emerald-100 text-emerald-700">High (90+%)</Badge>;
    if (score >= 70) return <Badge className="bg-amber-100 text-amber-700">Medium (70-89%)</Badge>;
    return <Badge className="bg-red-100 text-red-700">Low (under 70%)</Badge>;
  };

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Email Review Queue
        </h1>
        <p className="text-slate-600 mt-2">
          Review and approve email extractions from DM replies
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{reviews.length}</div>
              <p className="text-sm text-slate-600">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">
                {reviews.filter((r) => r.confidence_score >= 90).length}
              </div>
              <p className="text-sm text-slate-600">High Confidence</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-600">
                {reviews.filter((r) => r.confidence_score < 90).length}
              </div>
              <p className="text-sm text-slate-600">Needs Review</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : reviews.length === 0 ? (
        <Alert className="bg-emerald-50 border-emerald-200">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-700">
            No pending reviews! All emails have been processed.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {review.extracted_email || '(Email not extracted)'}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      From DM reply • {review.extraction_method === 'regex' ? 'Regex' : 'GPT-4'} extraction
                    </CardDescription>
                  </div>
                  <div>{getConfidenceBadge(review.confidence_score)}</div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Original message snippet */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Original DM Reply:</p>
                  <p className="text-sm text-slate-600 italic">&quot;{review.original_text.substring(0, 200)}{review.original_text.length > 200 ? '...' : ''}&quot;</p>
                </div>

                {/* Extracted email display */}
                {review.extracted_email ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Extracted Email:</p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={review.extracted_email}
                        disabled
                        className="bg-blue-50"
                      />
                      <Button
                        onClick={() => handleApprove(review.id, review.extracted_email)}
                        disabled={processingId === review.id}
                        className="gap-2"
                      >
                        {processingId === review.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(review.id)}
                        disabled={processingId === review.id}
                        variant="outline"
                        className="gap-2"
                      >
                        {processingId === review.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Email extraction failed. Please enter manually.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Manual entry fallback */}
                {!review.extracted_email || review.confidence_score < 70 ? (
                  <div className="space-y-2 p-3 bg-amber-50 rounded-lg border-2 border-amber-200">
                    <p className="text-sm font-semibold text-amber-900">Manual Entry:</p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        value={manualEmails[review.id] || ''}
                        onChange={(e) =>
                          setManualEmails((prev) => ({
                            ...prev,
                            [review.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        onClick={() => handleManualEntry(review.id)}
                        disabled={processingId === review.id}
                      >
                        {processingId === review.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
