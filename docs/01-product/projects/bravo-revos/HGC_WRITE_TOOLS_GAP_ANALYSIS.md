# HGC Write Tools - Gap Analysis & Implementation Plan

**Date**: 2025-11-10  
**Status**: Gap Identified  
**Priority**: Phase 3 (After MVP ships)

---

## 🎯 EXECUTIVE SUMMARY

HGC Python tools define **write operations** (create campaigns, schedule posts) but the **API endpoints don't exist**. This is by design - MVP focuses on read-only intelligence. Write operations come in Phase 3.

---

## 📊 CURRENT STATE

### What EXISTS (Working)

**Python Tools Defined**:
```python
✅ search_memory()         # Mem0 Cloud API
✅ save_memory()           # Mem0 Cloud API  
✅ get_campaign_metrics()  # /api/hgc/campaigns GET
✅ analyze_pod_engagement()  # /api/hgc/pods GET
✅ get_linkedin_performance()  # /api/hgc/linkedin GET
✅ analyze_campaign_performance()  # /api/hgc/campaigns/analyze GET
```

**Python Tools Defined BUT Missing Endpoints**:
```python
❌ create_campaign()       # /api/hgc/campaigns/create POST - MISSING
❌ schedule_post()         # /api/hgc/posts/queue POST - MISSING
```

### API Endpoints Status

| Endpoint | Method | Status | Purpose |
|----------|--------|--------|---------|
| `/api/hgc` | POST | ✅ Working | Main chat endpoint |
| `/api/hgc/campaigns` | GET | ✅ Working | Read campaigns |
| `/api/hgc/pods` | GET | ✅ Working | Read pod data |
| `/api/hgc/linkedin` | GET | ✅ Working | Read LinkedIn data |
| `/api/hgc/campaigns/create` | POST | ❌ Missing | Create campaign |
| `/api/hgc/posts/queue` | POST | ❌ Missing | Schedule post |
| `/api/hgc/campaigns/analyze` | GET | ❌ Missing | Deep analytics |

---

## 🚧 MISSING WRITE OPERATIONS

### 1. Campaign Creation

**Python Tool** (Already Defined):
```python
@function_tool
def create_campaign(name: str, voice_id: str, description: Optional[str] = None):
    """Create a new LinkedIn campaign (draft status, requires review)"""
    url = f"{self.api_base_url}/api/hgc/campaigns/create"
    payload = {
        "name": name,
        "voice_id": voice_id,
        "description": description,
        "status": "draft"  # Always draft for safety
    }
    response = requests.post(url, json=payload, headers=self.headers)
    return response.json()
```

**API Endpoint Needed**:
```typescript
// app/api/hgc/campaigns/create/route.ts
export async function POST(request: NextRequest) {
  // 1. Validate auth
  // 2. Validate voice_id exists
  // 3. Check user's campaign limit (max 5 active)
  // 4. Create campaign in DB with status='draft'
  // 5. Return campaign ID
}
```

**Safety Controls**:
- Creates in `draft` status (not active)
- User must manually activate in dashboard
- Rate limit: 5 campaigns per client
- Requires valid voice cartridge

**Database Table**: `campaigns`
```sql
INSERT INTO campaigns (
  client_id,
  name,
  description,
  voice_id,
  status,  -- 'draft'
  created_by_ai
) VALUES (...)
```

---

### 2. Post Scheduling

**Python Tool** (Already Defined):
```python
@function_tool
def schedule_post(content: str, schedule_time: str, campaign_id: Optional[str] = None):
    """Queue a LinkedIn post for review and scheduling"""
    url = f"{self.api_base_url}/api/hgc/posts/queue"
    payload = {
        "content": content,
        "schedule_time": schedule_time,
        "campaign_id": campaign_id,
        "status": "queued"  # Always queued for safety
    }
    response = requests.post(url, json=payload, headers=self.headers)
    return response.json()
```

**API Endpoint Needed**:
```typescript
// app/api/hgc/posts/queue/route.ts
export async function POST(request: NextRequest) {
  // 1. Validate auth
  // 2. Apply voice cartridge to content
  // 3. Validate rate limit (10 posts/day)
  // 4. Insert into post_queue table
  // 5. Return queue ID
}
```

**Safety Controls**:
- Goes to `post_queue` table (not direct publish)
- User must approve in dashboard
- Voice cartridge automatically applied
- Rate limit: 10 posts per day per client

**Database Table**: `post_queue`
```sql
INSERT INTO post_queue (
  campaign_id,
  content,
  scheduled_for,
  status,  -- 'pending_review'
  created_by_ai,
  unipile_status  -- 'not_sent'
) VALUES (...)
```

---

### 3. Campaign Analytics (Read-Only)

**Python Tool** (Already Defined):
```python
@function_tool
def analyze_campaign_performance(campaign_id: str):
    """Deep analytics on campaign performance with AI-powered recommendations"""
    url = f"{self.api_base_url}/api/hgc/campaigns/analyze?campaign_id={campaign_id}"
    response = requests.get(url, headers=self.headers)
    return response.json()
```

**API Endpoint Needed**:
```typescript
// app/api/hgc/campaigns/analyze/route.ts
export async function GET(request: NextRequest) {
  // 1. Fetch campaign data
  // 2. Aggregate metrics (posts, leads, engagement)
  // 3. Calculate trends
  // 4. Generate AI recommendations
  // 5. Return analysis object
}
```

**Complexity**: Medium (requires metric aggregation)

---

## 📋 IMPLEMENTATION PRIORITY

### Phase 3A: Campaign Creation (3 hours)
**Priority**: HIGH  
**User Value**: "Create a campaign called X" works  
**Effort**: Medium  

Tasks:
1. Create `app/api/hgc/campaigns/create/route.ts`
2. Add validation (voice_id, campaign limit)
3. Insert into DB with `created_by_ai=true`
4. Test with HGC: "Create a test campaign"

### Phase 3B: Post Scheduling (2 hours)
**Priority**: HIGH  
**User Value**: "Schedule a post about X" works  
**Effort**: Low-Medium  

Tasks:
1. Create `app/api/hgc/posts/queue/route.ts`
2. Add voice cartridge application
3. Insert into `post_queue` table
4. Test with HGC: "Write and schedule a post"

### Phase 3C: Campaign Analytics (4 hours)
**Priority**: MEDIUM  
**User Value**: Better insights  
**Effort**: High (metric aggregation)  

Tasks:
1. Create `app/api/hgc/campaigns/analyze/route.ts`
2. Aggregate metrics from multiple tables
3. Calculate trends and patterns
4. Generate recommendations
5. Test with HGC: "Analyze my campaign performance"

---

## 🎯 IMPLEMENTATION GUIDE

### Endpoint Template

All HGC endpoints follow this pattern:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 1. AUTH CHECK
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. GET CLIENT_ID
    const { data: userData } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .single()

    // 3. PARSE REQUEST
    const { name, voice_id, description } = await request.json()

    // 4. VALIDATE
    // - Check voice_id exists
    // - Check rate limits
    // - Validate required fields

    // 5. DATABASE OPERATION
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        client_id: userData.client_id,
        name,
        voice_id,
        description,
        status: 'draft',
        created_by_ai: true
      })
      .select()
      .single()

    if (error) throw error

    // 6. RETURN SUCCESS
    return NextResponse.json({
      success: true,
      campaign: data,
      message: "Campaign created in DRAFT status"
    })

  } catch (error) {
    console.error('[HGC_API_ERROR]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 🧪 TESTING PLAN

### Test 1: Campaign Creation
```bash
# HGC Chat:
"Create a campaign called Test Campaign using my default voice"

# Expected:
1. Tool call: create_campaign(name="Test Campaign", voice_id="...")
2. API POST: /api/hgc/campaigns/create
3. DB Insert: campaigns table
4. Response: "Campaign created in DRAFT. Review in dashboard."
5. Dashboard: Campaign appears with status='draft'
```

### Test 2: Post Scheduling
```bash
# HGC Chat:
"Schedule a post about AI for tomorrow at 2pm: 'AI is transforming businesses'"

# Expected:
1. Tool call: schedule_post(content="AI is...", schedule_time="2025-11-11T14:00:00Z")
2. API POST: /api/hgc/posts/queue
3. DB Insert: post_queue table
4. Voice cartridge applied to content
5. Response: "Post queued for review."
6. Dashboard: Post appears in review queue
```

### Test 3: Analytics
```bash
# HGC Chat:
"Analyze my best performing campaign"

# Expected:
1. Tool call: get_campaign_metrics() to find best campaign
2. Tool call: analyze_campaign_performance(campaign_id="...")
3. API GET: /api/hgc/campaigns/analyze?campaign_id=...
4. Response: Detailed metrics + AI recommendations
```

---

## 🚨 SAFETY REQUIREMENTS

### For ALL Write Operations

1. **Draft/Queue Status**
   - Never auto-publish
   - Always require human review
   - Clear status indicators

2. **Rate Limiting**
   - Campaigns: 5 active per client
   - Posts: 10 per day per client
   - API calls: 100 per hour

3. **Audit Trail**
   - `created_by_ai` flag on all records
   - Store AI generation prompts
   - Track approval workflow

4. **Validation**
   - Voice cartridge exists
   - Content length limits
   - Schedule time in future

---

## 📊 SUCCESS METRICS

### Phase 3A Complete When:
- [ ] User can say "Create a campaign" → Works
- [ ] Campaign appears in dashboard as DRAFT
- [ ] User can activate campaign manually
- [ ] Rate limits enforced (5 campaigns max)

### Phase 3B Complete When:
- [ ] User can say "Schedule a post" → Works
- [ ] Post appears in review queue
- [ ] Voice cartridge applied automatically
- [ ] User can approve/edit/reject post

### Phase 3C Complete When:
- [ ] User can say "Analyze my campaign" → Works
- [ ] Real metrics returned (not hallucinated)
- [ ] AI recommendations provided
- [ ] Response time < 5 seconds

---

## 🎯 RECOMMENDATION

**For Current MVP (Phase 2)**:
- Ship with read-only tools
- Document write tool gaps (this doc)
- Get user feedback on intelligence first

**For Phase 3** (Post-MVP):
- Implement campaign creation (3h)
- Implement post scheduling (2h)
- Test end-to-end workflow
- Total time: ~1 day

**Rationale**: 
- Read-only intelligence proves value
- Write operations add complexity
- Better to nail intelligence first
- Then add write capabilities

---

## 📁 FILES TO CREATE

When implementing Phase 3:

```
app/api/hgc/
├── campaigns/
│   ├── route.ts (exists - GET)
│   ├── create/
│   │   └── route.ts (NEW - POST)
│   └── analyze/
│       └── route.ts (NEW - GET)
└── posts/
    └── queue/
        └── route.ts (NEW - POST)
```

---

**Status**: Gap documented, implementation plan ready  
**Next Action**: Complete Phase 2 (read-only), then implement Phase 3  
**Estimated Effort**: 1 day (5-6 hours) for full write capability
