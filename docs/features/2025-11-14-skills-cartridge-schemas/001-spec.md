# Skills Cartridge Tool Schemas - Specification

**Feature:** Fix Skills cartridge with proper OpenAI function schemas for AgentKit
**Branch:** `feat/2025-11-14-skills-cartridge-schemas`
**Timeline:** 4 hours
**Priority:** CRITICAL - This enables the entire LinkedIn lead magnet workflow

## Problem

Current Skills cartridge is broken:
```json
{
  "chips": [
    {"name": "create_campaign", "description": "Create campaign"}
  ]
}
```

AgentKit needs full OpenAI function schemas with parameters to properly chain tools.

## Solution

Update Skills cartridge with 10 properly defined tool schemas that enable the complete LinkedIn lead magnet campaign flow:

1. **manage_campaigns** - CRUD operations for campaigns
2. **publish_to_linkedin** - Post content immediately or scheduled
3. **coordinate_pod** - Alert pod members for amplification
4. **start_comment_monitor** - Background job watching for trigger words
5. **send_linkedin_dm** - Send direct messages
6. **extract_email_from_dm** - Parse email from DM replies
7. **trigger_webhook** - Send leads to user's ESP
8. **create_lead_magnet** - Generate PDF/template offers
9. **create_lead** - Save lead to database
10. **track_analytics** - Monitor campaign performance

## Why This Approach

**Instead of building a custom workflow engine (3 days):**
- Use AgentKit's native tool chaining (4 hours)
- AgentKit IS the workflow engine
- Tools define capabilities, conversation drives sequencing
- Simpler, faster, more maintainable

## Success Criteria

✅ User says "Launch my LinkedIn campaign"
✅ AgentKit chains tools automatically:
   - Creates campaign
   - Posts to LinkedIn
   - Alerts pod
   - Monitors comments
   - DMs responders
   - Extracts emails
   - Webhooks to ESP
   - Saves leads

✅ No custom workflow executor needed
✅ All 10 tools properly defined with parameters
✅ TypeScript types match schemas
✅ End-to-end test passes

## Implementation

1. **Migration:** Update `skills_cartridge` in `console_prompts` table
2. **Validation:** Each tool has proper JSON Schema
3. **Chips:** Verify chip implementations match schemas
4. **Testing:** Full LinkedIn campaign flow

## Risk Mitigation

- **Risk:** Tools might not chain correctly
- **Mitigation:** Clear tool descriptions guide AgentKit's decisions

- **Risk:** Parameter mismatches between schema and chip implementation
- **Mitigation:** TypeScript validation ensures alignment

## Non-Negotiables

- AgentKit SDK only (`@openai/agents`)
- Mem0 integration active
- Console loaded from database
- V2 route (`/api/hgc-v2`)
- Health monitors show truth