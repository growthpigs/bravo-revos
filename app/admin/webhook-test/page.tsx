'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';

export default function WebhookTestPage() {
  const [testData, setTestData] = useState({
    webhookUrl: 'https://webhook.site/unique-url-here',
    webhookSecret: 'test-secret-123',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<any>(null);
  const [polling, setPolling] = useState(false);

  // Test webhook delivery
  const handleTestWebhook = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setDeliveryStatus(null);

    try {
      const response = await fetch('/api/webhook-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true, // Enable test mode to use mock lead data
          webhookUrl: testData.webhookUrl,
          webhookSecret: testData.webhookSecret,
          campaignName: 'Test Campaign',
          customFields: {
            test: true,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to queue webhook');
      }

      setResult(data);

      // Start polling for delivery status
      if (data.delivery?.id) {
        startPolling(data.delivery.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Poll for delivery status
  const startPolling = (deliveryId: string) => {
    setPolling(true);

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/webhook-delivery?deliveryId=${deliveryId}`);
        const data = await response.json();

        if (data.deliveries && data.deliveries.length > 0) {
          const delivery = data.deliveries[0];
          setDeliveryStatus(delivery);

          // Stop polling if delivery is complete (success or failed)
          if (delivery.status === 'success' || delivery.status === 'failed') {
            clearInterval(pollInterval);
            setPolling(false);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 30 seconds
    setTimeout(() => {
      clearInterval(pollInterval);
      setPolling(false);
    }, 30000);
  };

  // Get webhook.site instructions
  const getWebhookSiteInstructions = () => (
    <Alert>
      <AlertDescription>
        <strong>How to test with webhook.site:</strong>
        <ol className="list-decimal ml-4 mt-2 space-y-1">
          <li>Go to <a href="https://webhook.site" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">webhook.site</a></li>
          <li>Copy your unique URL (e.g., https://webhook.site/abc-123)</li>
          <li>Paste it into the "Webhook URL" field below</li>
          <li>Click "Send Test Webhook"</li>
          <li>Go back to webhook.site to see the payload received</li>
        </ol>
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Webhook Delivery Testing</h1>
        <p className="text-muted-foreground mt-2">
          Test the D-03 webhook delivery system with retry logic and HMAC signatures.
          <br />
          This tool uses <strong>mock lead data</strong> - no database records needed.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
            <CardDescription>Use webhook.site to test webhook delivery</CardDescription>
          </CardHeader>
          <CardContent>{getWebhookSiteInstructions()}</CardContent>
        </Card>

        {/* Test Form */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>Configure your test webhook delivery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="webhookUrl">Webhook URL *</Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder="https://webhook.site/your-unique-url"
                value={testData.webhookUrl}
                onChange={(e) => setTestData({ ...testData, webhookUrl: e.target.value })}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Must be HTTPS (or HTTP for localhost/private IPs)
              </p>
            </div>

            <div>
              <Label htmlFor="webhookSecret">Webhook Secret (optional)</Label>
              <Input
                id="webhookSecret"
                type="text"
                placeholder="my-secret-key"
                value={testData.webhookSecret}
                onChange={(e) => setTestData({ ...testData, webhookSecret: e.target.value })}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Used for HMAC-SHA256 signature (X-Webhook-Signature header)
              </p>
            </div>

            <Button onClick={handleTestWebhook} disabled={loading || !testData.webhookUrl}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Test Webhook'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Result Display */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Webhook Queued Successfully
              </CardTitle>
              <CardDescription>Delivery ID: {result.delivery?.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Queue Status</Label>
                <Textarea
                  value={JSON.stringify(result, null, 2)}
                  readOnly
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivery Status */}
        {deliveryStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {polling && <Loader2 className="h-5 w-5 animate-spin" />}
                {deliveryStatus.status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                {deliveryStatus.status === 'failed' && <XCircle className="h-5 w-5 text-red-600" />}
                Delivery Status: {deliveryStatus.status?.toUpperCase()}
              </CardTitle>
              <CardDescription>
                {polling ? 'Polling for updates...' : 'Final status received'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Attempt</Label>
                  <p className="text-sm">{deliveryStatus.attempt} / {deliveryStatus.maxAttempts}</p>
                </div>
                <div>
                  <Label>Response Status</Label>
                  <p className="text-sm">{deliveryStatus.responseStatus || 'N/A'}</p>
                </div>
                <div>
                  <Label>Sent At</Label>
                  <p className="text-sm">{deliveryStatus.sentAt ? new Date(deliveryStatus.sentAt).toLocaleString() : 'N/A'}</p>
                </div>
                <div>
                  <Label>Webhook URL</Label>
                  <p className="text-sm truncate">{deliveryStatus.webhookUrl}</p>
                </div>
              </div>

              {deliveryStatus.lastError && (
                <div>
                  <Label>Error Message</Label>
                  <Textarea
                    value={deliveryStatus.lastError}
                    readOnly
                    rows={3}
                    className="font-mono text-sm text-red-600"
                  />
                </div>
              )}

              <div>
                <Label>Full Delivery Details</Label>
                <Textarea
                  value={JSON.stringify(deliveryStatus, null, 2)}
                  readOnly
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Requirements</CardTitle>
            <CardDescription>Check these before testing</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <strong>Redis:</strong> Must be running (redis-server)
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <strong>Worker:</strong> Background worker must be running (npm run worker:webhook)
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <strong>Environment:</strong> REDIS_URL and SUPABASE_SERVICE_ROLE_KEY must be set
              </li>
            </ul>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Quick Start Commands:</p>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`# Terminal 1: Start Redis
redis-server

# Terminal 2: Start Worker
npm run worker:webhook

# Terminal 3: Start Dev Server (if not running)
npm run dev`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
