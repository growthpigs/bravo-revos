import { SandboxResponse } from './types';

export async function generateMockResponse(
  url: string,
  options: RequestInit
): Promise<SandboxResponse> {
  const body = options.body ? JSON.parse(options.body as string) : {};
  const message = body.message || body.messages?.[0]?.content || '';

  // Detect intent from message
  if (message.toLowerCase().includes('campaign')) {
    if (message.toLowerCase().includes('list') || message.toLowerCase().includes('show')) {
      return {
        success: true,
        response: `**SANDBOX:** Listing campaigns...\n\n` +
          `You have 3 campaigns:\n` +
          `1. **Test Campaign** - 5 posts scheduled\n` +
          `2. **Demo Campaign** - 12 posts scheduled\n` +
          `3. **AgentKit Test** - 3 posts scheduled\n\n` +
          `_This is a sandbox response. No real data was fetched._`,
        sandboxMode: true,
        originalRequest: { url, method: options.method || 'POST', body },
      };
    }

    if (message.toLowerCase().includes('create')) {
      return {
        success: true,
        response: `**SANDBOX:** Campaign created successfully!\n\n` +
          `Campaign Name: ${message.match(/called\s+["']?([^"']+)["']?/)?.[1] || 'New Campaign'}\n` +
          `Campaign ID: sandbox-campaign-${Date.now()}\n` +
          `Status: Draft\n\n` +
          `_This is a sandbox response. No campaign was actually created._`,
        sandboxMode: true,
        originalRequest: { url, method: options.method || 'POST', body },
      };
    }
  }

  if (message.toLowerCase().includes('email') && message.toLowerCase().includes('extract')) {
    return {
      success: true,
      response: `**SANDBOX:** Extracting emails from LinkedIn DMs...\n\n` +
        `**Mock Results:**\n` +
        `- Found: 5 DM conversations\n` +
        `- Extracted: 3 email addresses\n` +
        `- john.doe@example.com\n` +
        `- jane.smith@example.com\n` +
        `- contact@business.com\n\n` +
        `_This is a sandbox response. No real DMs were scraped._`,
      sandboxMode: true,
      originalRequest: { url, method: options.method || 'POST', body },
    };
  }

  if (message.toLowerCase().includes('analytics') || message.toLowerCase().includes('metrics')) {
    return {
      success: true,
      response: `**SANDBOX:** Campaign analytics\n\n` +
        `**Overview (Last 30 Days):**\n` +
        `- Posts: 45\n` +
        `- Impressions: 12,450\n` +
        `- Engagements: 1,234\n` +
        `- Leads Generated: 67\n\n` +
        `_This is a sandbox response. No real analytics were fetched._`,
      sandboxMode: true,
      originalRequest: { url, method: options.method || 'POST', body },
    };
  }

  // Default response
  return {
    success: true,
    response: `**SANDBOX:** Request received.\n\n` +
      `Your request: "${message}"\n\n` +
      `This would normally execute a real action, but sandbox mode is enabled. ` +
      `All API calls are intercepted and return mock data.\n\n` +
      `_Disable sandbox mode in .env.local to execute real actions._`,
    sandboxMode: true,
    originalRequest: { url, method: options.method || 'POST', body },
  };
}
