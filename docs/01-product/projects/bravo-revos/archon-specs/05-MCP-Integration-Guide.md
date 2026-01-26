# MCP Integration Guide

## Overview

RevOS uses 6 critical MCP servers for the MVP. This guide provides complete setup instructions for each, including:
- Installation
- Authentication
- Configuration
- Testing
- AgentKit integration

## Quick Reference

| MCP | Purpose | Cost | Setup Time |
|-----|---------|------|------------|
| **Apollo.io** | Lead enrichment | $100/mo (500 credits) | 15 min |
| **Mem0** | Cartridge storage | $20/mo | 10 min |
| **Supabase** | Database + storage | $25/mo | 30 min |
| **Canva** | Graphics generation | Free tier | 20 min |
| **Context7** | Content research | Free tier | 10 min |
| **Clarity** | Session analytics | Free | 15 min |

---

## 1. Apollo.io MCP

### Purpose

Enrich LinkedIn profiles with:
- Email addresses
- Company data
- Job titles
- Company size

### Installation

```bash
# Install Apollo.io MCP server
npx -y @lkm1developer/apollo-io-mcp-server
```

### Get API Key

1. Go to [Apollo.io](https://www.apollo.io/)
2. Sign up or log in
3. Navigate to Settings → API
4. Generate API key
5. Copy key (starts with `apollo_`)

### Configuration

**Add to Claude Code MCP config (`~/.claude/mcp_config.json`):**

```json
{
  "mcpServers": {
    "apollo": {
      "command": "npx",
      "args": ["-y", "@lkm1developer/apollo-io-mcp-server"],
      "env": {
        "APOLLO_API_KEY": "your_apollo_api_key_here"
      },
      "description": "Apollo.io MCP - Lead enrichment"
    }
  }
}
```

### Testing

```typescript
// Test Apollo MCP in Claude Code
import { apollo } from './mcp-clients';

const result = await apollo.enrichPerson({
  linkedin_url: "https://www.linkedin.com/in/example"
});

console.log(result);
// Expected:
// {
//   email: "person@company.com",
//   organization: { name: "Company Inc", employees: 500 },
//   title: "VP of Engineering"
// }
```

### AgentKit Integration

**Tool Definition:**

```json
{
  "name": "enrich_lead",
  "description": "Enrich LinkedIn profile with email and company data using Apollo.io",
  "parameters": {
    "type": "object",
    "properties": {
      "linkedin_url": {
        "type": "string",
        "description": "LinkedIn profile URL"
      }
    },
    "required": ["linkedin_url"]
  },
  "endpoint": "https://[your-backend]/functions/v1/apollo-enrich"
}
```

**Supabase Edge Function:**

```typescript
// supabase/functions/apollo-enrich/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { linkedin_url } = await req.json();
  
  // Call Apollo API
  const response = await fetch('https://api.apollo.io/v1/people/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': Deno.env.get('APOLLO_API_KEY')
    },
    body: JSON.stringify({
      linkedin_url
    })
  });
  
  const data = await response.json();
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Rate Limits

- **Free tier**: 50 credits/month
- **Starter ($49/mo)**: 500 credits/month
- **Professional ($99/mo)**: 2,000 credits/month

**MVP recommendation**: Starter plan (500 credits = 500 enrichments/month)

---

## 2. Mem0 MCP

### Purpose

Persistent memory for:
- Cartridge storage
- Conversation history
- Learning from feedback

### Installation

```bash
# Mem0 is a cloud service - no local installation needed
```

### Get API Key

1. Go to [Mem0 Dashboard](https://mem0.ai/dashboard)
2. Sign up or log in
3. Create new API key
4. Copy key

### Configuration

**Add to Claude Code MCP config:**

```json
{
  "mcpServers": {
    "mem0": {
      "command": "npx",
      "args": ["-y", "@mem0/mcp-server"],
      "env": {
        "MEM0_API_KEY": "your_mem0_api_key_here"
      },
      "description": "Mem0 MCP - Persistent memory"
    }
  }
}
```

**OR integrate directly in code:**

```typescript
import { Memory } from 'mem0ai';

const mem0 = new Memory({ apiKey: process.env.MEM0_API_KEY });

// Add memory
await mem0.add({
  messages: [
    { role: "system", content: cartridge.system_prompt },
    { role: "user", content: "This is how I want to sound" }
  ],
  user_id: userId,
  metadata: {
    cartridge_id: cartridgeId,
    type: "cartridge"
  }
});

// Retrieve memory
const memories = await mem0.search({
  query: "client voice and style",
  user_id: userId,
  filters: { type: "cartridge" }
});
```

### Testing

```typescript
// Test Mem0 storage and retrieval
const testUserId = 'test-user-123';

// Add test memory
await mem0.add({
  messages: [{ role: "user", content: "I like casual, friendly tone with emojis" }],
  user_id: testUserId,
  metadata: { type: "test" }
});

// Retrieve
const results = await mem0.search({
  query: "tone preference",
  user_id: testUserId
});

console.log(results.results[0].memory); // "casual, friendly tone with emojis"
```

### Integration with Supabase PGVector

**Hybrid approach:**

```typescript
// 1. Store in Mem0 (primary)
await mem0.add({ ...cartridgeData });

// 2. Backup in Supabase
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: JSON.stringify(cartridgeData)
});

await supabase.from('cartridge_embeddings').insert({
  cartridge_id,
  embedding: embedding.data[0].embedding,
  content: JSON.stringify(cartridgeData)
});
```

### Rate Limits

- **Free tier**: 100 memories, 1K searches/month
- **Pro ($20/mo)**: 10K memories, 100K searches/month

**MVP recommendation**: Pro plan

---

## 3. Supabase MCP

### Purpose

All-in-one backend:
- PostgreSQL database
- PGVector (embeddings)
- Authentication (JWT)
- Storage (files)
- Real-time subscriptions

### Installation

```bash
# Install Supabase MCP server
npx -y @supabase/mcp-server-supabase
```

### Get Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create new project
3. Navigate to Settings → API
4. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **service_role key**: (NOT anon key)

### Configuration

**Add to Claude Code MCP config:**

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_URL": "https://xxxxx.supabase.co",
        "SUPABASE_SERVICE_KEY": "your_service_role_key_here"
      },
      "description": "Supabase MCP - Database, auth, storage"
    }
  }
}
```

### Enable PGVector Extension

```sql
-- In Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;

-- Test
CREATE TABLE test_embeddings (
  id BIGSERIAL PRIMARY KEY,
  embedding VECTOR(1536)
);
```

### Testing

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Test insert
const { data, error } = await supabase
  .from('leads')
  .insert({
    name: 'Test Lead',
    email: 'test@example.com'
  })
  .select();

console.log(data); // Should return inserted row
```

### AgentKit Integration

**Tool Definition:**

```json
{
  "name": "query_database",
  "description": "Query Supabase database for leads, campaigns, or analytics",
  "parameters": {
    "type": "object",
    "properties": {
      "table": { "type": "string", "enum": ["leads", "campaigns", "messages"] },
      "filters": { "type": "object" },
      "limit": { "type": "number", "default": 10 }
    },
    "required": ["table"]
  }
}
```

### Cost

- **Free tier**: 2 projects, 500 MB database, 1 GB storage
- **Pro ($25/mo)**: Unlimited projects, 8 GB database, 100 GB storage

**MVP recommendation**: Pro plan

---

## 4. Canva MCP

### Purpose

Generate professional graphics:
- LinkedIn post images
- Lead magnet covers
- Infographics

### Installation

```bash
# Install Canva MCP server (community)
npx -y canva-mcp-server
```

### Get API Key

1. Go to [Canva Developers](https://www.canva.com/developers/)
2. Create app
3. Generate API key
4. Copy key

### Configuration

**Add to Claude Code MCP config:**

```json
{
  "mcpServers": {
    "canva": {
      "command": "npx",
      "args": ["-y", "canva-mcp-server"],
      "env": {
        "CANVA_API_KEY": "your_canva_api_key_here"
      },
      "description": "Canva MCP - Graphics generation"
    }
  }
}
```

### Testing

```typescript
import { canva } from './mcp-clients';

const design = await canva.createDesign({
  template: 'linkedin-post',
  elements: {
    title: "5 Ways to Build High-Trust Teams",
    subtitle: "Executive Leadership Guide",
    background_color: "#8B5CF6",
    text_color: "#FFFFFF"
  },
  format: 'png',
  dimensions: { width: 1200, height: 628 }
});

console.log(design.download_url);
```

### AgentKit Integration

**Workflow:**

```
Generate Text (post content)
    ↓
Generate Image (Canva MCP):
  Input: Post title + key points
  Output: PNG URL
    ↓
Ask User: "Approve post + image?"
```

### Cost

- **Free tier**: 250 designs/month
- **Pro ($12.99/mo)**: Unlimited designs, premium templates

**MVP recommendation**: Free tier (sufficient for MVP)

---

## 5. Context7 MCP

### Purpose

Content research:
- Industry trends
- Best practices
- Documentation search
- Competitive analysis

### Installation

```bash
# Install Context7 MCP server
npx -y context7-mcp-server
```

### Get API Key

1. Go to [Context7 Dashboard](https://context7.com/dashboard)
2. Sign up
3. Create API key
4. Copy key

### Configuration

**Add to Claude Code MCP config:**

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "context7-mcp-server"],
      "env": {
        "CONTEXT7_API_KEY": "your_context7_api_key_here"
      },
      "description": "Context7 MCP - Content research"
    }
  }
}
```

### Testing

```typescript
import { context7 } from './mcp-clients';

const research = await context7.search({
  query: "executive coaching leadership trends 2025",
  sources: ['industry_reports', 'best_practices'],
  max_results: 10
});

console.log(research.results);
// Returns: Array of {title, summary, url, relevance_score}
```

### AgentKit Integration

**Use in Content Generation:**

```
1. Search Web (AgentKit built-in): Get latest trends
2. Call Function (Context7): Deep research
3. Generate Text: Combine trends + research + cartridge
```

### Cost

- **Free tier**: 100 searches/month
- **Pro ($29/mo)**: 1,000 searches/month

**MVP recommendation**: Free tier initially, upgrade if needed

---

## 6. Microsoft Clarity MCP

### Purpose

Session analytics:
- Heatmaps
- Session recordings
- User behavior tracking
- UX optimization

### Installation

```bash
# Install Clarity MCP server
npx -y @microsoft/clarity-mcp-server
```

### Get Credentials

1. Go to [Clarity Dashboard](https://clarity.microsoft.com/)
2. Create project
3. Get Project ID from URL: `clarity.microsoft.com/projects/view/{PROJECT_ID}`
4. Navigate to Settings → API
5. Generate API key

### Configuration

**Add to Claude Code MCP config:**

```json
{
  "mcpServers": {
    "clarity": {
      "command": "npx",
      "args": ["-y", "@microsoft/clarity-mcp-server"],
      "env": {
        "CLARITY_API_KEY": "your_clarity_api_key_here",
        "CLARITY_PROJECT_ID": "your_project_id_here"
      },
      "description": "Clarity MCP - Session analytics"
    }
  }
}
```

**Add tracking script to frontend:**

```html
<!-- In index.html -->
<script type="text/javascript">
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "YOUR_PROJECT_ID");
</script>
```

### Testing

```typescript
import { clarity } from './mcp-clients';

// Get recent sessions
const sessions = await clarity.getSessions({
  project_id: process.env.CLARITY_PROJECT_ID!,
  filters: {
    date_range: 'last_7_days',
    min_duration: 30 // seconds
  },
  limit: 50
});

console.log(sessions);
// Returns: Array of {session_id, duration, pages_viewed, recording_url}
```

### AgentKit Integration

**Use for UX insights:**

```typescript
// Query via AgentKit
"Show me sessions where users struggled with campaign creation"

// Agent calls Clarity MCP
const sessions = await clarity.getSessions({
  filters: {
    url_contains: '/campaign/create',
    min_duration: 120, // Spent >2 min (indicates struggle)
    date_range: 'last_7_days'
  }
});

// Returns session recordings for analysis
```

### Cost

- **Free tier**: Unlimited sessions, forever free

**MVP recommendation**: Free tier (no upgrade needed!)

---

## Complete MCP Config File

**`~/.claude/mcp_config.json`:**

```json
{
  "mcpServers": {
    "apollo": {
      "command": "npx",
      "args": ["-y", "@lkm1developer/apollo-io-mcp-server"],
      "env": {
        "APOLLO_API_KEY": "apollo_xxxxx"
      },
      "description": "Apollo.io MCP - Lead enrichment"
    },
    "mem0": {
      "command": "npx",
      "args": ["-y", "@mem0/mcp-server"],
      "env": {
        "MEM0_API_KEY": "mem0_xxxxx"
      },
      "description": "Mem0 MCP - Persistent memory"
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_URL": "https://xxxxx.supabase.co",
        "SUPABASE_SERVICE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      },
      "description": "Supabase MCP - Database, auth, storage"
    },
    "canva": {
      "command": "npx",
      "args": ["-y", "canva-mcp-server"],
      "env": {
        "CANVA_API_KEY": "canva_xxxxx"
      },
      "description": "Canva MCP - Graphics generation"
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "context7-mcp-server"],
      "env": {
        "CONTEXT7_API_KEY": "context7_xxxxx"
      },
      "description": "Context7 MCP - Content research"
    },
    "clarity": {
      "command": "npx",
      "args": ["-y", "@microsoft/clarity-mcp-server"],
      "env": {
        "CLARITY_API_KEY": "clarity_xxxxx",
        "CLARITY_PROJECT_ID": "xxxxx"
      },
      "description": "Clarity MCP - Session analytics"
    }
  },
  "autoStart": true,
  "enabled": true
}
```

---

## Testing All MCPs

### Integration Test Script

```typescript
// test-mcps.ts
import { apollo, mem0, supabase, canva, context7, clarity } from './mcp-clients';

async function testAllMCPs() {
  console.log('Testing all MCPs...\n');
  
  // 1. Apollo
  try {
    const enrichment = await apollo.enrichPerson({
      linkedin_url: 'https://www.linkedin.com/in/satyanadella'
    });
    console.log('✅ Apollo: ', enrichment.email ? 'PASS' : 'PARTIAL');
  } catch (e) {
    console.log('❌ Apollo FAILED:', e.message);
  }
  
  // 2. Mem0
  try {
    await mem0.add({
      messages: [{ role: 'user', content: 'test memory' }],
      user_id: 'test-user'
    });
    const results = await mem0.search({ query: 'test', user_id: 'test-user' });
    console.log('✅ Mem0:', results.results.length > 0 ? 'PASS' : 'FAIL');
  } catch (e) {
    console.log('❌ Mem0 FAILED:', e.message);
  }
  
  // 3. Supabase
  try {
    const { data } = await supabase.from('leads').select('count').limit(1);
    console.log('✅ Supabase: PASS');
  } catch (e) {
    console.log('❌ Supabase FAILED:', e.message);
  }
  
  // 4. Canva
  try {
    const design = await canva.createDesign({ template: 'social-media' });
    console.log('✅ Canva:', design.download_url ? 'PASS' : 'FAIL');
  } catch (e) {
    console.log('❌ Canva FAILED:', e.message);
  }
  
  // 5. Context7
  try {
    const research = await context7.search({ query: 'test', max_results: 1 });
    console.log('✅ Context7:', research.results.length > 0 ? 'PASS' : 'FAIL');
  } catch (e) {
    console.log('❌ Context7 FAILED:', e.message);
  }
  
  // 6. Clarity
  try {
    const sessions = await clarity.getSessions({ limit: 1 });
    console.log('✅ Clarity:', Array.isArray(sessions) ? 'PASS' : 'FAIL');
  } catch (e) {
    console.log('❌ Clarity FAILED:', e.message);
  }
}

testAllMCPs();
```

**Run:**

```bash
tsx test-mcps.ts
```

**Expected output:**

```
Testing all MCPs...

✅ Apollo: PASS
✅ Mem0: PASS
✅ Supabase: PASS
✅ Canva: PASS
✅ Context7: PASS
✅ Clarity: PASS
```

---

## Troubleshooting

### MCP Not Loading

**Symptom**: MCP tools not available in Claude Code

**Fix**:
1. Restart Claude Code completely
2. Check `~/.claude/mcp_config.json` syntax (valid JSON)
3. Verify API keys are correct
4. Run `claude mcp list` to see status

### Authentication Errors

**Symptom**: "Invalid API key" or 401 errors

**Fix**:
1. Regenerate API key in provider dashboard
2. Update `mcp_config.json`
3. Restart Claude Code
4. Test with curl:

```bash
# Test Apollo
curl -X POST https://api.apollo.io/v1/people/match \
  -H "X-Api-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"linkedin_url": "https://linkedin.com/in/test"}'
```

### Rate Limit Errors

**Symptom**: "Rate limit exceeded" or 429 errors

**Fix**:
1. Check usage in provider dashboard
2. Upgrade plan if needed
3. Implement caching:

```typescript
// Cache Apollo results for 7 days
const cached = await supabase
  .from('apollo_cache')
  .select('*')
  .eq('linkedin_url', url)
  .gte('cached_at', sevenDaysAgo)
  .single();

if (cached) return cached.data;

// Otherwise, call Apollo
const fresh = await apollo.enrichPerson({ linkedin_url: url });

// Cache result
await supabase.from('apollo_cache').insert({
  linkedin_url: url,
  data: fresh,
  cached_at: new Date()
});
```

---

## Cost Summary

| MCP | Plan | Monthly Cost |
|-----|------|-------------|
| Apollo.io | Starter | $49 |
| Mem0 | Pro | $20 |
| Supabase | Pro | $25 |
| Canva | Free | $0 |
| Context7 | Free | $0 |
| Clarity | Free | $0 |
| **Total** | | **$94/month** |

**Note**: Apollo is most expensive. Consider caching enrichment results to reduce API calls.

---

## Next Steps

1. ✅ Install all 6 MCPs using config above
2. ✅ Run integration test script
3. ✅ Configure AgentKit tools (see Implementation Roadmap)
4. ✅ Test end-to-end workflow:
   - Scrape comments
   - Enrich with Apollo
   - Generate DM via Mem0 cartridge
   - Create graphic via Canva
   - Track session via Clarity

See companion documents:
1. **Implementation Roadmap** - Week-by-week build plan
2. **Technical Architecture v3** - How MCPs fit into system