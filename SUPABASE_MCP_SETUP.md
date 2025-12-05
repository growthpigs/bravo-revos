# Supabase MCP Setup - Complete Documentation

**Date:** 2025-12-05
**Status:** ✅ **FULLY OPERATIONAL**
**Latest Commit:** 74888a0 - cleanup: Remove temporary COMET.md file - Supabase MCP now working

---

## 🎯 What Was Fixed

The Supabase MCP was not connecting due to a **missing `MCP_API_KEY` environment variable**. The `supabase-mcp` package requires three environment variables:

1. `SUPABASE_URL` - Supabase project URL
2. `SUPABASE_ANON_KEY` - Supabase public API key
3. `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
4. **`MCP_API_KEY`** - Secret key for MCP server (was missing)

---

## ✅ Current Configuration

**File:** `.mcp.json`

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "supabase-mcp@latest", "supabase-mcp-claude"],
      "env": {
        "SUPABASE_URL": "https://trdoainmejxanrownbuz.supabase.co",
        "SUPABASE_ANON_KEY": "[real API key from Vercel]",
        "SUPABASE_SERVICE_ROLE_KEY": "[real service role key from Vercel]",
        "MCP_API_KEY": "[generated random secret]"
      }
    }
  },
  "autoStart": true,
  "enabled": true
}
```

---

## 🚀 Verification

The MCP has been tested and is now working:

```bash
$ supabase-mcp supabase-mcp-claude
Supabase MCP server listening at http://localhost:3000
MCP manifest available at http://localhost:3000/.well-known/mcp-manifest
✅ Ready for Claude Code connection
```

---

## 📋 Key Credentials

### Supabase Project
- **Project ID:** `trdoainmejxanrownbuz`
- **URL:** https://trdoainmejxanrownbuz.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/trdoainmejxanrownbuz

### API Keys Source
- **ANON_KEY** - From Vercel environment variables (bravo-revos project)
- **SERVICE_ROLE_KEY** - From Vercel environment variables (bravo-revos project)
- **MCP_API_KEY** - Generated random secret (stored in `.mcp.json`)

---

## 🔄 What Happens Next

With the Supabase MCP now fully operational, you can:

1. **Run the trigger words migration:**
   ```sql
   -- Run via Supabase SQL Editor:
   -- https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new
   -- Copy contents of: supabase/migrations/20251205_trigger_words_jsonb_array.sql
   ```

2. **Test campaign creation** with multiple trigger words

3. **Verify scrape_jobs created** for comment monitoring

4. **Complete E2E testing** on staging environment

---

## 🛠️ Troubleshooting

If the `/mcp` command still shows errors:

1. **Check .mcp.json exists** in project root:
   ```bash
   cat bravo-revos/.mcp.json | jq .
   ```

2. **Verify environment variables** are loaded:
   ```bash
   export SUPABASE_URL="https://trdoainmejxanrownbuz.supabase.co"
   export SUPABASE_ANON_KEY="[from Vercel]"
   export SUPABASE_SERVICE_ROLE_KEY="[from Vercel]"
   export MCP_API_KEY="0b06230ae3469739284c57269a5c360e6966d6d045c57d29a7bf4ad01e3ebce6"
   ```

3. **Test MCP directly:**
   ```bash
   supabase-mcp supabase-mcp-claude
   # Should output: "Supabase MCP server listening at http://localhost:3000"
   ```

---

## 📚 Related Documentation

- **Trigger Words Migration:** `DEPLOYMENT_GUIDE.md`
- **Implementation Summary:** `docs/features/2025-12-05-trigger-words-migration/SUMMARY.md`
- **Migration SQL:** `supabase/migrations/20251205_trigger_words_jsonb_array.sql`

---

**Status:** ✅ Supabase MCP is fully configured and ready for use
**Next Action:** Run the trigger words database migration on staging
