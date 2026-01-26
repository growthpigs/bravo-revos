# F-01 AgentKit - Critical Fix Guide

**URGENT**: Schema mismatch in `pod_activities` table integration

---

## The Problem

The `scheduleEngagementActivities` method in `lib/agentkit/orchestrator.ts` (lines 335-406) attempts to insert records into `pod_activities` table with incorrect column names and missing required fields.

### What Will Fail

When AgentKit tries to schedule engagement activities, the Supabase insert will fail with:
```
column "profile_id" of relation "pod_activities" does not exist
column "post_url" violates not-null constraint
value "scheduled" violates check constraint (not in enum)
```

---

## The Fix (30 minutes)

### Step 1: Update the Query to Get Pod Members (Line 341-345)

**Current Code**:
```typescript
const { data: members } = await supabase
  .from('pod_members')
  .select('profile_id')
  .eq('pod_id', params.podId);
```

**Fixed Code**:
```typescript
const { data: members } = await supabase
  .from('pod_members')
  .select('id, profile_id')  // Need member ID, not just profile_id
  .eq('pod_id', params.podId);
```

---

### Step 2: Get Post URL (Add New Query After Line 348)

**Add This**:
```typescript
// Get post URL (required by schema)
const { data: postData } = await supabase
  .from('posts')
  .select('linkedin_post_url')
  .eq('id', params.postId)
  .single();

if (!postData?.linkedin_post_url) {
  console.error('[AgentKit] Post missing linkedin_post_url:', params.postId);
  return 0;
}

const postUrl = postData.linkedin_post_url;
```

---

### Step 3: Fix Like Activities Insert (Lines 360-369)

**Current Code**:
```typescript
activities.push({
  pod_id: params.podId,
  post_id: params.postId,
  profile_id: member.profile_id,  // ❌ Wrong column name
  engagement_type: 'like',
  status: 'scheduled',  // ❌ Not in enum
  scheduled_for: scheduledFor.toISOString(),
  created_at: now.toISOString(),
  // ❌ Missing required post_url field
});
```

**Fixed Code**:
```typescript
activities.push({
  pod_id: params.podId,
  post_id: params.postId,
  post_url: postUrl,  // ✅ Required field
  engagement_type: 'like',
  member_id: member.id,  // ✅ Correct column name
  scheduled_for: scheduledFor.toISOString(),
  status: 'pending',  // ✅ Valid enum value
  created_at: now.toISOString(),
});
```

---

### Step 4: Fix Comment Activities Insert (Lines 376-390)

**Current Code**:
```typescript
activities.push({
  pod_id: params.podId,
  post_id: params.postId,
  profile_id: member.profile_id,  // ❌ Wrong column name
  engagement_type: 'comment',
  status: 'scheduled',  // ❌ Not in enum
  scheduled_for: scheduledFor.toISOString(),
  comment_text: 'Great insights!',
  created_at: now.toISOString(),
  // ❌ Missing required post_url field
});
```

**Fixed Code**:
```typescript
activities.push({
  pod_id: params.podId,
  post_id: params.postId,
  post_url: postUrl,  // ✅ Required field
  engagement_type: 'comment',
  member_id: member.id,  // ✅ Correct column name
  scheduled_for: scheduledFor.toISOString(),
  status: 'pending',  // ✅ Valid enum value
  comment_text: 'Great insights!',
  created_at: now.toISOString(),
});
```

---

## Complete Fixed Method

Here's the entire `scheduleEngagementActivities` method with all fixes applied:

```typescript
private async scheduleEngagementActivities(params: {
  postId: string;
  podId: string;
  strategy: any;
}): Promise<number> {
  // Get all pod members with their IDs
  const supabase = await createClient();
  const { data: members } = await supabase
    .from('pod_members')
    .select('id, profile_id')  // ✅ FIXED: Get member ID
    .eq('pod_id', params.podId);

  if (!members || members.length === 0) {
    return 0;
  }

  // ✅ FIXED: Get post URL (required field)
  const { data: postData } = await supabase
    .from('posts')
    .select('linkedin_post_url')
    .eq('id', params.postId)
    .single();

  if (!postData?.linkedin_post_url) {
    console.error('[AgentKit] Post missing linkedin_post_url:', params.postId);
    return 0;
  }

  const postUrl = postData.linkedin_post_url;

  const now = new Date();
  const activities: any[] = [];

  // Schedule likes for all members
  const [likeMinDelay, likeMaxDelay] = params.strategy.likeWindow || [1, 30];
  for (const member of members) {
    const likeDelay = Math.random() * (likeMaxDelay - likeMinDelay) + likeMinDelay;
    const scheduledFor = new Date(now.getTime() + likeDelay * 60 * 1000);

    activities.push({
      pod_id: params.podId,
      post_id: params.postId,
      post_url: postUrl,  // ✅ FIXED: Required field
      engagement_type: 'like',
      member_id: member.id,  // ✅ FIXED: Use member.id
      scheduled_for: scheduledFor.toISOString(),
      status: 'pending',  // ✅ FIXED: Valid enum value
      created_at: now.toISOString(),
    });
  }

  // Schedule comments for all members
  const [commentMinDelay, commentMaxDelay] = params.strategy.commentWindow || [
    30, 180,
  ];
  for (const member of members) {
    const commentDelay =
      Math.random() * (commentMaxDelay - commentMinDelay) + commentMinDelay;
    const scheduledFor = new Date(now.getTime() + commentDelay * 60 * 1000);

    activities.push({
      pod_id: params.podId,
      post_id: params.postId,
      post_url: postUrl,  // ✅ FIXED: Required field
      engagement_type: 'comment',
      member_id: member.id,  // ✅ FIXED: Use member.id
      scheduled_for: scheduledFor.toISOString(),
      status: 'pending',  // ✅ FIXED: Valid enum value
      comment_text: 'Great insights!', // Will be enhanced by voice cartridge in E-05
      created_at: now.toISOString(),
    });
  }

  // Insert all activities
  const { error } = await supabase
    .from('pod_activities')
    .insert(activities);

  if (error) {
    console.error('[AgentKit] Error scheduling activities:', error);
    throw new Error(`Failed to schedule activities: ${error.message}`);  // ✅ FIXED: Throw error instead of returning 0
  }

  console.log(
    `[AgentKit] Scheduled ${activities.length} activities for post ${params.postId}`
  );
  return activities.length;
}
```

---

## Verification Steps

### 1. After Making Changes

```bash
# TypeScript compilation check
npx tsc --noEmit

# Run tests
npm test -- __tests__/agentkit-orchestration.test.ts
```

### 2. Add Integration Test

Create a test that validates the schema:

```typescript
// In __tests__/agentkit-orchestration.test.ts
it('should create valid pod_activities records', async () => {
  const mockSupabase = {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'member-1',
          profile_id: 'profile-1',
        },
      }),
      insert: jest.fn((records) => {
        // Validate record structure
        records.forEach(record => {
          expect(record).toHaveProperty('post_url');
          expect(record).toHaveProperty('member_id');
          expect(record.status).toMatch(/^(pending|completed|failed)$/);
          expect(record).not.toHaveProperty('profile_id');
        });
        return { error: null };
      }),
    })),
  };

  // Test orchestration with mocked Supabase
  // ...
});
```

### 3. Manual Testing on Staging

```bash
# Deploy migration
npm run supabase:db:push

# Test API endpoint
curl -X POST http://localhost:3000/api/agentkit/orchestrate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "orchestrate_post",
    "postId": "test-post-id",
    "campaignId": "test-campaign-id",
    "podId": "test-pod-id"
  }'

# Verify records in Supabase
# Check pod_activities table for new records with correct columns
```

---

## Schema Reference

For reference, here's the complete `pod_activities` table schema:

```sql
CREATE TABLE pod_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID REFERENCES pods(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id),
  post_url TEXT NOT NULL,  -- REQUIRED FIELD
  engagement_type TEXT CHECK (engagement_type IN ('like', 'comment', 'repost')),
  member_id UUID REFERENCES pod_members(id),  -- NOT profile_id
  scheduled_for TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')),  -- NOT 'scheduled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Time Estimate

- **Code changes**: 15 minutes
- **Testing**: 10 minutes
- **Verification**: 5 minutes
- **Total**: 30 minutes

---

## Related Issues

After fixing this, consider these improvements:

1. **Medium Priority**: Add OpenAI retry logic (see validation report)
2. **Medium Priority**: Add OPENAI_API_KEY validation (see validation report)
3. **Low Priority**: Enhanced error logging

See `F-01-AGENTKIT-ORCHESTRATION-VALIDATION-REPORT.md` for complete details.

---

**Status**: BLOCKER - Must be fixed before production deployment
**Priority**: CRITICAL
**Estimated Fix Time**: 30 minutes
