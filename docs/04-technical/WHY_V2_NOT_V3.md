# WHY WE USE V2, NOT V3

## USER DIRECTIVE (DO NOT IGNORE)

**The user wants V2. Stop going back to V3.**

## Why V2 Wasn't Working (Root Cause Analysis)

### Problem 1: Missing Config File
- `lib/config/openai-models.ts` was in wrong location (`docs/` folder)
- Import failed silently → `OPENAI_MODELS.LATEST` was undefined
- Result: Invalid model sent to API → response format error

**Status:** ✅ FIXED (commit 9e6d824)

### Problem 2: GPT-5.1 Incompatibility
- AgentKit SDK v0.3.0 released before GPT-5.1 (Nov 2025)
- SDK cannot parse GPT-5.1 response format
- Error: "e.content.map is not a function"

**Status:** ✅ FIXED (commit 4af58ca, 71e6bd0) - Switched to gpt-4o

### Problem 3: No Validation
- MarketingConsole accepted undefined model silently
- No early error detection

**Status:** ✅ FIXED (commit 9e6d824) - Added constructor validation

### Problem 4: Environment Variable
- `.env` had `NEXT_PUBLIC_HGC_VERSION="v3"`
- Frontend kept using V3 instead of V2

**Status:** ✅ FIXED (this commit) - Changed to v2

## Why V2 is the Correct Choice

### V2 (AgentKit + Cartridge Architecture)
- ✅ Proper architecture (MarketingConsole, Cartridges, Chips)
- ✅ AgentKit SDK orchestration
- ✅ Mem0 memory integration
- ✅ Database-driven workflows
- ✅ Scalable and maintainable
- ✅ Session persistence
- ✅ Multi-agent support

### V3 (Temporary Workaround)
- ❌ Raw OpenAI calls (not AgentKit)
- ❌ Hard-coded logic
- ❌ No Mem0 integration
- ❌ Technical debt
- ❌ Created because V2 had bugs, not because V3 is better

## Current Status

**V2 is now ready:**
- All bugs fixed
- Using gpt-4o (compatible with AgentKit v0.3.0)
- Config file in correct location
- Validation added
- Environment variable set to v2

**Next time someone suggests using V3:**
- Read this file
- Remember: User wants V2
- V2 is the proper architecture
- V3 is technical debt

## How to Keep V2 Working

1. **Never change `NEXT_PUBLIC_HGC_VERSION` to v3**
2. **Keep using `OPENAI_MODELS.STABLE` (gpt-4o)**
3. **Don't upgrade to gpt-5.1 until AgentKit SDK supports it**
4. **Monitor for AgentKit SDK updates**

## Future: When Can We Use GPT-5.1?

Watch for:
- New @openai/agents release (> v0.3.0)
- Release notes mentioning GPT-5 or GPT-5.1 support
- Test with gpt-5.1 after SDK upgrade
- If it works, update `OPENAI_MODELS.LATEST` back to gpt-5.1

---

**Created:** 2025-11-23
**Purpose:** Stop going back to V3. User wants V2.
**Status:** V2 is ready and working.
