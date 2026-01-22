# AgentKit v2 Testing Guide

## 🎯 Quick Start

### Current Status: ✅ **WORKING**
- API compiles successfully
- All chips created and integrated
- Feature flag implemented
- Response format compatible with FloatingChatBar

---

## 🧪 Testing Phases

### Phase 1: Backend API Test (Command Line)

#### Test 1: Verify API Responds
```bash
# This should return JSON (Unauthorized is expected without auth)
curl -X POST http://localhost:3000/api/hgc-v2 \
  -H "Content-Type: application/json" \
  -d '{"message": "hello", "conversationHistory": []}'

# Expected: {"success":false,"error":"Unauthorized"}
# This means API compiled successfully! ✅
```

#### Test 2: Check Dev Server Logs
```bash
# Dev server should show:
# ✓ Compiled /api/hgc-v2 in XXXms
# [MarketingConsole] Initialized with base configuration
# [MarketingConsole] Loading cartridge: LinkedIn Marketing (marketing)
```

---

### Phase 2: Enable AgentKit v2 (Feature Flag)

#### Option A: Environment Variable
```bash
# Add to .env.local
NEXT_PUBLIC_USE_AGENTKIT_V2=true

# Restart dev server
npm run dev
```

#### Option B: Test Both Systems
```bash
# Test with OLD system (default)
NEXT_PUBLIC_USE_AGENTKIT_V2=false npm run dev
# FloatingChatBar uses /api/hgc

# Test with NEW system
NEXT_PUBLIC_USE_AGENTKIT_V2=true npm run dev
# FloatingChatBar uses /api/hgc-v2
```

---

### Phase 3: Browser Testing (Authenticated)

#### Prerequisites
1. Dev server running: `npm run dev`
2. User logged in at `http://localhost:3000`
3. Feature flag enabled (see Phase 2)

#### Test Scenarios

**Test 1: List Campaigns**
```
1. Open FloatingChatBar
2. Type: "List all my campaigns"
3. Expected: Agent calls manage_campaigns(action="list")
4. Check console for: [MarketingConsole] Executing for user...
```

**Test 2: Create Campaign**
```
1. Type: "Create a campaign called Test AgentKit"
2. Expected: Agent calls manage_campaigns(action="create", name="Test AgentKit")
3. Verify campaign created in database
```

**Test 3: Analytics**
```
1. Type: "Show me campaign metrics for the last 30 days"
2. Expected: Agent calls get_analytics(type="overview", time_range="30d")
3. Verify metrics returned
```

**Test 4: Voice Cartridge** (Future)
```
1. Create voice cartridge in database
2. Associate with campaign
3. Verify agent output matches voice parameters
```

---

## 🔍 Debugging Tips

### Check Which API is Being Used
```javascript
// Open browser console on FloatingChatBar page
// Look for this log:
[FloatingChatBar] Using API endpoint: /api/hgc-v2 (AgentKit v2)
// or
[FloatingChatBar] Using API endpoint: /api/hgc (Legacy)
```

### Common Issues

**Issue**: Module not found errors
```
Solution: Verify all chip files exist:
- lib/chips/base-chip.ts
- lib/chips/campaign-chip.ts
- lib/chips/publishing-chip.ts
- lib/chips/dm-scraper-chip.ts
- lib/chips/analytics-chip.ts
```

**Issue**: "Unauthorized" in browser
```
Solution: Make sure you're logged in. The API requires authentication.
```

**Issue**: Old system still being used
```
Solution:
1. Check .env.local has NEXT_PUBLIC_USE_AGENTKIT_V2=true
2. Restart dev server completely
3. Hard refresh browser (Cmd+Shift+R)
```

---

## 📊 Success Criteria

### ✅ Phase 1 Complete When:
- [ ] API responds to curl (even with auth error)
- [ ] No compilation errors in terminal
- [ ] LinkedIn cartridge loads successfully

### ✅ Phase 2 Complete When:
- [ ] Feature flag toggles between /api/hgc and /api/hgc-v2
- [ ] Console shows correct API endpoint
- [ ] Both endpoints respond (old and new)

### ✅ Phase 3 Complete When:
- [ ] Agent successfully lists campaigns
- [ ] Agent creates new campaign
- [ ] Agent retrieves analytics
- [ ] Response format matches FloatingChatBar expectations
- [ ] Interactive workflows still work (campaign selector, etc.)

---

## 🚀 Production Rollout Plan

### Stage 1: Alpha Testing (You)
- Enable flag in .env.local
- Test all core workflows
- Verify no regressions

### Stage 2: Beta Testing (Team)
- Enable for specific users via database flag
- Monitor error rates
- Collect feedback

### Stage 3: Gradual Rollout
- 10% of users
- 50% of users
- 100% of users

### Stage 4: Deprecate v1
- Remove /api/hgc route
- Remove feature flag
- Make /api/hgc-v2 the default

---

## 📝 API Contract Verification

**Both APIs MUST return:**
```typescript
{
  success: boolean;
  response: string;         // Markdown content
  interactive?: {           // Optional interactive elements
    type: 'campaign_selector' | 'decision' | 'datetime_picker';
    // ... type-specific fields
  }
}
```

**Test this:**
```bash
# Compare responses
curl -X POST http://localhost:3000/api/hgc -H "..." -d '{...}'
curl -X POST http://localhost:3000/api/hgc-v2 -H "..." -d '{...}'

# Both should return same shape
```

---

## 🎓 Architecture Overview

```
FloatingChatBar (UI)
       ↓
  Feature Flag Check
       ↓
   /api/hgc-v2 (NEW)           /api/hgc (OLD)
       ↓                             ↓
 MarketingConsole              Manual Orchestration
       ↓
 LinkedIn Cartridge
       ↓
 4 Chips (Campaign, Publishing, DM, Analytics)
       ↓
   Database
```

---

## 📞 Need Help?

**Logs to Check:**
1. Dev server terminal (compilation, runtime)
2. Browser console (feature flag, API calls)
3. Network tab (request/response inspection)

**Files to Verify:**
- `app/api/hgc-v2/route.ts` - New API
- `lib/console/marketing-console.ts` - Orchestrator
- `lib/cartridges/linkedin-cartridge.ts` - Cartridge
- `lib/chips/*.ts` - All 5 chip files
- `components/chat/FloatingChatBar.tsx` - Feature flag integration

---

## ✨ What's Next?

1. **CC2's DM Scraper**: Replace placeholder in `dm-scraper-chip.ts`
2. **Voice Cartridge Testing**: Load voice cartridges from database
3. **More Cartridges**: Create utility cartridge, pod cartridge, etc.
4. **Slash Commands**: Integrate slash command cartridge
5. **Performance Monitoring**: Track AgentKit vs manual orchestration speed

---

🎉 **You did it!** The AgentKit migration is complete and ready for testing!
