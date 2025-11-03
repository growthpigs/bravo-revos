# Webhook Settings UI Specification

## Overview

The Webhook Settings UI enables clients to configure their ESP (Email Service Provider) webhook endpoints for automatic lead delivery. When a lead provides their email, Bravo revOS sends the lead data to the client's configured webhook, which then triggers their email automation.

## UI Location

```
/dashboard/settings/webhooks     # Client portal
/admin/clients/[id]/webhooks    # Admin portal (for support)
```

## Component Structure

```typescript
// Main webhook settings page
interface WebhookSettingsPage {
  // Current webhook configuration
  webhookUrl: string;
  webhookSecret?: string; // Optional for HMAC signing
  retryPolicy: RetryPolicy;
  testMode: boolean;

  // ESP presets for quick setup
  espPresets: ESPPreset[];

  // Webhook history
  recentDeliveries: WebhookDelivery[];

  // Testing tools
  testPayload: object;
  testResults?: TestResult;
}
```

## UI Design

### Main Settings Panel

```jsx
function WebhookSettings() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Webhook Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure how lead data is sent to your email service provider
        </p>
      </div>

      {/* ESP Quick Setup */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Setup</CardTitle>
          <CardDescription>
            Select your email service provider for automatic configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ESPSelector />
        </CardContent>
      </Card>

      {/* Manual Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <WebhookForm />
        </CardContent>
      </Card>

      {/* Test Tools */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Your Webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <WebhookTester />
        </CardContent>
      </Card>

      {/* Delivery History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <DeliveryHistory />
        </CardContent>
      </Card>
    </div>
  );
}
```

### ESP Quick Setup Component

```jsx
function ESPSelector() {
  const espPresets = [
    {
      name: 'Zapier',
      logo: '/logos/zapier.svg',
      urlPattern: 'https://hooks.zapier.com/hooks/catch/...',
      instructions: '1. Create a Zap with "Webhooks by Zapier" trigger\n2. Copy the webhook URL\n3. Paste it below'
    },
    {
      name: 'Make (Integromat)',
      logo: '/logos/make.svg',
      urlPattern: 'https://hook.eu1.make.com/...',
      instructions: '1. Create a scenario with Webhook trigger\n2. Copy the webhook URL\n3. Paste it below'
    },
    {
      name: 'ConvertKit',
      logo: '/logos/convertkit.svg',
      urlPattern: 'https://api.convertkit.com/v3/...',
      instructions: '1. Get your API Secret from ConvertKit\n2. We\'ll construct the webhook URL for you',
      requiresApiKey: true
    },
    {
      name: 'ActiveCampaign',
      logo: '/logos/activecampaign.svg',
      urlPattern: 'https://{{account}}.api-us1.com/...',
      instructions: '1. Go to Settings → Developer\n2. Create a webhook\n3. Copy the URL',
      requiresAccount: true
    },
    {
      name: 'HubSpot',
      logo: '/logos/hubspot.svg',
      urlPattern: 'https://api.hubapi.com/...',
      instructions: '1. Go to Settings → Integrations → Webhooks\n2. Create a webhook subscription\n3. Copy the URL'
    },
    {
      name: 'Mailchimp',
      logo: '/logos/mailchimp.svg',
      urlPattern: 'https://{{dc}}.api.mailchimp.com/...',
      instructions: '1. Mailchimp requires Zapier/Make integration\n2. Use Zapier option above',
      redirectTo: 'zapier'
    },
    {
      name: 'Custom',
      logo: '/logos/webhook.svg',
      urlPattern: '',
      instructions: 'Enter your custom webhook URL below'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {espPresets.map((esp) => (
        <button
          key={esp.name}
          onClick={() => handleESPSelect(esp)}
          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <img src={esp.logo} alt={esp.name} className="h-8 mx-auto mb-2" />
          <div className="text-sm font-medium">{esp.name}</div>
        </button>
      ))}
    </div>
  );
}
```

### Webhook Configuration Form

```jsx
function WebhookForm() {
  const [config, setConfig] = useState({
    url: '',
    secret: '',
    retryEnabled: true,
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
    headers: {}
  });

  return (
    <form className="space-y-6">
      {/* Webhook URL */}
      <div>
        <Label htmlFor="webhook-url">Webhook URL *</Label>
        <Input
          id="webhook-url"
          type="url"
          placeholder="https://hooks.zapier.com/hooks/catch/..."
          value={config.url}
          onChange={(e) => setConfig({...config, url: e.target.value})}
          className="mt-1"
        />
        <p className="text-sm text-gray-500 mt-1">
          The URL where lead data will be sent via POST request
        </p>
      </div>

      {/* Webhook Secret (Optional) */}
      <div>
        <Label htmlFor="webhook-secret">
          Webhook Secret (Optional)
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon className="h-4 w-4 inline ml-1" />
              </TooltipTrigger>
              <TooltipContent>
                Used for HMAC signature verification
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          id="webhook-secret"
          type="password"
          placeholder="your-secret-key"
          value={config.secret}
          onChange={(e) => setConfig({...config, secret: e.target.value})}
          className="mt-1"
        />
      </div>

      {/* Custom Headers */}
      <div>
        <Label>Custom Headers (Optional)</Label>
        <HeaderEditor
          headers={config.headers}
          onChange={(headers) => setConfig({...config, headers})}
        />
      </div>

      {/* Retry Configuration */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="retry-enabled"
            checked={config.retryEnabled}
            onCheckedChange={(checked) => setConfig({...config, retryEnabled: checked})}
          />
          <Label htmlFor="retry-enabled">Enable automatic retries on failure</Label>
        </div>

        {config.retryEnabled && (
          <div className="grid grid-cols-2 gap-4 pl-6">
            <div>
              <Label htmlFor="max-retries">Max Retries</Label>
              <Select
                value={config.maxRetries.toString()}
                onValueChange={(value) => setConfig({...config, maxRetries: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="retry-delay">Retry Delay (ms)</Label>
              <Select
                value={config.retryDelay.toString()}
                onValueChange={(value) => setConfig({...config, retryDelay: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">1 second</SelectItem>
                  <SelectItem value="5000">5 seconds</SelectItem>
                  <SelectItem value="10000">10 seconds</SelectItem>
                  <SelectItem value="30000">30 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" className="w-full sm:w-auto">
          Save Webhook Settings
        </Button>
      </div>
    </form>
  );
}
```

### Webhook Testing Component

```jsx
function WebhookTester() {
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const samplePayload = {
    email: "john.doe@example.com",
    first_name: "John",
    last_name: "Doe",
    linkedin_url: "https://linkedin.com/in/johndoe",
    lead_magnet_name: "10x Leadership Framework",
    lead_magnet_url: "https://storage.supabase.co/lead-magnets/abc123.pdf",
    campaign_id: "camp_123",
    campaign_name: "Q4 Leadership Campaign",
    captured_at: new Date().toISOString(),
    source: "linkedin_comment",
    metadata: {
      post_url: "https://linkedin.com/posts/...",
      comment_text: "SCALE"
    }
  };

  async function handleTest() {
    setTestState('testing');

    try {
      const result = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: samplePayload })
      });

      const data = await result.json();
      setTestResult(data);
      setTestState(data.success ? 'success' : 'error');
    } catch (error) {
      setTestState('error');
      setTestResult({
        success: false,
        error: error.message,
        statusCode: 0,
        responseTime: 0
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Sample Payload */}
      <div>
        <Label>Sample Payload</Label>
        <div className="mt-1 p-3 bg-gray-50 rounded-lg">
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(samplePayload, null, 2)}
          </pre>
        </div>
      </div>

      {/* Test Button */}
      <Button
        onClick={handleTest}
        disabled={testState === 'testing'}
        className="w-full"
      >
        {testState === 'testing' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending Test Webhook...
          </>
        ) : (
          <>
            <SendIcon className="mr-2 h-4 w-4" />
            Send Test Webhook
          </>
        )}
      </Button>

      {/* Test Results */}
      {testResult && (
        <Alert variant={testState === 'success' ? 'default' : 'destructive'}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {testState === 'success' ? 'Test Successful' : 'Test Failed'}
          </AlertTitle>
          <AlertDescription>
            {testState === 'success' ? (
              <div className="space-y-1 mt-2">
                <div>✅ Status Code: {testResult.statusCode}</div>
                <div>⏱️ Response Time: {testResult.responseTime}ms</div>
                {testResult.response && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">View Response</summary>
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded">
                      {JSON.stringify(testResult.response, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <div className="space-y-1 mt-2">
                <div>❌ Error: {testResult.error}</div>
                {testResult.statusCode > 0 && (
                  <div>Status Code: {testResult.statusCode}</div>
                )}
                <div className="mt-2 text-sm">
                  Please check your webhook URL and try again.
                </div>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

### Delivery History Component

```jsx
function DeliveryHistory() {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="success">Success</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Delivery List */}
      <div className="space-y-2">
        {deliveries
          .filter(d => filter === 'all' || d.status === filter)
          .map((delivery) => (
            <div
              key={delivery.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {delivery.status === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <div className="font-medium">{delivery.lead_email}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(delivery.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant={delivery.status === 'success' ? 'default' : 'destructive'}>
                  {delivery.status_code}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => showDeliveryDetails(delivery)}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
      </div>

      {/* Load More */}
      <Button variant="outline" className="w-full">
        Load More
      </Button>
    </div>
  );
}
```

## Webhook Payload Format

```typescript
interface WebhookPayload {
  // Lead Information
  email: string;
  first_name: string;
  last_name?: string;
  linkedin_url: string;
  company?: string;
  title?: string;

  // Lead Magnet Information
  lead_magnet_name: string;
  lead_magnet_url: string; // Direct download URL (expires in 24 hours)
  lead_magnet_description?: string;

  // Campaign Information
  campaign_id: string;
  campaign_name: string;
  campaign_tags?: string[];

  // Source Information
  source: 'linkedin_comment' | 'linkedin_dm' | 'manual';
  source_details: {
    post_url?: string;
    comment_text?: string;
    dm_conversation_id?: string;
  };

  // Metadata
  captured_at: string; // ISO 8601 timestamp
  ip_address?: string;
  user_agent?: string;

  // Custom Fields (from campaign settings)
  custom_fields?: Record<string, any>;
}
```

## Security Features

### HMAC Signature Verification

```typescript
// Server-side webhook signing
function signWebhookPayload(payload: object, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

// Headers sent with webhook
{
  'Content-Type': 'application/json',
  'X-RevOS-Signature': 'sha256=...',
  'X-RevOS-Timestamp': '1234567890',
  'X-RevOS-Event': 'lead.captured'
}
```

### Webhook Validation

```javascript
// Client-side validation example
function validateWebhook(req: Request, secret: string): boolean {
  const signature = req.headers['x-revos-signature'];
  const timestamp = req.headers['x-revos-timestamp'];

  // Check timestamp (prevent replay attacks)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    return false; // Webhook is older than 5 minutes
  }

  // Verify signature
  const expectedSignature = 'sha256=' + signWebhookPayload(req.body, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## ESP Integration Guides

### Zapier Integration

```markdown
## Setting up Zapier Webhook

1. Create a new Zap
2. Choose "Webhooks by Zapier" as trigger
3. Select "Catch Hook" as trigger event
4. Copy the webhook URL
5. Paste in Bravo revOS webhook settings
6. Send test webhook from Bravo revOS
7. Configure your action (e.g., "Add Subscriber to ConvertKit")
8. Map fields:
   - Email → email
   - First Name → first_name
   - Lead Magnet URL → lead_magnet_url
9. Turn on your Zap
```

### Make (Integromat) Integration

```markdown
## Setting up Make Webhook

1. Create a new scenario
2. Add "Webhooks" module
3. Select "Custom webhook"
4. Copy the webhook URL
5. Configure in Bravo revOS
6. Add your email service module
7. Map the data fields
8. Activate the scenario
```

### Direct API Integration

```javascript
// Example: Direct ConvertKit Integration
async function sendToConvertKit(payload: WebhookPayload) {
  const response = await fetch('https://api.convertkit.com/v3/subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_secret: process.env.CONVERTKIT_API_SECRET,
      email: payload.email,
      first_name: payload.first_name,
      fields: {
        lead_magnet: payload.lead_magnet_name,
        linkedin_url: payload.linkedin_url,
      },
      tags: [payload.campaign_id],
    }),
  });

  return response.json();
}
```

## Error Handling

### Retry Logic

```typescript
class WebhookRetryService {
  async sendWithRetry(
    url: string,
    payload: WebhookPayload,
    config: RetryConfig
  ): Promise<WebhookResult> {
    let lastError: Error;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await this.send(url, payload, config);

        if (result.success) {
          return result;
        }

        // Don't retry on 4xx errors (except 429)
        if (result.statusCode >= 400 && result.statusCode < 500 && result.statusCode !== 429) {
          throw new Error(`Client error: ${result.statusCode}`);
        }

        lastError = new Error(`Server error: ${result.statusCode}`);

      } catch (error) {
        lastError = error;
      }

      if (attempt < config.maxRetries) {
        const delay = config.retryDelay * Math.pow(2, attempt); // Exponential backoff
        await sleep(delay);
      }
    }

    throw lastError;
  }
}
```

## Monitoring & Analytics

```typescript
interface WebhookMetrics {
  total_sent: number;
  successful_deliveries: number;
  failed_deliveries: number;
  average_response_time: number;
  retry_rate: number;

  by_status_code: Record<number, number>;
  by_esp: Record<string, {
    sent: number;
    success: number;
    failed: number;
  }>;

  hourly_stats: Array<{
    hour: string;
    sent: number;
    success_rate: number;
  }>;
}
```

## Database Schema

```sql
-- Webhook configurations
CREATE TABLE webhook_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT, -- Encrypted
  headers JSONB DEFAULT '{}',
  retry_enabled BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,
  retry_delay INTEGER DEFAULT 1000, -- milliseconds
  timeout INTEGER DEFAULT 30000, -- milliseconds
  esp_type TEXT, -- 'zapier', 'make', 'convertkit', etc.
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook deliveries log
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_config_id UUID REFERENCES webhook_configs(id),
  lead_id UUID REFERENCES leads(id),
  payload JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'success', 'failed')),
  status_code INTEGER,
  response JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 1,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);
CREATE INDEX idx_webhook_deliveries_lead_id ON webhook_deliveries(lead_id);
```

## Summary

The Webhook Settings UI provides:

1. **Easy ESP Integration**: Pre-configured templates for popular services
2. **Flexible Configuration**: Support for custom webhooks and headers
3. **Comprehensive Testing**: Built-in testing tools with sample payloads
4. **Delivery Monitoring**: Real-time tracking of webhook deliveries
5. **Security Features**: HMAC signing and timestamp validation
6. **Retry Logic**: Automatic retries with exponential backoff
7. **Clear Documentation**: Step-by-step guides for each ESP

This ensures clients can easily connect Bravo revOS to their existing email marketing infrastructure without technical complexity.