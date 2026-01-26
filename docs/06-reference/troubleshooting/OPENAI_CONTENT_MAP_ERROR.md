# Troubleshooting: "e.content.map is not a function" Error

## Error Signature

```
OpenAI API response format error (possibly model incompatibility).
Model: gpt-4o.
Original error: e.content.map is not a function
```

## Symptoms

- User types "write" → Topics appear successfully ✅
- User clicks any topic hook → ERROR appears ❌
- Error happens during post generation, NOT topic generation
- Topics ARE real AI output (not mock/fallback data)

## Root Cause

**Missing `client` parameter in AgentKit Agent constructor**

When `client: this.openai` is not passed to the AgentClass constructor, AgentKit creates its own internal OpenAI client with default/incorrect configuration. This causes response format issues that trigger `.map()` to fail.

## Git History

| Commit | Date | Action | Result |
|--------|------|--------|---------|
| 9cc8f96 | Nov 23, 2025 | **ADDED** `client: this.openai` | ✅ FIXED |
| f8df620 | Nov 24, 2025 | **REMOVED** during refactor | ❌ BROKE |

## How To Diagnose

### 1. Check The Code

```bash
git blame lib/console/marketing-console.ts | grep -A 5 "new AgentClass"
```

Look for line 95. Should have:
```typescript
client: this.openai, // CRITICAL: DO NOT REMOVE
```

### 2. Check Error Logs

Look for:
```
[MarketingConsole] ⚠️ AgentKit version changed
```

Or:
```
OpenAI API response format error
```

### 3. Test Flow

1. Type "write" in chat
2. If topics appear → Step 1 works
3. Click any topic
4. If error appears → Missing client parameter

## How To Fix

### The Fix (1 Line)

**File:** `lib/console/marketing-console.ts` (Line ~95)

**Add:**
```typescript
client: this.openai, // CRITICAL: DO NOT REMOVE - Regression in f8df620 broke this
```

**Full Context:**
```typescript
this.agent = new AgentClass({
  name: 'MarketingConsole',
  model: this.model,
  instructions: this.config.baseInstructions,
  modelSettings: { temperature: this.config.temperature || 0.7 },
  tools: [],
  client: this.openai, // ← ADD THIS LINE
});
```

### Verify The Fix

```bash
# 1. Build locally
npm run build

# 2. Test locally
npm run dev
# Visit http://localhost:3000
# Type "write" → Click topic → Should generate post ✅

# 3. Commit & deploy
git add lib/console/marketing-console.ts
git commit -m "fix: re-add OpenAI client parameter (regression from f8df620)"
git push origin staging

# 4. Test on staging
# Visit https://bravo-revos-git-staging-growthpigs.vercel.app
```

## Why This Works

**Without `client: this.openai`:**
- AgentKit creates internal OpenAI client
- Internal client may use wrong API key/baseURL
- Response format differs from expected
- Code tries `.map()` on non-array → ERROR

**With `client: this.openai`:**
- AgentKit uses OUR configured client
- Correct API key from environment
- Proper response parsing
- Returns arrays that `.map()` can process

## Prevention

### 1. Code Comment

The fix includes a warning comment:
```typescript
client: this.openai, // CRITICAL: DO NOT REMOVE - Regression in f8df620 broke this
```

### 2. Regression Test (Optional)

Create `__tests__/marketing-console.test.ts`:

```typescript
describe('MarketingConsole', () => {
  it('should pass OpenAI client to AgentKit', async () => {
    const mockOpenAI = { /* mock client */ };
    const console = new MarketingConsole({
      openai: mockOpenAI,
      // ...other config
    });

    // Verify agent receives client parameter
    // (Implementation depends on test setup)
  });
});
```

### 3. Git Hook (Future)

Add pre-commit hook to check for this line:

```bash
#!/bin/bash
if ! grep -q "client: this.openai" lib/console/marketing-console.ts; then
  echo "ERROR: Missing 'client: this.openai' in marketing-console.ts"
  exit 1
fi
```

## Related Documentation

- [OpenAI AgentKit Config Guide](https://openai.github.io/openai-agents-js/guides/config/)
- [OpenAI Agents Documentation](https://platform.openai.com/docs/guides/agents)
- Commit 9cc8f96: Original fix with detailed explanation
- Commit f8df620: Where regression occurred

## FAQ

**Q: Why do topics work but post generation fails?**

A: Topic generation (step 1) uses a simpler AI call with JSON array response. Post generation (step 2) uses a complex response structure that exposes the misconfigured client issue.

**Q: Are the hooks real AI or mock data?**

A: Real AI. The code calls `marketingConsole.execute()` with the user's 112-point core messaging blueprint. Fallback topics only appear if AI completely fails (with console warning).

**Q: Why isn't `client` in official AgentKit docs?**

A: Official docs show `setDefaultOpenAIClient()` for global config. However, passing `client` per-agent also works (proven by commit 9cc8f96). This gives finer control.

**Q: How often does this break?**

A: This is the second time:
1. First time: Fixed in 9cc8f96 (Nov 23)
2. Second time: Broke in f8df620 (Nov 24) - regression during refactor

With proper documentation and warnings, this should be the last time.

---

**Last Updated:** 2025-11-24
**Author:** Claude Code
**Status:** Active - Use this runbook for diagnosis and fixes
