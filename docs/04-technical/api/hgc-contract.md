# HGC API Contract

**Critical**: This contract MUST be maintained across all backend implementations (manual orchestration, AgentKit, future changes). FloatingChatBar depends on this exact format.

## API Endpoint

```
POST /api/hgc
Content-Type: application/json
```

## Request Format

```typescript
interface HGCRequest {
  message: string;              // User's message
  conversationId?: string;      // Optional conversation ID for context
  workflowData?: {              // Optional workflow continuation data
    workflow_id?: string;
    campaign_id?: string;
    content?: string;
    datetime?: string;
    [key: string]: any;
  };
}
```

### Example Requests

**Simple Message**:
```json
{
  "message": "Write a post about innovation"
}
```

**Workflow Continuation** (campaign selection):
```json
{
  "message": "user selected campaign",
  "workflowData": {
    "workflow_id": "launch-1234567890",
    "campaign_id": "campaign-abc-123"
  }
}
```

**Workflow Continuation** (datetime selection):
```json
{
  "message": "user selected datetime",
  "workflowData": {
    "workflow_id": "schedule-1234567890",
    "datetime": "2025-11-15T14:30:00Z",
    "content": "Post content here"
  }
}
```

---

## Response Formats

### JSON Response (No Tool Calls)

```typescript
interface HGCJSONResponse {
  success: boolean;
  response: string;             // Assistant's message (markdown supported)
  interactive?: InteractiveData; // Optional inline UI elements
}

interface InteractiveData {
  type: 'campaign_select' | 'decision' | 'datetime_select' | 'confirm';
  workflow_id?: string;

  // For campaign_select
  campaigns?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;

  // For decision
  decision_options?: Array<{
    label: string;
    value: string;
    icon?: 'plus' | 'list';
    variant?: 'primary' | 'secondary';
  }>;

  // For datetime_select
  initial_datetime?: string;
  initial_content?: string;
  campaign_id?: string;

  // For confirm
  content?: string;
  campaign_id?: string;
}
```

**Example JSON Response**:
```json
{
  "success": true,
  "response": "Here's your LinkedIn post about innovation:\n\n# The Future of Innovation\n\n...",
  "interactive": null
}
```

**Example JSON Response with Interactive**:
```json
{
  "success": true,
  "response": "Which campaign would you like to post to?",
  "interactive": {
    "type": "campaign_select",
    "workflow_id": "launch-1234567890",
    "campaigns": [
      {
        "id": "new_post",
        "name": "✨ Start a new post",
        "description": "Write a post without linking to a campaign"
      },
      {
        "id": "campaign-abc-123",
        "name": "Q4 Product Launch",
        "description": "Active campaign"
      }
    ]
  }
}
```

### Streaming Response (With Tool Calls)

**Content-Type**: `text/plain; charset=utf-8`

**Format**: Plain text chunks streamed word-by-word or sentence-by-sentence.

**Example Stream**:
```
Innovation
 is
 the
 key
 to
 sustainable
 growth
...
```

**Critical**:
- No JSON delimiters
- No SSE formatting
- Pure plain text chunks
- Decoder: `new TextDecoder()`

---

## Interactive Element Types

### 1. Campaign Select

**When**: User wants to post to a campaign or create new post

**Response**:
```typescript
{
  success: true,
  response: "Which campaign would you like to post to?",
  interactive: {
    type: "campaign_select",
    workflow_id: "launch-{timestamp}",
    campaigns: [
      { id: "new_post", name: "✨ Start a new post", description: "..." },
      { id: "campaign-id", name: "Campaign Name", description: "..." }
    ]
  }
}
```

**User Selection** → Next Request:
```json
{
  "message": "user selected campaign",
  "workflowData": {
    "workflow_id": "launch-{timestamp}",
    "campaign_id": "selected-campaign-id"
  }
}
```

### 2. Decision Buttons

**When**: User needs to make a binary/multi-choice decision

**Response**:
```typescript
{
  success: true,
  response: "Would you like to create a new campaign or use an existing one?",
  interactive: {
    type: "decision",
    workflow_id: "decision-{timestamp}",
    decision_options: [
      { label: "Create New", value: "create", icon: "plus", variant: "primary" },
      { label: "Use Existing", value: "existing", icon: "list", variant: "secondary" }
    ]
  }
}
```

**User Selection** → Next Request:
```json
{
  "message": "user selected decision",
  "workflowData": {
    "workflow_id": "decision-{timestamp}",
    "decision": "create"
  }
}
```

### 3. DateTime Picker

**When**: User needs to schedule a post

**Response**:
```typescript
{
  success: true,
  response: "When would you like to schedule this post?",
  interactive: {
    type: "datetime_select",
    workflow_id: "schedule-{timestamp}",
    initial_datetime: "2025-11-15T14:30:00Z",
    initial_content: "Post content here",
    campaign_id: "campaign-id-if-linked"
  }
}
```

**User Selection** → Next Request:
```json
{
  "message": "user selected datetime",
  "workflowData": {
    "workflow_id": "schedule-{timestamp}",
    "datetime": "2025-11-15T14:30:00Z",
    "content": "Post content",
    "campaign_id": "campaign-id"
  }
}
```

### 4. Confirmation Dialog

**When**: User needs to confirm an action

**Response**:
```typescript
{
  success: true,
  response: "Confirm: Post this content to LinkedIn?",
  interactive: {
    type: "confirm",
    content: "Post content here",
    campaign_id: "campaign-id"
  }
}
```

---

## Error Handling

**HTTP 400/500 Errors**:
```typescript
{
  success: false,
  error: string  // Error message to display
}
```

**Example**:
```json
{
  "success": false,
  "error": "Campaign not found. Please select a valid campaign."
}
```

---

## FloatingChatBar Expectations

### Request Flow
1. User types message in input
2. FloatingChatBar calls `fetch('/api/hgc', { method: 'POST', body: JSON.stringify(request) })`
3. Backend processes (manual orchestration, AgentKit, etc.)
4. Response returns in contracted format
5. FloatingChatBar renders response

### Response Handling

**JSON Response**:
- Display `response` as markdown in chat message
- If `interactive` exists, render appropriate inline component:
  - `InlineCampaignSelector` for campaign_select
  - `InlineDecisionButtons` for decision
  - `InlineDateTimePicker` for datetime_select

**Streaming Response**:
- Read stream chunks with `TextDecoder`
- Append to message content in real-time
- Auto-fullscreen if content > 500 chars AND trigger keywords matched
- Sync to document area if appropriate

### Critical Invariants

1. **Content-Type detection**: FloatingChatBar checks `response.headers.get('content-type')`
   - `application/json` → Parse as JSON
   - `text/plain` → Read as stream

2. **Interactive elements**: Must include `workflow_id` for continuation

3. **Error handling**: Always check `success: false` before rendering

4. **Document sync**: Content > 500 chars triggers document area population

---

## Backend Implementation Requirements

### For ANY Backend (Manual, AgentKit, etc.)

**MUST**:
1. Accept requests in documented format
2. Return responses in documented format
3. Handle workflow continuations via `workflowData`
4. Provide `workflow_id` in interactive responses
5. Stream plain text OR return JSON (Content-Type header indicates which)

**MUST NOT**:
1. Change request/response schema without adapter layer
2. Return custom formats without adaptation
3. Break interactive element contracts
4. Remove workflow_id from responses

### Adapter Pattern

If backend changes format, create adapter:

```typescript
// /lib/adapters/backend-to-floatingchat.ts
export function adaptToFloatingChat(backendOutput: any): HGCJSONResponse {
  return {
    success: true,
    response: extractResponse(backendOutput),
    interactive: extractInteractive(backendOutput)
  };
}
```

Then in `/app/api/hgc/route.ts`:
```typescript
const backendResult = await executeBackend(request);
const floatingChatResponse = adaptToFloatingChat(backendResult);
return Response.json(floatingChatResponse);
```

---

## Testing Contract Compliance

### Unit Tests

```typescript
describe('HGC API Contract', () => {
  it('returns JSON in expected format', async () => {
    const response = await fetch('/api/hgc', {
      method: 'POST',
      body: JSON.stringify({ message: 'test' })
    });
    const data = await response.json();

    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('response');
    expect(typeof data.response).toBe('string');
  });

  it('includes interactive data when applicable', async () => {
    const response = await fetch('/api/hgc', {
      method: 'POST',
      body: JSON.stringify({ message: 'launch campaign' })
    });
    const data = await response.json();

    if (data.interactive) {
      expect(data.interactive).toHaveProperty('type');
      expect(data.interactive).toHaveProperty('workflow_id');
    }
  });

  it('streams plain text chunks', async () => {
    const response = await fetch('/api/hgc', {
      method: 'POST',
      body: JSON.stringify({ message: 'write a post' })
    });

    expect(response.headers.get('content-type')).toContain('text/plain');
    // ... test streaming
  });
});
```

### Integration Tests

```typescript
describe('FloatingChatBar Integration', () => {
  it('handles campaign selection workflow', async () => {
    // 1. Initial request
    const r1 = await sendMessage('post to campaign');
    expect(r1.interactive?.type).toBe('campaign_select');

    // 2. User selection
    const r2 = await sendMessage('user selected campaign', {
      workflow_id: r1.interactive.workflow_id,
      campaign_id: 'test-campaign'
    });
    expect(r2.success).toBe(true);
  });
});
```

---

## Version History

**v1.0** (2025-11-11): Initial contract definition
- JSON response format
- Streaming response format
- Interactive element types
- Workflow continuation pattern

---

## Enforcement

**This contract is LOCKED.**

Any backend changes (AgentKit migration, new features, refactoring) MUST:
1. Maintain this contract OR
2. Provide adapter layer to convert to this contract

**FloatingChatBar will NOT be modified** to accommodate backend format changes. Backend adapts to frontend, not vice versa.
