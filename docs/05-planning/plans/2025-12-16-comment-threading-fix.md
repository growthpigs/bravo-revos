# Fix: Enable Threaded Comment Replies in RevOS

## Problem
Comment replies post as **top-level comments** instead of **threaded replies** under the original comment.

## Root Cause
`replyToComment()` doesn't accept or pass `comment_id` to the Unipile API.

## Live Validation Proof
**We tested this live and it WORKS:**
- API Call: `POST /comments` with `comment_id: "7393985314815524864"` (Dan Burykin's comment)
- Response: `201 {"object":"CommentSent"}`
- Dan's `reply_counter`: 0 → 1
- User visually confirmed threaded reply on LinkedIn

The code comment at line 811 saying "LinkedIn doesn't support threaded comment replies" is **OUTDATED**.

---

## Implementation Plan

### Task 1: Update `replyToComment()` function signature
**File:** `lib/unipile-client.ts`
**Lines:** 818-822

```typescript
// BEFORE
export async function replyToComment(
  accountId: string,
  postId: string,
  text: string
): Promise<{ status: string; comment_id?: string }>

// AFTER
export async function replyToComment(
  accountId: string,
  postId: string,
  text: string,
  commentId?: string  // Optional: parent comment ID for threaded replies
): Promise<{ status: string; comment_id?: string }>
```

### Task 2: Include `comment_id` in API body
**File:** `lib/unipile-client.ts`
**Lines:** 853-856

```typescript
// BEFORE
body: JSON.stringify({
  account_id: accountId,
  text,
}),

// AFTER
body: JSON.stringify({
  account_id: accountId,
  text,
  ...(commentId && { comment_id: commentId }),
}),
```

### Task 3: Update mock mode log
**File:** `lib/unipile-client.ts`
**Lines:** 826-830

Add `commentId` to mock log for debugging visibility.

### Task 4: Update call site 1 (Email captured path)
**File:** `lib/workers/comment-monitor.ts`
**Lines:** 416-420

```typescript
// BEFORE
await replyToComment(
  job.unipile_account_id,
  job.unipile_post_id,
  replyMessage
);

// AFTER
await replyToComment(
  job.unipile_account_id,
  job.unipile_post_id,
  replyMessage,
  comment.id  // Thread under original comment
);
```

### Task 5: Update call site 2 (Connected user - "check DMs" reply)
**File:** `lib/workers/comment-monitor.ts`
**Lines:** 477-481

Same pattern: add `comment.id` as 4th argument.

### Task 6: Update call site 3 (Not connected - public reply)
**File:** `lib/workers/comment-monitor.ts`
**Lines:** 537-541

Same pattern: add `comment.id` as 4th argument.

### Task 7: Fix outdated code comment
**File:** `lib/unipile-client.ts`
**Lines:** 810-817

```typescript
// BEFORE
/**
 * Reply to a comment on a LinkedIn post
 * Note: LinkedIn doesn't support threaded comment replies via API.
 * This posts a new comment on the post mentioning the user.

// AFTER
/**
 * Reply to a comment on a LinkedIn post
 * Supports threaded replies when commentId is provided.
 * @param accountId - Unipile account ID
 * @param postId - LinkedIn post ID (activity ID)
 * @param text - Comment text to post
 * @param commentId - Optional parent comment ID for threaded replies
 * @returns Response with comment status
 */
```

---

## Files Modified
1. `lib/unipile-client.ts` - Function signature + API body + comment
2. `lib/workers/comment-monitor.ts` - 3 call sites

## Backward Compatibility
- `commentId` is optional, so existing code won't break
- Without `commentId`, posts top-level comment (current behavior)
- With `commentId`, posts threaded reply (new behavior)

## Verification
After implementation, run the comment monitor worker and verify:
1. Replies appear threaded under original comments on LinkedIn
2. No errors in worker logs
3. `reply_counter` on parent comments increments
