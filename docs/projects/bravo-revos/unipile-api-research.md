# Unipile LinkedIn API - Comprehensive Technical Research Report

**Research Date:** November 3, 2025
**Project:** Bravo revOS - LinkedIn Lead Magnet Tool
**Purpose:** Evaluate Unipile's capabilities for building automated LinkedIn engagement and lead capture system

---

## Executive Summary

Unipile provides a production-ready LinkedIn API that bypasses LinkedIn's restrictive Partner Program requirements. It offers comprehensive access to LinkedIn messaging, profile data, post interactions, and connection management through a unified REST API. The service uses authenticated session management (not web scraping) to mirror real user behavior while maintaining account safety.

**Key Advantages:**
- No LinkedIn Partner Program approval needed
- 48-hour integration timeline (vs. months for official API)
- Starting at $49/month with transparent per-account pricing
- 500+ endpoints covering messaging, posts, comments, profiles, and search
- Multi-account management with automatic rate limiting
- Webhook support for real-time events

**Key Limitations:**
- Rate limits imposed by LinkedIn itself (not Unipile)
- Webhook events have up to 8-hour delay (not real-time)
- Can only access public LinkedIn data
- Must respect LinkedIn's daily action limits to avoid detection

---

## 1. Unipile vs. Official LinkedIn API

### Official LinkedIn API
- **Access Requirements:** Must join LinkedIn Partner Program (Marketing, Sales, Talent, Learning tracks)
- **Approval Process:** Months of review, strict requirements
- **Cost:** Enterprise access starts at thousands per month + additional licensing fees for Premium features
- **Restrictions:** No messaging API access, limited endpoints, strict rate limits
- **Best For:** Large enterprises with formal LinkedIn partnerships

### Unipile LinkedIn API
- **Access Requirements:** Create Unipile account, no LinkedIn approval needed
- **Approval Process:** Instant access, 48-hour integration
- **Cost:** Starts at $49/month, tiered per-account pricing
- **Restrictions:** LinkedIn's own rate limits apply, but full feature access
- **Best For:** SaaS products, automation tools, recruiting/sales platforms, lead generation

### Technical Approach Differences
| Feature | Official LinkedIn API | Unipile API |
|---------|----------------------|-------------|
| Authentication | OAuth 2.0 with app review | User session-based (username/password or cookies) |
| Rate Limiting | Strict, enforced by LinkedIn | Automatic handling, mirrors human behavior |
| Messaging Access | ❌ Not available | ✅ Full DM support including InMail |
| Comment Monitoring | ❌ Limited | ✅ Full access to post comments |
| Profile Scraping | ❌ Not allowed | ✅ Via authenticated requests |
| Multi-Account | ❌ Complex | ✅ Built-in support |
| Webhooks | ✅ Real-time | ⚠️ Delayed (up to 8 hours) |

---

## 2. Authentication & Account Connection

### Base URL Structure

**DSN Format:** `https://{subdomain}.unipile.com:{port}/api/v1/`

Example: `https://api1.unipile.com:13211/api/v1/`

The DSN (Data Source Name) is unique to your account and obtained from the Unipile Dashboard.

### Authentication Headers

All requests require:
```http
X-API-KEY: {YOUR_ACCESS_TOKEN}
Content-Type: application/json
Accept: application/json
```

### Account Connection Methods

#### Method 1: Hosted Auth Wizard (Recommended)
Single API call generates a temporary redirect link for users to authenticate.

**Endpoint:** `POST /api/v1/hosted-auth`

**Features:**
- Pre-built authentication UI
- Supports QR code scanning, credentials, OAuth
- Returns callback with `account_id` on success
- Handles checkpoints automatically

**Use Case:** Best for SaaS products where users connect their own LinkedIn accounts.

#### Method 2: Username/Password Authentication
**Endpoint:** `POST /api/v1/accounts`

**Request Body:**
```json
{
  "provider": "LINKEDIN",
  "username": "user@email.com",
  "password": "password123"
}
```

**Response:**
- Success: Returns `account_id` and status "OK"
- Checkpoint Required: Returns 202 status with checkpoint type

**Checkpoint Types:**
- `2FA` / `OTP` - Two-factor authentication required
- `IN_APP_VALIDATION` - Requires mobile app confirmation
- `PHONE_REGISTER` - Mobile phone verification needed
- `CAPTCHA` - Visual verification (mostly handled automatically)

**Checkpoint Resolution:**
```http
POST /api/v1/accounts/{account_id}/checkpoint
{
  "code": "123456"  // OTP or verification code
}
```

**Authentication Intent Window:** 5 minutes to complete checkpoints before timeout.

#### Method 3: Cookie-Based Authentication
Uses existing LinkedIn session cookies.

**Required Data:**
- `li_at` cookie (primary authentication cookie)
- `user_agent` (browser user agent where cookie obtained)
- `ip` (optional but recommended)

**Important:** Collect user agent from the same browser to prevent account disconnection.

**Use Case:** For tools where users are already logged into LinkedIn in browser.

---

## 3. Core API Endpoints

### 3.1 Messaging API

#### Send Message to Existing Chat
```http
POST https://{YOUR_DSN}/api/v1/chats/{chat_id}/messages
Content-Type: multipart/form-data
X-API-KEY: {YOUR_ACCESS_TOKEN}

Form Data:
- text: "Hello world!"
- attachment: [optional file, max 15MB]
```

**cURL Example:**
```bash
curl --request POST \
  --url https://api1.unipile.com:13211/api/v1/chats/9f9uio56sopa456s/messages \
  --header 'X-API-KEY: YOUR_TOKEN' \
  --header 'accept: application/json' \
  --header 'content-type: multipart/form-data' \
  --form 'text=Hello world !'
```

**Node SDK Example:**
```javascript
const response = await client.messaging.sendMessage({
  chat_id: "9f9uio56sopa456s",
  text: "Hello world !"
});
```

#### Start New Chat / Message User
```http
POST https://{YOUR_DSN}/api/v1/chats

{
  "account_id": "connected_account_id",
  "attendees_ids": ["user_provider_id"],
  "text": "Hello! Interested in connecting",
  "inmail": false  // Set true for InMail (requires Premium LinkedIn)
}
```

**LinkedIn-Specific Rules:**
- Can only message existing connections (unless using InMail)
- InMail requires Premium LinkedIn account
- Set `inmail: true` in payload for InMail

#### List Chats
```http
GET https://{YOUR_DSN}/api/v1/chats?account_id={account_id}
```

**Response:**
```json
{
  "object": "list",
  "items": [
    {
      "id": "chat_id",
      "account_id": "account_id",
      "attendees": [...],
      "last_message": {...},
      "unread_count": 0
    }
  ]
}
```

#### Retrieve Messages from Chat
```http
GET https://{YOUR_DSN}/api/v1/chats/{chat_id}/messages?account_id={account_id}
```

---

### 3.2 Posts & Comments API

#### Retrieve Post by ID
```http
GET https://{YOUR_DSN}/api/v1/posts/{post_id}?account_id={account_id}
```

**Important:** LinkedIn uses multiple IDs for the same post. Always use the `social_id` field from the response for interactions.

**Response:**
```json
{
  "id": "internal_id",
  "social_id": "urn:li:activity:7332661864792854528",
  "text": "Post content...",
  "author": {...},
  "reactions": {...},
  "comments_count": 42,
  "created_at": "2025-11-01T10:00:00Z"
}
```

**Getting Post ID from URL:**
1. Extract ID from LinkedIn URL (e.g., `https://linkedin.com/posts/activity-7332661864792854528`)
2. Call retrieve post endpoint with URL ID
3. Use returned `social_id` for all subsequent interactions

#### List User's Posts
```http
GET https://{YOUR_DSN}/api/v1/users/{user_id}/posts?account_id={account_id}
```

**Node SDK:**
```javascript
const posts = await client.users.getAllPosts({
  account_id: "account_id",
  user_id: "user_provider_id"
});
```

#### Send Comment on Post
```http
POST https://{YOUR_DSN}/api/v1/posts/{social_id}/comments

{
  "account_id": "account_id",
  "text": "Great post! Thanks for sharing",
  "comment_id": "optional_parent_comment_id",  // For replies
  "mentions": [
    {
      "user_id": "mentioned_user_id",
      "name": "John Doe"
    }
  ]
}
```

**Features:**
- Comment on posts
- Reply to comments (threading)
- Mention users with `@name` syntax

**Node SDK:**
```javascript
await client.users.sendPostComment({
  account_id: "account_id",
  post_id: "urn:li:activity:7332661864792854528",
  text: "Insightful perspective!"
});
```

#### List Post Comments
```http
GET https://{YOUR_DSN}/api/v1/posts/{social_id}/comments?account_id={account_id}
```

**Node SDK:**
```javascript
const comments = await client.users.getAllPostComments({
  account_id: "account_id",
  post_id: "urn:li:activity:7332661864792854528"
});
```

**Response:**
```json
{
  "items": [
    {
      "id": "comment_id",
      "text": "Comment text",
      "author": {
        "name": "John Doe",
        "profile_url": "...",
        "provider_id": "..."
      },
      "created_at": "2025-11-01T12:00:00Z",
      "reactions": {...}
    }
  ]
}
```

#### Add Reaction to Post
```http
POST https://{YOUR_DSN}/api/v1/posts/{social_id}/reactions

{
  "account_id": "account_id",
  "type": "LIKE"  // or LOVE, CELEBRATE, INSIGHTFUL, etc.
}
```

#### List Post Reactions
```http
GET https://{YOUR_DSN}/api/v1/posts/{social_id}/reactions?account_id={account_id}
```

#### Create LinkedIn Post
```http
POST https://{YOUR_DSN}/api/v1/posts

{
  "account_id": "account_id",
  "text": "Post content here",
  "media": [...]  // Optional images/videos
}
```

---

### 3.3 Profile & User Data API

#### Retrieve User Profile
```http
GET https://{YOUR_DSN}/api/v1/users/{provider_public_id}?account_id={account_id}
```

**Parameters:**
- `provider_public_id` - LinkedIn public identifier (e.g., "john-doe-123456")
- Can also use `provider_id` (internal LinkedIn ID)

**Node SDK:**
```javascript
const profile = await client.users.getProfile({
  account_id: "account_id",
  user_id: "john-doe-123456"
});
```

**Response Data:**
```json
{
  "id": "provider_id",
  "public_identifier": "john-doe-123456",
  "full_name": "John Doe",
  "headline": "Software Engineer at Tech Co",
  "location": "San Francisco, CA",
  "profile_url": "https://linkedin.com/in/john-doe-123456",
  "picture_url": "https://...",
  "email": "john@example.com",  // If public
  "phone": "+1234567890",  // If public
  "experience": [
    {
      "title": "Software Engineer",
      "company": "Tech Co",
      "duration": "2020 - Present",
      "description": "..."
    }
  ],
  "education": [
    {
      "school": "University Name",
      "degree": "BS Computer Science",
      "dates": "2016 - 2020"
    }
  ],
  "skills": ["JavaScript", "Python", "React"],
  "endorsements": {...}
}
```

**Available Data Points:**
- Basic info (name, headline, location, profile picture)
- Professional experience (job titles, companies, durations, descriptions)
- Educational background (institutions, degrees, dates)
- Skills and endorsements
- Public contact info (email, phone) when available

**Privacy Note:** Unipile only retrieves public user data, adhering to GDPR and privacy regulations.

#### Retrieve Company Profile
```http
GET https://{YOUR_DSN}/api/v1/companies/{company_id}?account_id={account_id}
```

**Node SDK:**
```javascript
const company = await client.users.getCompanyProfile({
  account_id: "account_id",
  company_id: "company-identifier"
});
```

#### Retrieve My Profile
```http
GET https://{YOUR_DSN}/api/v1/users/me?account_id={account_id}
```

---

### 3.4 LinkedIn Search API

**Endpoint:**
```http
POST https://{YOUR_DSN}/api/v1/linkedin/search?account_id={account_id}
Content-Type: application/json

{
  "api": "classic",  // or "sales_navigator", "recruiter"
  "category": "people",  // or "companies", "jobs", "posts"
  "keywords": "software engineer",
  "network_distance": [1, 2],  // 1st and 2nd degree connections
  "location": [102277331],  // Location IDs
  "role": {
    "include": ["developer OR engineer"],
    "priority": "MUST_HAVE"
  },
  "skills": {
    "include": [12345, 67890],  // Skill IDs
    "priority": "MUST_HAVE"
  },
  "industry": {
    "include": [4],
    "exclude": [96]
  },
  "start": 0,
  "page_count": 25
}
```

#### Search Parameter Lookup
Before searching, you can look up parameter IDs:

```http
GET https://{YOUR_DSN}/api/v1/linkedin/search/parameters?account_id={account_id}&type=LOCATION&keywords=los%20angeles&limit=100
```

**Parameter Types:**
- `LOCATION` - Location IDs
- `INDUSTRY` - Industry IDs
- `SKILL` - Skill IDs
- `COMPANY` - Company IDs

#### Search Categories

**People Search:**
```json
{
  "category": "people",
  "keywords": "product manager",
  "network_distance": [1, 2, 3],  // 1st, 2nd, 3rd degree
  "profile_language": "en",
  "tenure": {
    "min": 2,
    "max": 5
  }
}
```

**Company Search:**
```json
{
  "category": "companies",
  "keywords": "tech startup",
  "location": [102277331],
  "has_job_offers": true,
  "industry": {
    "include": [4, 96]
  }
}
```

**Posts Search:**
```json
{
  "category": "posts",
  "keywords": "artificial intelligence",
  "sort_by": "date",
  "date_posted": "past_week",
  "content_type": "images"
}
```

#### Search Response
```json
{
  "object": "LinkedinSearch",
  "items": [
    {
      "id": "user_id",
      "full_name": "Jane Smith",
      "headline": "Product Manager at Startup Inc",
      "location": "New York, NY",
      "profile_url": "...",
      "connection_degree": 2
    }
  ],
  "paging": {
    "start": 0,
    "page_count": 25,
    "total_count": 1000,
    "cursor": "pagination_token"
  }
}
```

#### Search Pagination
```http
POST https://{YOUR_DSN}/api/v1/linkedin/search?account_id={account_id}

{
  "cursor": "pagination_token_from_previous_response"
}
```

#### Search Limitations
- Standard accounts: First 1,000 results per query
- Sales Navigator/Recruiter: First 2,500 results per query
- To retrieve all results: Filter queries and perform multiple searches
- Recommended daily limit: 1,000 profiles (standard) or 2,500 (Premium)

---

### 3.5 Connection Management API

#### Send Connection Invitation
```http
POST https://{YOUR_DSN}/api/v1/invitations

{
  "account_id": "account_id",
  "user_id": "target_user_provider_id",
  "message": "Hi! I'd love to connect and discuss..."  // Max 300 chars for paid, 200 for free
}
```

**Rate Limits:**
- Paid/Active accounts: 80-100 invitations per day, ~200 per week
- Free accounts: ~5 per month with message, 150/week without message

#### List Pending Invitations
```http
GET https://{YOUR_DSN}/api/v1/invitations?account_id={account_id}&status=pending
```

#### List Connections (Relations)
```http
GET https://{YOUR_DSN}/api/v1/users/me/relations?account_id={account_id}
```

**Important:** Avoid fixed-interval polling to prevent automation detection. Use `new_relation` webhook instead.

#### Delete/Withdraw Invitation
```http
DELETE https://{YOUR_DSN}/api/v1/invitations/{invitation_id}?account_id={account_id}
```

---

### 3.6 Account Management API

#### List Connected Accounts
```http
GET https://{YOUR_DSN}/api/v1/accounts
```

**Response:**
```json
{
  "items": [
    {
      "id": "account_id",
      "provider": "LINKEDIN",
      "status": "OK",  // or "CREDENTIALS", "DISCONNECTED"
      "name": "John Doe",
      "email": "john@email.com",
      "created_at": "...",
      "last_update": "..."
    }
  ]
}
```

**Account Statuses:**
- `OK` - Active and working
- `CREDENTIALS` - Requires reconnection (password changed, session expired)
- `DISCONNECTED` - Account disconnected

#### Update Account
```http
PATCH https://{YOUR_DSN}/api/v1/accounts/{account_id}

{
  "status": "OK",
  "name": "Updated Name"
}
```

#### Delete Account
```http
DELETE https://{YOUR_DSN}/api/v1/accounts/{account_id}
```

---

## 4. Webhooks

### Overview
Unipile supports webhooks for real-time notifications (with some delays for LinkedIn events).

### Creating Webhooks

**API Method:**
```http
POST https://{YOUR_DSN}/api/v1/webhooks

{
  "source": "users",  // or "messages", "emails"
  "request_url": "https://yourendpoint.com/webhook",
  "name": "New LinkedIn Connection",
  "headers": [
    {
      "key": "Content-Type",
      "value": "application/json"
    },
    {
      "key": "Unipile-Auth",
      "value": "your_secret_key"
    }
  ]
}
```

**Dashboard Method:** Configure directly in Unipile Dashboard UI.

### Available Webhook Events

#### 1. New Messages (`messages` source)
Triggers when new message received.

**Payload Example:**
```json
{
  "event": "new_message",
  "account_id": "account_id",
  "account_type": "LINKEDIN",
  "chat_id": "chat_id",
  "message": {
    "id": "message_id",
    "text": "Message content",
    "author": {...},
    "created_at": "2025-11-03T10:00:00Z"
  }
}
```

#### 2. New Relation / Accepted Invitation (`users` source, event: `new_relation`)
Triggers when LinkedIn invitation accepted.

**Important:** NOT real-time - delays up to 8 hours due to LinkedIn limitations and polling intervals.

**Payload Example:**
```json
{
  "event": "new_relation",
  "account_id": "account_id",
  "account_type": "LINKEDIN",
  "webhook_name": "New LinkedIn Connection",
  "user_full_name": "Jane Smith",
  "user_provider_id": "ACoAAAh_Ffqss54sqAGQOD8u7sl5of04y9_3AwyM",
  "user_public_identifier": "jane-smith-123",
  "user_profile_url": "https://www.linkedin.com/in/jane-smith-123/",
  "user_picture_url": "https://media.licdn.com/dms/image/..."
}
```

#### 3. Account Status Updates (`account` source)
Triggers when account status changes (e.g., requires reconnection).

**Critical for Production:** Monitor this webhook to detect when accounts need reauthentication.

**Payload Example:**
```json
{
  "event": "account_status_change",
  "account_id": "account_id",
  "old_status": "OK",
  "new_status": "CREDENTIALS",
  "account_type": "LINKEDIN"
}
```

#### 4. New Emails (`emails` source)
For email integrations (Gmail, Outlook).

#### 5. Tracking Email (`emails` source)
For email open/click tracking.

### Webhook Requirements

**Response Timing:** Must reply with HTTP 200 status in less than 30 seconds.

**Retry Logic:** Unipile makes 5 retry attempts with incremental delays if status is not 200.

**Authentication:** Add custom header (e.g., `Unipile-Auth`) to verify webhook origin.

**Content-Type Header:** API-created webhooks lack JSON content-type by default. Add manually:
```json
{
  "headers": [
    {
      "key": "Content-Type",
      "value": "application/json"
    }
  ]
}
```

---

## 5. Detecting Accepted Invitations

LinkedIn doesn't provide real-time events for invitation acceptance. Unipile offers three methods:

### Method 1: `new_relation` Webhook (Recommended)
- Automated, no polling needed
- Delay: Up to 8 hours
- Best for: Non-urgent notifications, analytics

### Method 2: Message-Based Detection (Near Real-Time)
If invitation includes message, acceptance creates new chat.

**Detection Logic:**
1. Subscribe to `new_message` webhook
2. When new message arrives:
   - Check if chat is new
   - Verify you're the sender
   - Confirm it's the first message in chat
   - Match against sent invitations

**Advantage:** Near real-time detection (minutes vs. hours)
**Limitation:** Only works if invitation included message

### Method 3: Periodic Polling (Manual)

**Option A: Compare Relations List**
```http
GET /api/v1/users/me/relations?account_id={account_id}&sort=recent
```
Compare against sent invitations to find newly accepted.

**Option B: Check Invitation Status**
```http
GET /api/v1/invitations?account_id={account_id}
```
Identify which invitations transitioned from "pending" to "accepted".

**Critical:** Space checks randomly throughout the day. Avoid fixed intervals (e.g., every hour at :00) to prevent automation detection.

---

## 6. Rate Limits & Restrictions

### LinkedIn-Imposed Limits (Not Unipile)

Unipile does not enforce usage limits - you can make unlimited API calls. However, **LinkedIn's platform enforces strict limits** that Unipile respects to maintain account safety.

#### Connection Requests (Invitations)
- **Paid/Active LinkedIn Accounts:**
  - 80-100 invitations per day
  - ~200 per week
  - 300-character messages
- **Free LinkedIn Accounts:**
  - ~5 per month with messages (200-char limit)
  - 150 per week without messages

**Error Handling:** HTTP 422 with `cannot_resend_yet` indicates hitting LinkedIn's limit.

#### Profile Retrieval
- **Standard Accounts:** ~100 profiles per day
- **Sales Navigator:** Additional requests available
- **Recruiter Lite:** Officially supports 2,000 per day
- **Recommended Daily Limit:** 1,000 profiles (standard) or 2,500 (Premium)

#### Search Results
Two separate caps apply:
- **Per-search limit:** 1,000 profiles (standard), 2,500 (Sales Navigator/Recruiter)
- **Daily recommendation:** Same as above

**Workaround:** Filter queries to perform multiple targeted searches instead of one broad search.

#### Direct Messages (DMs)
- No hard limit, but **recommended maximum:**
  - Start with 15 DMs per day
  - Increase by 5 each week
  - Cap at 50 DMs per day
- **Sales Navigator/Recruiter:** 100-150 messages per day

#### InMail
- Credits vary by subscription type
- Free InMails: ~800 per month per account
- **Recommendation:** Space randomly, limit to 30-50 per day

#### Posts, Comments, Reactions
- **Default Limit:** 100 actions per day per account
- Includes: Company profiles, posts, messages, comments, reactions

#### Relations & Invitation Monitoring
- **Critical:** Avoid fixed-interval polling
- **Use:** `new_relation` webhook instead
- **If Polling Required:**
  - Initial sync allowed
  - Afterward: Retrieve first page "a few times a day with randomly spaced intervals"

### Best Practices to Avoid Detection

1. **Random Spacing:** Space all API calls randomly, not at fixed intervals
2. **Start Conservatively:** New or inactive accounts should start slow and ramp up gradually
3. **Real Accounts Only:** Fake accounts are easily detected and banned
4. **Error Handling:** Handle HTTP 429 (rate limit) and 500 (server error) gracefully
5. **Human-Like Patterns:** Mimic human behavior - don't send 100 messages at 3 AM
6. **Gradual Scaling:** Increase activity slowly over weeks, not days

### Unipile's Automatic Rate Limiting
Unipile automatically:
- Spaces requests to avoid detection
- Handles retry logic for failed requests
- Manages session rotation for multi-account setups
- Assigns fixed proxies to accounts (40+ countries available)

---

## 7. Pricing Structure (2025)

### Tiered Per-Account Pricing

Unipile uses a post-paid model based on the number of linked accounts per month.

| Linked Accounts | Price per Account/Month (EUR) | Price per Account/Month (USD) |
|-----------------|-------------------------------|-------------------------------|
| 11-50           | €5.00                         | $5.50                         |
| 51-200          | €4.50                         | $5.00                         |
| 201-1,000       | €4.00                         | $4.50                         |
| 1,001-5,000     | €3.50                         | $4.00                         |
| 5,001+          | €3.00                         | $3.50                         |

### Billing Model

- **Post-Paid:** Invoice generated at end of each monthly consumption period
- **First Invoice:** Issued after first 30-day period
- **Calculation:** Based on total number of linked accounts during month
- **No Usage Caps:** Unlimited API calls per account (LinkedIn limits still apply)

### Free Trial

- **Duration:** 7 days
- **Requirements:** No credit card required
- **Access:** Full feature access during trial
- **Best For:** Testing integration before commitment

### Example Pricing Scenarios

**Scenario 1: Small Agency (25 LinkedIn accounts)**
- 25 accounts × $5.50 = **$137.50/month**

**Scenario 2: Mid-Size SaaS (150 LinkedIn accounts)**
- 150 accounts × $5.00 = **$750/month**

**Scenario 3: Enterprise Tool (2,000 LinkedIn accounts)**
- 2,000 accounts × $4.50 = **$9,000/month**

**Comparison to Official LinkedIn API:**
- LinkedIn Enterprise API: $5,000-$50,000/month + licensing fees
- Unipile: Transparent per-account pricing starting at $5.50

---

## 8. Node.js SDK

### Installation
```bash
npm install unipile-node-sdk
```

### Initialization
```javascript
import { UnipileClient } from 'unipile-node-sdk';

const client = new UnipileClient(
  'https://api1.unipile.com:13211',  // Your DSN
  'YOUR_ACCESS_TOKEN'
);
```

### SDK Method Categories

#### Account Methods (`client.account.*`)
```javascript
// Create hosted auth link
const { url } = await client.account.createHostedAuthLink({
  success_redirect_url: "https://yourapp.com/success",
  failure_redirect_url: "https://yourapp.com/failure"
});

// Connect LinkedIn with username/password
await client.account.connectLinkedin({
  username: "user@email.com",
  password: "password123"
});
```

#### Messaging Methods (`client.messaging.*`)
```javascript
// Get all chats
const chats = await client.messaging.getAllChats({
  account_id: "account_id",
  provider: "LINKEDIN"
});

// Send message
await client.messaging.sendMessage({
  chat_id: "chat_id",
  text: "Hello!",
  attachment: fileBuffer  // Optional
});

// Start new chat
await client.messaging.startNewChat({
  account_id: "account_id",
  attendees_ids: ["user_provider_id"],
  text: "Hi! Let's connect",
  inmail: false
});

// Get message attachment
const attachment = await client.messaging.getMessageAttachment({
  account_id: "account_id",
  chat_id: "chat_id",
  message_id: "message_id",
  attachment_id: "attachment_id"
});
```

#### User/Profile Methods (`client.users.*`)
```javascript
// Get user profile
const profile = await client.users.getProfile({
  account_id: "account_id",
  user_id: "john-doe-123456"
});

// Get company profile
const company = await client.users.getCompanyProfile({
  account_id: "account_id",
  company_id: "company-identifier"
});

// Get my profile
const myProfile = await client.users.getMyProfile({
  account_id: "account_id"
});

// Get user posts
const posts = await client.users.getAllPosts({
  account_id: "account_id",
  user_id: "user_provider_id"
});

// Send post comment
await client.users.sendPostComment({
  account_id: "account_id",
  post_id: "urn:li:activity:7332661864792854528",
  text: "Great post!"
});

// Get post comments
const comments = await client.users.getAllPostComments({
  account_id: "account_id",
  post_id: "urn:li:activity:7332661864792854528"
});
```

#### Email Methods (`client.email.*`)
```javascript
// Get emails history
const emails = await client.email.getAllEmails({
  account_id: "account_id"
});

// Send email
await client.email.sendEmail({
  account_id: "account_id",
  to: ["recipient@email.com"],
  subject: "Subject",
  body: "Email content"
});

// Reply to email
await client.email.replyToEmail({
  account_id: "account_id",
  email_id: "email_id",
  body: "Reply content"
});
```

### Extra Parameters
All SDK methods support `extra_params` for passing additional parameters not included in method signatures:

```javascript
await client.messaging.sendMessage({
  chat_id: "chat_id",
  text: "Hello",
  extra_params: {
    custom_field: "value"
  }
});
```

### GitHub Repository
- **URL:** https://github.com/unipile/unipile-node-sdk
- **NPM:** https://www.npmjs.com/package/unipile-node-sdk
- **Language:** TypeScript
- **License:** MIT

---

## 9. What Unipile CAN Do

### ✅ Messaging & Communication
- Send direct messages to LinkedIn connections
- Start new conversations (with existing connections or via InMail)
- Retrieve message history
- Send/receive attachments (max 15MB)
- Multi-account message management
- Unified inbox across LinkedIn, WhatsApp, Instagram, Messenger, Telegram

### ✅ Post Interactions
- Retrieve posts from users and companies
- Comment on posts
- Reply to comments (threading)
- Add reactions (Like, Love, Celebrate, Insightful, etc.)
- List reactions and comments
- Create new LinkedIn posts
- Mention users in comments

### ✅ Profile & Data Extraction
- Retrieve user profiles (public data only)
- Get company profiles
- Extract profile viewers
- Access professional experience, education, skills, endorsements
- Get public contact information (email, phone when available)
- GDPR-compliant data retrieval

### ✅ Connection Management
- Send connection invitations with custom messages
- List pending invitations
- Withdraw/delete invitations
- List connections (relations)
- Detect accepted invitations (via webhook or polling)

### ✅ LinkedIn Search
- Search people with advanced filters (role, skills, industry, location, connection degree)
- Search companies with filters (location, industry, job offers)
- Search jobs and posts
- Support for LinkedIn Classic, Sales Navigator, and Recruiter
- Pagination support
- Parameter lookup for location, industry, skill IDs

### ✅ Multi-Account Management
- Connect and manage multiple LinkedIn accounts simultaneously
- Automatic account status monitoring
- Session management with fixed proxies (40+ countries)
- Webhook notifications for account status changes

### ✅ Automation & Webhooks
- Real-time webhook support for new messages
- Delayed webhook for new connections/relations (up to 8 hours)
- Account status change notifications
- Email tracking and notifications
- Custom webhook headers for authentication

### ✅ Integration Features
- Node.js SDK with TypeScript support
- REST API with 500+ endpoints
- Hosted auth wizard for user onboarding
- OAuth-like authentication flows
- Compatible with automation platforms (N8N, Make.com, Zapier)
- IMAP email integration
- Calendar integration (Google, Microsoft)

---

## 10. What Unipile CANNOT Do

### ❌ Real-Time LinkedIn Events
- **Limitation:** LinkedIn doesn't support real-time webhooks for most events
- **Impact:** New connection webhook has up to 8-hour delay
- **Workaround:** Use message-based detection for near real-time (if invitation included message)

### ❌ Bypass LinkedIn Rate Limits
- **Limitation:** Must respect LinkedIn's daily action limits
- **Impact:** Can't send unlimited messages, invitations, or profile requests
- **Quotas:**
  - 50 DMs/day max (start at 15, ramp up gradually)
  - 80-100 invitations/day (paid accounts)
  - 100-150 messages/day (Sales Navigator/Recruiter)
  - 1,000-2,500 profiles/day depending on account type

### ❌ Access Private/Non-Public Data
- **Limitation:** Only public LinkedIn data is accessible
- **Cannot Access:**
  - Private profile information hidden from your connection degree
  - Private messages of other users
  - Data behind LinkedIn Premium paywalls (without Premium account)
  - Email addresses not publicly shared

### ❌ Mass/Bulk Automation Without Limits
- **Limitation:** LinkedIn's anti-spam and anti-bot detection
- **Cannot Do:**
  - Send 1,000 messages at once
  - Scrape profiles continuously without delays
  - Use fixed-interval polling (triggers detection)
  - Automate actions from fake accounts

### ❌ Web Scraping / Browser Automation
- **Unipile's Approach:** Uses authenticated API requests, not web scraping
- **Cannot Do:**
  - Traditional Selenium/Puppeteer-style scraping
  - Bypass CAPTCHAs automatically (most are handled, but some require user input)
  - Access LinkedIn without valid user credentials

### ❌ Guarantee Account Safety for Abuse
- **Limitation:** Violating LinkedIn's terms can still result in account bans
- **Unipile's Safety:**
  - Mirrors human behavior
  - Automatic rate limiting
  - Respects LinkedIn boundaries
- **User Responsibility:**
  - Don't send spam
  - Don't use fake accounts
  - Follow LinkedIn's acceptable use policies

### ❌ Replace Official LinkedIn Partner API for Certain Use Cases
- **When Official API Required:**
  - Building a LinkedIn competitor
  - Enterprise-grade compliance requirements
  - Need LinkedIn's official support and SLA
  - Require LinkedIn branding/certification

### ❌ Unlimited Search Results per Query
- **Limitation:** LinkedIn caps search results at 1,000-2,500 per query
- **Workaround:** Filter searches and perform multiple targeted queries

---

## 11. LinkedIn Lead Magnet Use Case Analysis

### Target Use Case
Build a tool that monitors LinkedIn post comments and automatically engages with commenters via DM to capture leads.

### Feasibility Assessment: ✅ FULLY SUPPORTED

#### Required Capabilities ✅
1. **Monitor Post Comments** ✅
   - Endpoint: `GET /api/v1/posts/{social_id}/comments`
   - Can retrieve all comments on target posts
   - Extract commenter profile data

2. **Extract Commenter Profiles** ✅
   - Endpoint: `GET /api/v1/users/{provider_public_id}`
   - Get full profile data including name, headline, email (if public)
   - Profile URL for follow-up

3. **Send Direct Messages** ✅
   - Endpoint: `POST /api/v1/chats` (start new chat)
   - Can message existing connections immediately
   - Use InMail for non-connections (Premium required)

4. **Detect New Comments** ⚠️ (Manual Polling Required)
   - No real-time webhook for new comments
   - Must poll comments endpoint periodically
   - Recommended: Poll every 15-30 minutes with random intervals

5. **Detect Message Responses** ✅
   - Webhook: `new_message` event
   - Real-time notification when prospects reply

6. **Multi-Account Support** ✅
   - Manage multiple LinkedIn accounts
   - Scale lead generation across accounts

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Bravo revOS Backend                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Comment Monitoring Service                     │  │
│  │  - Poll target posts every 15-30 min (randomized)     │  │
│  │  - Extract new comments since last check              │  │
│  │  - Enrich commenter profiles                          │  │
│  │  - Filter based on targeting criteria                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Lead Qualification Engine                      │  │
│  │  - Score leads based on profile data                  │  │
│  │  - Check connection status                            │  │
│  │  - Apply custom filters (title, industry, etc.)       │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Engagement Automation Service                  │  │
│  │  - Send connection requests (if not connected)        │  │
│  │  - Wait for acceptance (webhook: new_relation)        │  │
│  │  - Send personalized DM with lead magnet offer        │  │
│  │  - Track engagement via new_message webhook           │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Lead Capture & CRM Integration                 │  │
│  │  - Capture contact info from conversations            │  │
│  │  - Store in database                                  │  │
│  │  - Sync with CRM (optional)                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Steps

#### Phase 1: Account Setup & Authentication
1. Integrate Unipile Node SDK
2. Implement Hosted Auth flow for users to connect LinkedIn accounts
3. Store account credentials and status
4. Set up account status webhook handler

#### Phase 2: Comment Monitoring
1. Create scheduled job to poll target posts (every 15-30 min, randomized)
2. Extract comments using `GET /api/v1/posts/{social_id}/comments`
3. Track processed comments in database (avoid duplicates)
4. Enrich commenter data using `GET /api/v1/users/{provider_public_id}`

#### Phase 3: Lead Qualification
1. Implement filtering logic:
   - Job title contains keywords (e.g., "founder", "CEO", "director")
   - Industry matches target industries
   - Location matches target regions
   - Connection degree (prioritize 2nd degree)
2. Score leads based on profile completeness, engagement quality
3. Store qualified leads in database

#### Phase 4: Automated Engagement
1. Check if already connected:
   - If yes: Send DM immediately
   - If no: Send connection request, wait for webhook
2. Send connection request using `POST /api/v1/invitations`
3. Listen for `new_relation` webhook (up to 8-hour delay)
4. Send personalized DM with lead magnet offer using `POST /api/v1/chats`

#### Phase 5: Conversation Management
1. Set up `new_message` webhook to detect replies
2. Implement conversation flow:
   - Detect interest
   - Capture email/phone
   - Send lead magnet link
   - Tag as converted lead
3. Store all messages in database

#### Phase 6: Rate Limiting & Safety
1. Implement daily quota tracking per account:
   - Max 50 DMs/day
   - Max 80 invitations/day
   - Max 100 comments checked per poll
2. Add random delays between actions (5-30 seconds)
3. Monitor for HTTP 429/422 errors
4. Pause activity if errors detected

### Rate Limit Considerations for Lead Magnet Tool

**Per LinkedIn Account:**
- Monitor 10-20 target posts
- Expect 50-200 new comments/day across posts
- Qualify 20-50 leads/day
- Send 30-50 DMs/day (within safe limits)
- Send 20-30 connection requests/day

**Scaling Strategy:**
- Start with 1-2 LinkedIn accounts
- Monitor for 1-2 weeks
- Add 1-2 accounts per week
- Target 10-20 accounts for full-scale operation

**Expected Lead Volume:**
- Per account: 30-50 qualified leads/day
- 10 accounts: 300-500 leads/day
- Assuming 5-10% conversion: 15-50 captured leads/day

### Critical Success Factors

✅ **Randomized Polling:** Avoid detection by varying poll intervals (15-30 min)
✅ **Gradual Ramp-Up:** Start slow, increase activity over weeks
✅ **Personalization:** Customize DM based on comment content and profile
✅ **Connection Strategy:** Prioritize existing connections, use invitations strategically
✅ **Error Handling:** Gracefully handle rate limits and account issues
✅ **Multi-Account Rotation:** Distribute load across multiple accounts

### Pricing Estimate for Lead Magnet Tool

**Scenario: 10 LinkedIn Accounts**
- 10 accounts × $5.50/month = **$55/month**
- Expected ROI: 300-500 leads/day × 5% conversion = 15-25 leads/day
- Cost per lead: $55 / 750 leads/month = **$0.07 per lead**

**Highly cost-effective compared to:**
- LinkedIn Ads: $5-$10 per lead
- Cold email tools: $1-$3 per lead
- Manual outreach: Hours of human time

---

## 12. Code Examples

### Complete Lead Magnet Workflow

```javascript
import { UnipileClient } from 'unipile-node-sdk';

const client = new UnipileClient(
  process.env.UNIPILE_DSN,
  process.env.UNIPILE_API_KEY
);

// 1. Monitor post for new comments
async function monitorPostComments(accountId, postSocialId) {
  const comments = await client.users.getAllPostComments({
    account_id: accountId,
    post_id: postSocialId
  });

  // Filter new comments (check against database)
  const newComments = comments.items.filter(comment =>
    !isCommentProcessed(comment.id)
  );

  for (const comment of newComments) {
    await processComment(accountId, comment);
  }
}

// 2. Process individual comment
async function processComment(accountId, comment) {
  // Get commenter profile
  const profile = await client.users.getProfile({
    account_id: accountId,
    user_id: comment.author.provider_id
  });

  // Qualify lead
  const isQualified = qualifyLead(profile, comment);
  if (!isQualified) return;

  // Save to database
  await saveLeadToDatabase({
    name: profile.full_name,
    headline: profile.headline,
    profileUrl: profile.profile_url,
    comment: comment.text,
    linkedinId: profile.id,
    publicId: profile.public_identifier
  });

  // Engage
  await engageLead(accountId, profile, comment);
}

// 3. Qualify lead based on criteria
function qualifyLead(profile, comment) {
  const targetTitles = ['founder', 'ceo', 'director', 'vp', 'head of'];
  const targetIndustries = ['software', 'saas', 'technology'];

  const titleMatch = targetTitles.some(title =>
    profile.headline.toLowerCase().includes(title)
  );

  const industryMatch = targetIndustries.some(industry =>
    profile.headline.toLowerCase().includes(industry)
  );

  return titleMatch || industryMatch;
}

// 4. Engage with qualified lead
async function engageLead(accountId, profile, comment) {
  // Check if already connected
  const isConnected = await checkConnection(accountId, profile.id);

  if (isConnected) {
    // Send DM immediately
    await sendDM(accountId, profile, comment);
  } else {
    // Send connection request first
    await sendConnectionRequest(accountId, profile, comment);
  }
}

// 5. Send connection request
async function sendConnectionRequest(accountId, profile, comment) {
  const message = `Hi ${profile.full_name.split(' ')[0]}, I saw your insightful comment on [Post Topic]. I'd love to connect and share a resource that might help with [relevant topic from comment].`;

  await client.invitations.send({
    account_id: accountId,
    user_id: profile.id,
    message: message
  });

  // Track in database as pending connection
  await markAsPendingConnection(profile.id);
}

// 6. Send direct message (after connected)
async function sendDM(accountId, profile, comment) {
  const message = generatePersonalizedMessage(profile, comment);

  await client.messaging.startNewChat({
    account_id: accountId,
    attendees_ids: [profile.id],
    text: message
  });

  // Track in database
  await markAsMessaged(profile.id);
}

// 7. Generate personalized message
function generatePersonalizedMessage(profile, comment) {
  const firstName = profile.full_name.split(' ')[0];

  return `Hi ${firstName},

I noticed your comment on [Post Topic]: "${comment.text.substring(0, 100)}..."

Your perspective on [topic] really resonated with me. I've put together a comprehensive guide on [lead magnet topic] that I think you'd find valuable.

Would you like me to send it over?

Best,
[Your Name]`;
}

// 8. Handle new_relation webhook (connection accepted)
async function handleNewRelationWebhook(event) {
  const { account_id, user_provider_id } = event;

  // Check if this is a lead we're tracking
  const lead = await getLeadByProviderId(user_provider_id);
  if (!lead) return;

  // Update status in database
  await markAsConnected(lead.id);

  // Get comment context
  const comment = await getOriginalComment(lead.id);

  // Send DM
  const profile = { id: user_provider_id, full_name: lead.name };
  await sendDM(account_id, profile, comment);
}

// 9. Handle new_message webhook (prospect replied)
async function handleNewMessageWebhook(event) {
  const { account_id, chat_id, message } = event;

  // Check if this chat is with a tracked lead
  const lead = await getLeadByChatId(chat_id);
  if (!lead) return;

  // Analyze message for interest signals
  const showsInterest = detectInterest(message.text);

  if (showsInterest) {
    // Send lead magnet link
    await client.messaging.sendMessage({
      chat_id: chat_id,
      text: `Great! Here's the guide: [LINK]\n\nFeel free to reach out if you have questions. Would you also like me to send you our weekly newsletter on [topic]?`
    });

    // Mark as converted
    await markAsConverted(lead.id);
  } else {
    // Handle objection or continue conversation
    await handleConversationFlow(chat_id, message.text);
  }
}

// 10. Detect interest in message
function detectInterest(messageText) {
  const interestSignals = [
    'yes', 'sure', 'please', 'interested', 'send it',
    'that would be great', 'sounds good', 'appreciate'
  ];

  return interestSignals.some(signal =>
    messageText.toLowerCase().includes(signal)
  );
}

// 11. Scheduled job - Run every 15-30 minutes (randomized)
async function runMonitoringJob() {
  const accounts = await getActiveAccounts();
  const targetPosts = await getTargetPosts();

  for (const account of accounts) {
    for (const post of targetPosts) {
      await monitorPostComments(account.account_id, post.social_id);

      // Random delay between posts (10-30 seconds)
      await sleep(randomBetween(10000, 30000));
    }
  }
}

// 12. Helper: Random sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// 13. Setup webhooks
async function setupWebhooks() {
  // New relation webhook
  await fetch(`${process.env.UNIPILE_DSN}/api/v1/webhooks`, {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.UNIPILE_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source: 'users',
      request_url: 'https://yourapp.com/webhooks/new-relation',
      name: 'New LinkedIn Connection',
      headers: [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Unipile-Auth', value: process.env.WEBHOOK_SECRET }
      ]
    })
  });

  // New message webhook
  await fetch(`${process.env.UNIPILE_DSN}/api/v1/webhooks`, {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.UNIPILE_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source: 'messages',
      request_url: 'https://yourapp.com/webhooks/new-message',
      name: 'New LinkedIn Message',
      headers: [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Unipile-Auth', value: process.env.WEBHOOK_SECRET }
      ]
    })
  });
}
```

---

## 13. Security & Compliance

### Data Privacy
- **GDPR Compliant:** Unipile only accesses public LinkedIn data
- **Data Retention:** Configure data retention policies in dashboard
- **User Consent:** Required for connecting user LinkedIn accounts
- **Encryption:** All API communication over HTTPS

### Account Security
- **Proxy Support:** Fixed proxies per account (40+ countries)
- **User Agent Tracking:** Maintains consistent user agent per account
- **Session Management:** Automatic session refresh and management
- **Checkpoint Handling:** Supports 2FA, OTP, phone verification

### Best Practices
1. **Secure Credential Storage:**
   - Never store LinkedIn passwords in plain text
   - Use Unipile's account management (credentials not exposed to your backend)
   - Store only `account_id` and status

2. **Webhook Authentication:**
   - Always add custom secret header to webhooks
   - Verify `Unipile-Auth` header on incoming webhooks
   - Validate payload signature

3. **Rate Limit Compliance:**
   - Track daily quotas per account
   - Implement circuit breakers for rate limit errors
   - Use exponential backoff for retries

4. **Error Monitoring:**
   - Monitor account status webhook for `CREDENTIALS` status
   - Alert when accounts need reconnection
   - Log all API errors for debugging

---

## 14. Key Takeaways & Recommendations

### ✅ Unipile is EXCELLENT for:
- **LinkedIn automation tools** (recruiting, sales, lead gen)
- **Multi-account management** (agencies, teams)
- **Messaging automation** (DMs, InMail, connection requests)
- **Profile enrichment** (data extraction for CRM)
- **Post engagement tracking** (comments, reactions, monitoring)
- **Rapid integration** (48 hours vs. months for official API)

### ⚠️ Consider Limitations:
- **Webhook delays** (up to 8 hours for new connections)
- **LinkedIn rate limits apply** (cannot bypass platform restrictions)
- **Polling required** for comment monitoring (no real-time events)
- **Account safety** depends on respecting LinkedIn's terms

### 🎯 Perfect for Bravo revOS Use Case
The LinkedIn lead magnet tool is **100% feasible** with Unipile:
- ✅ Monitor post comments via polling (15-30 min intervals)
- ✅ Extract commenter profiles with full data
- ✅ Send automated DMs to qualified leads
- ✅ Detect replies via real-time webhook
- ✅ Capture lead info in conversation
- ✅ Scale across multiple LinkedIn accounts

### 💰 Cost-Effective Solution
- **10 accounts:** $55/month
- **Expected output:** 300-500 leads/day
- **Cost per lead:** ~$0.07 (vs. $5-$10 for LinkedIn Ads)

### 🚀 Recommended Next Steps
1. **Sign up for 7-day free trial:** Test integration with 1-2 accounts
2. **Build MVP:**
   - Comment monitoring service (polling)
   - Lead qualification logic
   - Automated engagement flow
   - Webhook handlers for messages and connections
3. **Deploy to Render:** Run as background worker (Docker container)
4. **Monitor & Optimize:** Track conversion rates, refine targeting
5. **Scale Gradually:** Add accounts weekly, monitor for rate limits

---

## 15. Additional Resources

### Official Documentation
- **Main Documentation:** https://developer.unipile.com/docs/getting-started
- **API Reference:** https://developer.unipile.com/reference
- **LinkedIn Guide:** https://developer.unipile.com/docs/linkedin
- **Webhooks:** https://developer.unipile.com/docs/webhooks-2
- **Rate Limits:** https://developer.unipile.com/docs/provider-limits-and-restrictions

### GitHub & SDKs
- **Node.js SDK:** https://github.com/unipile/unipile-node-sdk
- **NPM Package:** https://www.npmjs.com/package/unipile-node-sdk
- **GitHub Organization:** https://github.com/unipile

### Integration Guides
- **N8N Automation:** https://www.unipile.com/n8n-linkedin/
- **Make.com:** https://www.unipile.com/make-com-linkedin/
- **Hosted Auth:** https://developer.unipile.com/docs/hosted-auth

### Support
- **Dashboard:** https://dashboard.unipile.com
- **Pricing:** https://www.unipile.com/pricing-api/
- **Contact:** Available through dashboard

---

## Conclusion

Unipile provides a production-ready, cost-effective alternative to LinkedIn's official API with comprehensive access to messaging, posts, comments, profiles, and search. For building a LinkedIn lead magnet tool, Unipile offers all necessary capabilities with reasonable rate limits and excellent developer experience.

The service is particularly well-suited for Bravo revOS's use case: monitoring post comments, qualifying leads, and automating DM outreach. With proper implementation of polling, rate limiting, and webhook handling, the tool can scale to hundreds of leads per day across multiple LinkedIn accounts at a fraction of the cost of traditional lead generation methods.

**Confidence Level:** ✅ HIGH - Unipile is the right solution for this project.
