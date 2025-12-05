# Unipile API Reference

## Posts and Comments

### Official Documentation
- Main: https://developer.unipile.com/docs/posts-and-comments
- Getting Started: https://developer.unipile.com/docs/getting-started
- GitHub SDK: https://github.com/unipile/unipile-node-sdk

## Replying to Comments

### Top-Level Comments
**Endpoint:** `POST /api/v1/posts/{social_id}/comments`

**Parameters:**
```json
{
  "account_id": "your_account_id",
  "text": "Comment text",
  "mentions": [] // Optional
}
```

**Use Case:** Post a new comment on a post

---

### Nested Replies (Reply to Specific Comment)
**Endpoint:** `POST /api/v1/posts/{social_id}/comments`

**Parameters:**
```json
{
  "account_id": "your_account_id",
  "text": "Reply text",
  "comment_id": "7335000001439513601", // THE KEY PARAMETER
  "mentions": [] // Optional
}
```

**Critical Difference:** Include `comment_id` to reply to a specific comment instead of posting a top-level comment

**Use Case:** Reply directly to a user's comment (appears nested under their comment)

---

## Important Notes

1. **Post ID Format:** Must be URN format `urn:li:activity:XXXX` when used in API paths
2. **Comment ID Format:** Raw comment ID string (e.g., `7335000001439513601`)
3. **Endpoint is the same** - the `comment_id` parameter determines if it's a top-level comment or nested reply
4. **Mentions:** Can mention users by including their profile IDs in the mentions array

## Revos Implementation

- **File:** `lib/unipile-client.ts`
- **Function:** `replyToComment(accountId, postId, text, commentId?)`
- **Status:** ✅ Updated to support nested replies
- **Change:** Added optional `commentId` parameter to distinguish between top-level and nested replies

---

**Last Updated:** 2025-12-05
**Source:** https://developer.unipile.com/docs/posts-and-comments
