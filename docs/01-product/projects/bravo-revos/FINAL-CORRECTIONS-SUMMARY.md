# Final Corrections Summary - Bravo revOS MVP

## ✅ Key Corrections Applied

### 1. Bolt.new Tasks (Fixed)
**Before:** 1 generic task
**After:** 3 specific tasks
- T001: Generate Database Schema with Bolt.new (5 pts)
- T002: Generate Admin Portal with Bolt.new (5 pts)
- T003: Generate Client Portal with Bolt.new (5 pts)

**Important:** User creates these in Bolt.new, pushes to GitHub, we pull down

---

### 2. Engagement Pods (Fixed)
**Before:** "Fair rotation algorithm" selecting 3-5 members
**After:** EVERYONE engages with EVERYTHING
- When ANY member posts, ALL other members engage
- Like within 30 minutes (critical for algorithm)
- Comment within 1-3 hours
- Instant repost (not "repost with thoughts")
- NO selection, NO rotation - 100% participation

---

### 3. Email Delivery (Fixed)
**Before:** Send emails via Mailgun
**After:** We do NOT send emails!

**What we actually do:**
1. Upload lead magnet to Supabase Storage
2. Generate secure download URL
3. POST lead data + URL to client's webhook
4. Client sends email through their ESP (ConvertKit, Mailchimp, etc.)

**Webhook payload includes:**
```json
{
  "email": "john@example.com",
  "first_name": "John",
  "lead_magnet_url": "https://storage.supabase.co/...",
  "lead_magnet_name": "Leadership Guide",
  "campaign_id": "camp_123"
}
```

---

## 🎯 Correct Tech Stack (MVP)

### ✅ What We Use
- **Unipile API** - LinkedIn integration ($5.50/account/month)
- **BullMQ + Upstash Redis** - Job queuing with rate limiting
- **Supabase** - Database + Storage (for lead magnets)
- **Webhooks** - POST lead data to client's ESP
- **AgentKit** - AI orchestration
- **Mem0** - Persistent memory ($20/month)

### ❌ What We DON'T Use (MVP)
- **Mailgun** - Client handles email through their ESP
- **Playwright** - V2 only (for resharing automation)
- **Apollo.io** - Removed from MVP scope
- **Email sequences** - Client handles in their newsletter system

---

## 📊 Final Task Count

**Total:** 19 tasks, 100 points

### By Session:
1. **Bolt.new Scaffolds:** 3 tasks (15 pts) - User creates
2. **Cartridge System:** 3 tasks (20 pts)
3. **Unipile + BullMQ:** 3 tasks (20 pts)
4. **Email Capture + Webhook:** 3 tasks (20 pts)
5. **Engagement Pods:** 3 tasks (15 pts)
6. **AgentKit + Mem0:** 2 tasks (10 pts)
7. **Monitoring + Testing:** 2 tasks (5 pts)

### By Branch:
- **bolt-scaffold:** 3 tasks (User creates in Bolt.new)
- **cartridge-system:** 3 tasks
- **lead-magnet-features:** 13 tasks

---

## 🔑 Critical Implementation Details

### Comment Monitoring
- **NO webhooks available** for comments
- Must poll every 15-30 minutes
- Randomize intervals to avoid detection

### DM Automation
- Rate limit: 50 DMs/day per account
- Random delays: 2-15 minutes between DMs
- Template variables: {first_name}, {lead_magnet_name}

### Pod Engagement Rules
- Minimum 9 members per pod
- 100% participation (no exceptions)
- Critical timing: 30 min for likes (algorithm window)
- LinkedIn devalues pod engagement by ~30% but volume overcomes

### Lead Delivery Flow
1. Comment detected → DM sent
2. Email extracted from reply → Lead captured
3. Lead data POSTed to webhook → Client's ESP sends email
4. Client handles all email delivery and compliance

---

## ⚠️ Common Misunderstandings to Avoid

1. **We do NOT send emails** - only webhooks to client's ESP
2. **Pods are NOT selective** - everyone engages always
3. **Comments have NO webhooks** - must poll
4. **Bolt.new creates the UI** - we don't build it
5. **Playwright is V2 only** - not in MVP

---

## 📝 Implementation Notes

### For Bolt.new Tasks
User should:
1. Go to bolt.new
2. Use the prompts provided in task descriptions
3. Generate the code
4. Push to GitHub
5. We pull and integrate

### For Engagement Pods
- Use Unipile for all LinkedIn operations
- Queue all engagement actions in BullMQ
- Respect rate limits and timing windows
- Track completion in pod_activity table

### For Lead Capture
- GPT-4o extracts emails from DM replies
- Validate email format before webhook POST
- Include lead magnet URL in webhook payload
- Let client's ESP handle delivery

---

## ✅ Ready for Implementation

All 19 tasks are now correctly defined with:
- Accurate tech stack (no Mailgun, no Playwright in MVP)
- Correct engagement pod behavior (everyone engages)
- Proper Bolt.new workflow (user creates, we integrate)
- Clear webhook-only approach for lead delivery

**Next Step:** Apply these corrections to Supabase and begin Session 1 implementation