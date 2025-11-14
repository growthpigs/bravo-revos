# Skills Cartridge Tool Schemas - Implementation Plan

**Timeline:** 4 hours total
**Approach:** Fix Skills cartridge with proper tool schemas, let AgentKit handle workflow

## Phase 1: Database Update (30 minutes)

### Task 1.1: Apply Migration
- File: `supabase/migrations/039_fix_skills_cartridge_tool_schemas.sql`
- Action: Run migration via Supabase dashboard
- Verify: 10 tools properly defined with parameters

### Task 1.2: Verify in Database
```sql
SELECT
  jsonb_array_length(skills_cartridge->'tools') as tool_count,
  skills_cartridge->'tools'->0->>'name' as first_tool
FROM console_prompts
WHERE name = 'marketing-console-v1';
```
Expected: 10 tools with full schemas

## Phase 2: Chip Implementation Verification (2 hours)

### Task 2.1: Verify Existing Chips Match Schemas
Check these chips already exist and match our schemas:
- ✅ `lib/chips/campaign-chip.ts` → manage_campaigns
- ❓ `lib/chips/linkedin-chip.ts` → publish_to_linkedin
- ❓ `lib/chips/pod-chip.ts` → coordinate_pod
- ❓ `lib/chips/dm-chip.ts` → send_linkedin_dm, extract_email_from_dm

### Task 2.2: Create Missing Chips
Create any missing chip implementations:
```typescript
// Example structure for each chip
export class LinkedInChip extends BaseChip {
  getTool() {
    return tool({
      name: 'publish_to_linkedin',
      parameters: // Match schema from migration
      execute: async (input, context) => {
        // Implementation using UniPile API
      }
    });
  }
}
```

### Task 2.3: Register Chips in Cartridge
Update `lib/cartridges/linkedin-cartridge.ts`:
```typescript
this.chips = [
  new CampaignChip(),
  new LinkedInChip(),
  new PodChip(),
  new DMChip(),
  new WebhookChip(),
  new LeadMagnetChip(),
  new LeadChip(),
  new AnalyticsChip()
];
```

## Phase 3: Console Loader Integration (1 hour)

### Task 3.1: Update Console Loader
Modify `lib/console/console-loader.ts`:
```typescript
// Load tools from skills_cartridge
const tools = config.skills_cartridge?.tools || [];

// Pass to MarketingConsole
const console = new MarketingConsole({
  baseInstructions: assembleSystemPrompt(config),
  tools, // Pass tool schemas
  openai,
  supabase
});
```

### Task 3.2: Update MarketingConsole
Ensure `lib/console/marketing-console.ts` uses tools:
```typescript
constructor(options) {
  // Build Agent with tools from skills cartridge
  this.agent = new Agent({
    tools: this.buildToolsFromSchemas(options.tools),
    instructions: options.baseInstructions
  });
}
```

## Phase 4: Testing (30 minutes)

### Task 4.1: Test Tool Discovery
```bash
# Check AgentKit sees all tools
curl -X POST http://localhost:3000/api/hgc-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What tools do you have available?",
    "agencyId": "test",
    "clientId": "test"
  }'
```

### Task 4.2: Test LinkedIn Campaign Flow
```bash
# Test the full flow
curl -X POST http://localhost:3000/api/hgc-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a LinkedIn campaign about AI tools",
    "agencyId": "test",
    "clientId": "test"
  }'
```

Expected: AgentKit chains tools:
1. manage_campaigns (create)
2. create_lead_magnet
3. publish_to_linkedin
4. coordinate_pod
5. start_comment_monitor

### Task 4.3: Verify Background Jobs
Check that comment monitoring creates background job:
```sql
SELECT * FROM background_jobs
WHERE type = 'comment_monitor'
ORDER BY created_at DESC;
```

## Rollback Plan

If tools don't chain correctly:
1. Check tool descriptions are clear enough for AgentKit
2. Verify chip implementations match schemas exactly
3. Check console loader passes tools correctly
4. Worst case: Revert migration, debug individually

## Success Metrics

- ✅ All 10 tools visible to AgentKit
- ✅ User can say "launch campaign" and it works
- ✅ Tools chain naturally based on conversation
- ✅ No custom workflow engine needed
- ✅ TypeScript compiles without errors
- ✅ Health check shows AgentKit active

## Non-Negotiables Checklist

- [ ] AgentKit SDK only (no raw OpenAI)
- [ ] Mem0 integrated and active
- [ ] Console loaded from database
- [ ] V2 route (`/api/hgc-v2`)
- [ ] Health monitors accurate