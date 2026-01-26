# Bravo revOS - Developer Quick Start Guide

**Time to First Commit:** ~30 minutes
**Prerequisites:** Node.js 18+, Git, Supabase account

## 🚀 TL;DR - Get Running in 5 Minutes

```bash
# Clone and setup
git clone [repository-url] bravo-revos
cd bravo-revos
npm install
cp .env.example .env

# Edit .env with your keys
# Start development
npm run dev

# Open http://localhost:3000
```

---

## 📋 Prerequisites

### Required Accounts
- [ ] **Supabase** - Database ([Create free account](https://supabase.com))
- [ ] **Unipile** - LinkedIn API ([Get API key](https://unipile.com))
- [ ] **OpenAI** - GPT-4 access ([Get API key](https://platform.openai.com))
- [ ] **Upstash** - Redis for queues ([Create account](https://upstash.com))
- [ ] **Mem0** - Memory system ([Get API key](https://mem0.ai))

### Development Tools
- [ ] Node.js 18+ and npm
- [ ] Git
- [ ] VS Code (recommended)
- [ ] Postman or similar (for API testing)

---

## 🏗️ Project Setup

### 1. Clone Repository

```bash
git clone [repository-url] bravo-revos
cd bravo-revos
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# LinkedIn Integration
UNIPILE_API_KEY=unipile_...
UNIPILE_BASE_URL=https://api.unipile.com

# AI Services
OPENAI_API_KEY=sk-...
MEM0_API_KEY=mem0_...

# Queue System
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Security
JWT_SECRET=your-secret-key-minimum-32-chars
ENCRYPTION_KEY=another-secret-key-for-encryption
```

### 4. Database Setup

```bash
# Run Supabase migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

Or manually in Supabase SQL Editor:

```sql
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Run migrations from /supabase/migrations/
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🎯 Quick Implementation Tasks

### Task 1: Create Your First Campaign

```typescript
// pages/api/campaigns/create.ts
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = createClient();
  const data = await req.json();

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      name: data.name,
      trigger_word: data.triggerWord,
      lead_magnet_id: data.leadMagnetId,
      client_id: data.clientId
    })
    .select()
    .single();

  if (error) throw error;
  return Response.json(campaign);
}
```

### Task 2: Implement Comment Polling

```typescript
// lib/polling/comment-monitor.ts
import { UnipileClient } from '@/lib/unipile';
import { Queue } from 'bullmq';

const dmQueue = new Queue('dms');

export async function pollComments() {
  const campaigns = await getActiveCampaigns();

  for (const campaign of campaigns) {
    const comments = await unipile.getPostComments({
      postId: campaign.postId,
      since: campaign.lastPolledAt
    });

    for (const comment of comments) {
      if (comment.text.toLowerCase().includes(campaign.triggerWord)) {
        await dmQueue.add('send-initial-dm', {
          recipientId: comment.authorId,
          campaignId: campaign.id
        });
      }
    }

    await updateLastPolled(campaign.id);
  }
}

// Schedule polling every 15-30 minutes
setInterval(pollComments, randomBetween(15, 30) * 60 * 1000);
```

### Task 3: Send DM with Voice Filter

```typescript
// lib/dm/send-message.ts
import { CopywritingSkill } from '@/lib/skills/copywriting';
import { VoiceCartridge } from '@/lib/cartridge/voice';
import { UnipileClient } from '@/lib/unipile';

export async function sendPersonalizedDM(
  recipientId: string,
  campaignId: string
) {
  // Step 1: Generate professional copy
  const copy = await copywritingSkill.generate({
    type: 'dm_initial',
    campaign: await getCampaign(campaignId)
  });

  // Step 2: Apply voice filter
  const cartridge = await getUserCartridge();
  const personalized = await voiceCartridge.transform(copy, cartridge);

  // Step 3: Send via Unipile
  const result = await unipile.sendMessage({
    recipientId,
    message: personalized
  });

  // Step 4: Track in database
  await trackDM({
    leadId: recipientId,
    campaignId,
    message: personalized,
    unipileMessageId: result.id
  });
}
```

---

## 🔧 Common Development Tasks

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

### Database Operations

```bash
# Create new migration
npm run db:migration:create "add_new_table"

# Run migrations
npm run db:migrate

# Reset database
npm run db:reset

# Open Supabase Studio
npm run db:studio
```

### Queue Management

```bash
# Start BullMQ dashboard
npm run queue:dashboard

# Process jobs
npm run queue:worker

# Clear all queues
npm run queue:clear
```

---

## 🏢 Project Structure

```
bravo-revos/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # Auth pages (login, register)
│   ├── admin/             # Admin portal
│   ├── dashboard/         # Client dashboard
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── campaigns/        # Campaign-specific
│   └── leads/            # Lead management
├── lib/                   # Core logic
│   ├── supabase/         # Database client
│   ├── unipile/          # LinkedIn integration
│   ├── skills/           # AI skills (copywriting)
│   ├── cartridge/        # Voice system
│   ├── queue/            # BullMQ setup
│   └── webhook/          # Webhook delivery
├── hooks/                 # React hooks
├── types/                 # TypeScript types
├── utils/                 # Utility functions
├── supabase/             # Database files
│   ├── migrations/       # SQL migrations
│   └── seed.sql         # Seed data
└── docs/                 # Documentation
    └── projects/
        └── bravo-revos/
            ├── spec.md
            ├── data-model.md
            └── quickstart.md (this file)
```

---

## 🔑 Key Concepts to Understand

### 1. Multi-Tenant Architecture
```
Agencies → Clients → Users
```
All data is isolated by Row Level Security (RLS).

### 2. Content Pipeline
```
Copywriting Skill → Voice Cartridge → Final Output
```
Every message goes through this pipeline.

### 3. Lead Flow
```
Post → Comment → DM → Email → Webhook → Backup
```
7-step automated flow.

### 4. Engagement Pods
Everyone engages with everything - no rotation.

### 5. Rate Limiting
- 50 DMs/day per LinkedIn account
- 25 posts/day
- Random delays between actions

---

## 🚦 API Endpoints

### Campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns` - List campaigns
- `GET /api/campaigns/:id` - Get campaign
- `PATCH /api/campaigns/:id` - Update campaign

### Leads
- `GET /api/leads` - List leads
- `GET /api/leads/:id` - Get lead details
- `POST /api/leads/export` - Export CSV

### Webhooks
- `POST /api/webhooks/test` - Test webhook
- `GET /api/webhooks/deliveries` - Delivery history

### LinkedIn
- `POST /api/linkedin/auth` - Connect account
- `POST /api/linkedin/post` - Create post
- `GET /api/linkedin/comments` - Poll comments

---

## 🐛 Debugging Tips

### Check Archon MCP Server
```bash
ps aux | grep archon
# Should see process on port 8051
```

### Monitor Queue Jobs
```bash
# Open BullMQ dashboard
npm run queue:dashboard
# Visit http://localhost:3001
```

### View Supabase Logs
```sql
-- In Supabase SQL Editor
SELECT * FROM queue_jobs WHERE status = 'failed';
SELECT * FROM dm_sequences WHERE status = 'failed';
```

### Test Unipile Connection
```typescript
// scripts/test-unipile.ts
import { UnipileClient } from '@/lib/unipile';

const client = new UnipileClient(process.env.UNIPILE_API_KEY);
const accounts = await client.listAccounts();
console.log(accounts);
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Archon MCP server not found"
```bash
cd .archon
bash start.sh
```

### Issue: "Supabase connection failed"
- Check SUPABASE_URL and keys in .env
- Ensure RLS is configured properly

### Issue: "Unipile rate limit"
- Check daily limits in linkedin_accounts table
- Implement exponential backoff

### Issue: "Voice cartridge not working"
- Ensure OpenAI API key is valid
- Check cartridge exists for user

---

## 📚 Essential Documentation

### Internal Docs
- [Master Specification](spec.md)
- [Data Model](data-model.md)
- [Lead Flow](COMPREHENSIVE-LEAD-FLOW.md)
- [Skills Integration](SKILLS-AND-VOICE-INTEGRATION.md)

### External Resources
- [Unipile API Docs](https://developer.unipile.com)
- [Supabase Docs](https://supabase.com/docs)
- [BullMQ Guide](https://docs.bullmq.io)
- [Mem0 Docs](https://docs.mem0.ai)

---

## 🎮 Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:migrate      # Run migrations
npm run db:seed        # Seed data
npm run db:reset       # Reset database

# Testing
npm test               # Run tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report

# Queue
npm run queue:worker   # Start worker
npm run queue:dashboard # BullMQ UI

# Tools
npm run lint           # ESLint
npm run format        # Prettier
npm run typecheck     # TypeScript check
```

---

## 🚢 Deployment Checklist

### Before First Deploy
- [ ] Set production environment variables
- [ ] Run database migrations
- [ ] Configure Unipile webhook URLs
- [ ] Set up Upstash Redis
- [ ] Configure Mem0 production key
- [ ] Test webhook endpoints
- [ ] Verify RLS policies

### Deployment Commands
```bash
# Build and deploy
npm run build
npm run deploy:production

# Or using GitHub Actions
git push origin main
```

---

## 💬 Getting Help

### Resources
- Project Discord: [Join here]
- GitHub Issues: [Report bugs]
- Documentation: `/docs`
- Archon UI: Check task status

### Key Files to Review First
1. `spec.md` - Understand the system
2. `data-model.md` - Database schema
3. `app/api/campaigns/route.ts` - API example
4. `lib/unipile/client.ts` - LinkedIn integration

---

**Ready to code?** Start with Task 1 above and work your way through!

---

**Document Version:** 1.0.0
**Last Updated:** November 3, 2025
**Estimated Setup Time:** 30 minutes