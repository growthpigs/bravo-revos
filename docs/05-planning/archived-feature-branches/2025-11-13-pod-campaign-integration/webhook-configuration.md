# UniPile Webhook Configuration Guide

## Overview

This guide walks through configuring UniPile webhooks to automatically trigger pod amplification when LinkedIn posts are published.

---

## Prerequisites

- ✅ Database migration applied (campaigns.pod_id, unipile_webhook_logs, triggered_comments)
- ✅ Webhook endpoint deployed (`/api/webhooks/unipile`)
- ✅ UniPile account with API access
- ✅ Campaigns linked to pods in the database

---

## Step 1: Generate Webhook Secret

The webhook secret is used to verify that incoming webhooks are genuinely from UniPile (HMAC SHA256 signature verification).

### Generate a Secure Secret

```bash
# Generate a 32-byte random hex string
openssl rand -hex 32
```

**Example output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### Add to Environment Variables

**Local Development (.env.local):**
```bash
UNIPILE_WEBHOOK_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Production (Render/Netlify):**
1. Navigate to environment variables section
2. Add: `UNIPILE_WEBHOOK_SECRET` = `[your generated secret]`
3. Redeploy application

⚠️ **CRITICAL:** Keep this secret secure. Never commit to git.

---

## Step 2: Configure UniPile Dashboard

### Login to UniPile

1. Navigate to: https://app.unipile.com (or your UniPile instance)
2. Login with your credentials
3. Go to: **Settings** → **Webhooks**

### Create New Webhook

**Webhook URL:**
```
Production: https://[your-domain]/api/webhooks/unipile
Local Dev:  https://[your-ngrok-url]/api/webhooks/unipile
```

⚠️ **Local Development Note:** UniPile requires HTTPS. Use ngrok or similar for local testing:
```bash
ngrok http 3000
# Use the HTTPS URL provided (e.g., https://abc123.ngrok.io)
```

### Select Events

Enable these event types:

- ✅ **post.published** - When LinkedIn post successfully publishes
- ✅ **post.failed** - When LinkedIn post publication fails
- ✅ **comment.received** - When someone comments on a post

### Webhook Secret

In the UniPile webhook configuration:
1. Find "Webhook Secret" or "Signing Secret" field
2. Paste the SAME secret you generated in Step 1
3. UniPile will use this to sign all webhook payloads

### Save Configuration

Click **Save** or **Create Webhook**

---

## Step 3: Verify Webhook Connection

### Test Webhook from UniPile Dashboard

Most webhook systems provide a "Send Test Event" button:

1. Click **Send Test Event** in UniPile dashboard
2. Select event type: `post.published`
3. Check your application logs for incoming webhook

**Expected Log Output:**
```
UniPile webhook received: post.published
Processing post.published: { campaign_id, post_url }
Pod activity created: [activity-id]
```

### Manual Trigger Test (Fallback)

If webhook test fails, verify the manual trigger works:

1. Navigate to: http://localhost:3000/dashboard/campaigns/[campaign-id]
2. Click **Trigger Pod Amplification** button
3. Enter a LinkedIn post URL
4. Verify success message appears

---

## Step 4: Verify Signature Verification

### Check Application Logs

When UniPile sends a webhook, the endpoint verifies the HMAC signature:

**Success Log:**
```
UniPile webhook received: post.published
✅ Signature verified
Processing event...
```

**Failure Log:**
```
❌ Invalid webhook signature
Webhook rejected with 401 Unauthorized
```

### Common Issues

**"Invalid signature" errors:**
- ✅ Verify UNIPILE_WEBHOOK_SECRET matches in both places
- ✅ Check for whitespace/newlines in environment variable
- ✅ Ensure application restarted after adding env var
- ✅ Verify UniPile is sending `x-unipile-signature` header

**"Webhook not received" errors:**
- ✅ Check webhook URL is correct (HTTPS required)
- ✅ Verify firewall allows incoming requests
- ✅ Check application is running and healthy
- ✅ Test with ngrok if local development

---

## Step 5: End-to-End Flow Test

### Create a Real LinkedIn Post via UniPile

1. **Setup Campaign:**
   - Navigate to: `/dashboard/campaigns`
   - Select a campaign
   - Verify campaign has `pod_id` associated

2. **Publish Post via UniPile:**
   - Use UniPile API to publish LinkedIn post
   - Include `campaign_id` in metadata

3. **Verify Automatic Pod Trigger:**
   - Check `unipile_webhook_logs` table:
     ```sql
     SELECT * FROM unipile_webhook_logs
     ORDER BY created_at DESC
     LIMIT 5;
     ```
   - Check `pod_activities` table:
     ```sql
     SELECT * FROM pod_activities
     WHERE status = 'pending'
     ORDER BY created_at DESC
     LIMIT 5;
     ```

4. **Expected Results:**
   - ✅ Webhook log entry with `event = 'post.published'`
   - ✅ Pod activity created with `urgency = 'urgent'`
   - ✅ Pod activity has 1-hour deadline
   - ✅ Campaign `last_post_url` and `last_post_at` updated

---

## Database Verification Queries

### Check Recent Webhook Events

```sql
SELECT
  event,
  campaign_id,
  processed,
  created_at,
  payload->>'post_url' as post_url
FROM unipile_webhook_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Check Pending Pod Activities

```sql
SELECT
  pa.id,
  pa.post_url,
  pa.urgency,
  pa.deadline,
  pa.status,
  p.name as pod_name,
  c.name as campaign_name
FROM pod_activities pa
JOIN pods p ON pa.pod_id = p.id
LEFT JOIN campaigns c ON c.pod_id = p.id
WHERE pa.status = 'pending'
ORDER BY pa.created_at DESC;
```

### Check Triggered Comments (Lead Magnet Automation)

```sql
SELECT
  post_id,
  comment_text,
  trigger_detected,
  processed,
  dm_sent,
  created_at
FROM triggered_comments
WHERE trigger_detected = true
ORDER BY created_at DESC
LIMIT 10;
```

---

## Troubleshooting

### Webhook Not Triggering Pod Activities

**Check 1: Campaign has pod_id**
```sql
SELECT id, name, pod_id, last_post_url
FROM campaigns
WHERE id = '[your-campaign-id]';
```

If `pod_id` is NULL, associate a pod:
```sql
UPDATE campaigns
SET pod_id = '[pod-id]'
WHERE id = '[campaign-id]';
```

**Check 2: UniPile payload includes campaign_id**

The UniPile API call must include campaign metadata:
```javascript
await unipile.posts.create({
  account_id: '[account-id]',
  text: 'Post content...',
  metadata: {
    campaign_id: '[campaign-id]'  // ✅ REQUIRED
  }
});
```

**Check 3: Webhook logs show errors**
```sql
SELECT event, error_message, payload
FROM unipile_webhook_logs
WHERE processed = false
OR error_message IS NOT NULL;
```

### Manual Trigger Button Not Visible

The button only appears if `campaign.pod_id` is set:

```sql
-- Verify campaign has pod
SELECT id, name, pod_id FROM campaigns WHERE id = '[campaign-id]';
```

If NULL, run:
```sql
UPDATE campaigns SET pod_id = '[pod-id]' WHERE id = '[campaign-id]';
```

Then refresh the campaign detail page.

---

## Security Considerations

### HMAC Signature Verification

The endpoint uses timing-safe comparison to prevent timing attacks:

```typescript
crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expectedSig)
);
```

⚠️ **Never disable signature verification in production**

### Service Role Key

The webhook endpoint uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS policies. This is correct because:
- Webhooks come from external system (not authenticated user)
- Need to create pod_activities on behalf of campaign owner
- RLS policies still enforce data isolation by `client_id`

### Rate Limiting (TODO)

Consider adding rate limiting to webhook endpoint:
- Max 100 requests per minute per IP
- Exponential backoff for failed webhooks
- Alert on excessive failures

---

## Next Steps

After webhook configuration is complete:

1. **Implement Notification System** (placeholder in code)
   - Email pod members when activity created
   - Push notifications for urgent activities
   - In-app notifications via Supabase realtime

2. **Connect Triggered Comments to DM Automation**
   - Process `triggered_comments` table
   - Trigger DMScraperChip for lead magnet delivery
   - Track DM delivery success/failure

3. **UniPile Engagement API Research**
   - Check if UniPile supports `posts.like()`, `posts.reshare()`, `posts.comment()`
   - If yes, automate pod member engagement
   - If no, continue with manual engagement workflow

4. **Analytics Dashboard**
   - Track pod activity completion rates
   - Measure viral reach (likes, reshares, comments)
   - Campaign performance by pod

---

## Reference Links

- UniPile API Docs: https://docs.unipile.com
- Webhook Security: https://docs.unipile.com/webhooks/security
- HMAC SHA256: https://nodejs.org/api/crypto.html#crypto_crypto_createhmac_algorithm_key_options

---

## Support

If webhook configuration fails:
1. Check application logs for detailed error messages
2. Verify environment variables are set correctly
3. Test with manual trigger button as fallback
4. Review `unipile_webhook_logs` table for failed events
