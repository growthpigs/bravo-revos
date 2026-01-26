# Campaign → Pod Integration Plan

## Objective
Connect the Campaign system to the Pod system via UniPile webhooks to automatically trigger pod amplification when posts publish to LinkedIn.

## Architecture Decision
Using **UniPile webhook** approach:
- ✅ Confirmation-based (only real published posts)
- ✅ Complete metadata (post URL, ID, timestamp)
- ✅ Error resilient
- ✅ Clear audit trail

## Tasks

### Task 1: Create UniPile Webhook Endpoint ✅ COMPLETED

**File**: `app/api/webhooks/unipile/route.ts`

**Features**:
- Verify webhook signature from UniPile (HMAC SHA256)
- Handle three event types:
  - `post.published` - Create pod activity, update campaign
  - `post.failed` - Update campaign status to failed
  - `comment.received` - Detect trigger keywords for lead magnet automation
- Automatic pod activity creation with 1-hour urgency deadline
- Notification system placeholder
- Comprehensive error handling and logging

**Environment Variables Required**:
- `UNIPILE_WEBHOOK_SECRET` - For signature verification
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server-side operations

### Task 2: Update Database Schema ✅ COMPLETED

**File**: `supabase/migrations/20251113_pod_campaign_integration.sql`

**Changes**:
1. **campaigns table**:
   - `pod_id UUID` - Reference to associated pod
   - `last_post_url TEXT` - LinkedIn URL of most recent post
   - `last_post_at TIMESTAMP` - When last post published

2. **webhook_logs table** (NEW):
   - Audit trail for all webhook events
   - Tracks processed status, errors, related activity/campaign

3. **triggered_comments table** (NEW):
   - Stores comments with trigger keywords
   - Tracks DM automation status
   - Links to lead magnets

4. **pod_activities table** (updated):
   - `post_content TEXT` - First 500 chars of post
   - `urgency TEXT` - Priority level (urgent, normal, low)
   - `deadline TIMESTAMP` - When members should complete engagement

**RLS Policies**:
- webhook_logs: Service role only
- triggered_comments: Service role + authenticated read

### Task 3: Add Manual Trigger Button

**File**: `app/dashboard/campaigns/[id]/page.tsx`

**Component**: Manual trigger button for fallback
- Allows manual pod amplification if webhook fails
- Prompts for post URL if not auto-detected
- Calls `/api/campaigns/trigger-pod` endpoint

### Task 4: Create Manual Trigger API Endpoint

**File**: `app/api/campaigns/trigger-pod/route.ts`

**Purpose**: Fallback for manual pod triggering
- Accepts campaign_id and post_url
- Creates pod activity manually
- Updates campaign status
- Returns activity_id

### Task 5: Configure UniPile Webhook

**Steps**:
1. Go to UniPile Dashboard → Webhooks
2. Add new webhook:
   - URL: `https://[your-domain]/api/webhooks/unipile`
   - Events: `post.published`, `post.failed`, `comment.received`
   - Secret: Generate and save to `.env.local` as `UNIPILE_WEBHOOK_SECRET`

### Task 6: Test the Integration

**Test Script**: `scripts/test-pod-webhook.ts`
- Simulates UniPile webhook call
- Generates valid HMAC signature
- Tests all event types
- Validates pod activity creation

## Success Criteria

1. ✅ Webhook endpoint validates UniPile signatures
2. ✅ Post publication creates pod activity automatically
3. ✅ Pod Activity Feed shows new posts within 30 seconds
4. ✅ Manual trigger button works as fallback
5. ✅ Comments with keywords detected and logged

## Next Steps After Implementation

1. **Research UniPile Engagement API**:
   - Check if UniPile supports: `posts.like()`, `posts.reshare()`, `posts.comment()`
   - If yes, skip browser automation (much safer!)
   - If no, implement Chrome/Playwright automation

2. **Implement Notification System**:
   - Email notifications via SendGrid/Resend
   - In-app notifications via Supabase realtime
   - Push notifications (optional)

3. **Lead Magnet Automation**:
   - Connect triggered_comments to DM automation
   - Implement DMScraperChip integration
   - Auto-send lead magnets when keywords detected

## Report Back With

1. Webhook endpoint working (test with curl/Postman)
2. Pod activities created automatically on post publish
3. Screenshot of triggered pod activity
4. UniPile webhook configuration screenshot
5. Answer: Does UniPile support engagement actions (like/reshare)?

## Critical Flow

```
Campaign Created
  ↓
Post Scheduled
  ↓
UniPile Publishes Post
  ↓
Webhook → /api/webhooks/unipile
  ↓
Pod Activity Created (1hr deadline)
  ↓
Pod Members Notified
  ↓
Members Engage (like/reshare/comment)
  ↓
Viral Reach Achieved! 🚀
```

This connects the critical flow: **Campaign → Post → Pod → Viral Reach!**
