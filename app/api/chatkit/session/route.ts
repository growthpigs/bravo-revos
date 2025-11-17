import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const CHATKIT_API_BASE = 'https://api.openai.com';
const CHATKIT_API_VERSION = 'chatkit_beta=v1';

interface CreateSessionRequestBody {
  workflow?: { id?: string | null } | null;
  workflowId?: string | null;
  scope?: { user_id?: string | null } | null;
  chatkit_configuration?: {
    file_upload?: { enabled?: boolean };
  };
}

interface ChatkitSessionResponse {
  client_secret: string;
  expires_after: number;
  [key: string]: any;
}

/**
 * POST /api/chatkit/session
 *
 * Creates a ChatKit session for authenticated users.
 *
 * Flow:
 * 1. Authenticate user via Supabase
 * 2. Extract workflow ID from request or use default
 * 3. Call OpenAI ChatKit Sessions API
 * 4. Return client_secret to frontend
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate with Supabase (bypass for localhost testing)
    const host = request.headers.get('host') || '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

    let user: { id: string; email?: string } | null = null;

    if (isLocalhost) {
      // Development: Allow unauthenticated access for testing
      console.log('[ChatKit] 🔓 Localhost detected - bypassing authentication for testing');
      user = {
        id: 'test-user-localhost',
        email: 'test@localhost.dev'
      };
    } else {
      // Production: Require full Supabase authentication
      const supabase = await createClient();
      const {
        data: { user: authenticatedUser },
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !authenticatedUser) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      user = authenticatedUser;
    }

    // 2. Validate OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('[ChatKit] OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 3. Parse request body
    const body: CreateSessionRequestBody = await request.json();

    // 4. Resolve workflow ID
    // Priority: request.workflowId → request.workflow.id → environment defaults
    let workflowId: string | null = null;

    if (body.workflowId) {
      workflowId = body.workflowId;
    } else if (body.workflow?.id) {
      workflowId = body.workflow.id;
    } else {
      // Default to topic generation workflow if no specific workflow provided
      workflowId = process.env.TOPIC_GENERATION_WORKFLOW_ID || null;
    }

    if (!workflowId) {
      return NextResponse.json(
        { error: 'No workflow ID provided and no default configured' },
        { status: 400 }
      );
    }

    console.log('[ChatKit] Creating session:', {
      userId: user.id,
      workflowId,
      timestamp: new Date().toISOString()
    });

    // 5. Build ChatKit session request
    const sessionRequestBody = {
      workflow: { id: workflowId },
      user: user.id, // Top-level user parameter (required by OpenAI ChatKit API)
      chatkit_configuration: body.chatkit_configuration || {
        file_upload: { enabled: false }
      }
    };

    // 6. Call OpenAI ChatKit Sessions API
    const upstreamUrl = `${CHATKIT_API_BASE}/v1/chatkit/sessions`;
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
        'OpenAI-Beta': CHATKIT_API_VERSION
      },
      body: JSON.stringify(sessionRequestBody)
    });

    // 7. Handle upstream errors
    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      console.error('[ChatKit] Upstream error:', {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        body: errorText
      });

      // MOCK MODE: If workflow not found in dev, return mock session
      // This allows testing ChatKit UI without valid workflow IDs
      if (isLocalhost && upstreamResponse.status === 404) {
        const errorJson = JSON.parse(errorText);
        const isWorkflowNotFound = errorJson.error?.message?.includes('Workflow') &&
                                   errorJson.error?.message?.includes('not found');

        if (isWorkflowNotFound) {
          console.log('[ChatKit] 🎭 MOCK MODE: Workflow not found, returning mock session for UI testing');
          console.log('[ChatKit] 💡 To use real workflows: Update workflow IDs in .env.local');

          // Generate mock client_secret (ChatKit accepts any format for rendering)
          const mockSecret = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;

          return NextResponse.json({
            client_secret: mockSecret,
            expires_after: 3600,
            _mock: true,
            _note: 'Using mock session - ChatKit will render but won\'t call real AI'
          });
        }
      }

      let errorMessage = 'Failed to create ChatKit session';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // Use default error message if parsing fails
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: upstreamResponse.status }
      );
    }

    // 8. Parse and return session data
    const sessionData: ChatkitSessionResponse = await upstreamResponse.json();

    console.log('[ChatKit] Session created successfully:', {
      userId: user.id,
      expiresAfter: sessionData.expires_after,
      hasClientSecret: !!sessionData.client_secret
    });

    return NextResponse.json({
      client_secret: sessionData.client_secret,
      expires_after: sessionData.expires_after
    });

  } catch (error) {
    console.error('[ChatKit] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
