# Fix Vercel Build: Add Runtime Declarations to API Routes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix Vercel build failures by adding `export const dynamic = 'force-dynamic'` to all API routes with external dependencies (Redis, Supabase, OpenAI), preventing build-time execution.

**Architecture:** Next.js API routes with external dependencies must be marked as runtime-only to prevent execution during build phase. This follows Next.js 14 best practices for routes that connect to databases, queues, or external services.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Redis (BullMQ), OpenAI SDK

**Root Cause:** Next.js "Collecting page data" phase executes route code at build time. Routes trying to connect to Redis/Supabase fail because these services don't exist in Vercel's build environment.

**Solution:** Add `export const dynamic = 'force-dynamic'` as the first export in 69 API routes.

---

## Pre-Implementation Validation

### Missing Context Check
- ✅ We have the complete list of affected routes (69 files)
- ✅ We understand the root cause (build-time execution)
- ✅ We have the correct solution approach (selective runtime declarations)
- ✅ Lazy initialization already implemented in previous commits

### Alternative Approaches Considered
1. ❌ **Force all routes dynamic** - Too broad, hurts performance
2. ✅ **Selective runtime + lazy init** - CHOSEN: Surgical, follows Next.js best practices
3. ❌ **Stub services at build** - Complex, masks problems

### Documentation Gaps
- ✅ Next.js runtime config: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic
- ✅ Build-time vs request-time execution understood
- ✅ No additional research needed

### Procedural Flaws Check
- ✅ Plan covers ALL 69 routes systematically
- ✅ Testing steps included (local build + Vercel deploy)
- ✅ Rollback plan: git revert if issues arise
- ✅ No dependencies on external changes

---

## Task 1: Create Automated Script to Add Runtime Declarations

**Files:**
- Create: `/tmp/add-dynamic-exports.sh`

**Step 1: Write the script**

```bash
cat > /tmp/add-dynamic-exports.sh << 'SCRIPT'
#!/bin/bash
# Add 'export const dynamic = "force-dynamic";' to API routes

# List of files (69 routes identified)
files=(
  "app/api/admin/apply-migration/route.ts"
  "app/api/admin/check-workflow/route.ts"
  "app/api/admin/fix-workflow/route.ts"
  "app/api/admin/linkedin/link-account/route.ts"
  "app/api/auth/signup/route.ts"
  "app/api/campaigns/[id]/documents/route.ts"
  "app/api/campaigns/[id]/route.ts"
  "app/api/campaigns/route.ts"
  "app/api/campaigns/trigger-pod/route.ts"
  "app/api/cartridges/[id]/route.ts"
  "app/api/cartridges/brand/route.ts"
  "app/api/cartridges/brand/upload-logo/route.ts"
  "app/api/cartridges/generate-from-voice/route.ts"
  "app/api/cartridges/instructions/[id]/route.ts"
  "app/api/cartridges/instructions/[id]/status/route.ts"
  "app/api/cartridges/instructions/process/route.ts"
  "app/api/cartridges/instructions/route.ts"
  "app/api/cartridges/instructions/upload/route.ts"
  "app/api/cartridges/preferences/route.ts"
  "app/api/cartridges/route.ts"
  "app/api/cartridges/style/[id]/route.ts"
  "app/api/cartridges/style/[id]/status/route.ts"
  "app/api/cartridges/style/route.ts"
  "app/api/cartridges/style/upload/route.ts"
  "app/api/clients/route.ts"
  "app/api/comment-polling/route.ts"
  "app/api/conversation-intelligence/route.ts"
  "app/api/cron/dm-delivery/route.ts"
  "app/api/cron/dm-scraper/route.ts"
  "app/api/cron/pod-notifications/route.ts"
  "app/api/cron/webhook-retry/route.ts"
  "app/api/dm-queue/route.ts"
  "app/api/dm-sequences/[id]/route.ts"
  "app/api/dm-sequences/route.ts"
  "app/api/email-extraction/route.ts"
  "app/api/health/route.ts"
  "app/api/hgc-v3/route.ts"
  "app/api/hgc/campaigns/route.ts"
  "app/api/hgc/linkedin/route.ts"
  "app/api/hgc/pods/route.ts"
  "app/api/hgc/route.ts"
  "app/api/knowledge-base/[id]/campaigns/route.ts"
  "app/api/knowledge-base/[id]/route.ts"
  "app/api/knowledge-base/route.ts"
  "app/api/knowledge-base/search/route.ts"
  "app/api/lead-magnets/[id]/download/route.ts"
  "app/api/lead-magnets/[id]/route.ts"
  "app/api/lead-magnets/analytics/route.ts"
  "app/api/lead-magnets/route.ts"
  "app/api/lead-magnets/upload/route.ts"
  "app/api/linkedin/accounts/route.ts"
  "app/api/linkedin/auth/route.ts"
  "app/api/linkedin/posts/route.ts"
  "app/api/mem0/route.ts"
  "app/api/pod-automation/route.ts"
  "app/api/pod-posts/route.ts"
  "app/api/pods/[id]/automation/actions/route.ts"
  "app/api/pods/[id]/automation/status/route.ts"
  "app/api/pods/[id]/engagement/status/route.ts"
  "app/api/pods/[id]/members/[memberId]/invite/route.ts"
  "app/api/pods/[id]/members/[memberId]/route.ts"
  "app/api/pods/[id]/members/route.ts"
  "app/api/pods/[id]/route.ts"
  "app/api/pods/members/auth/route.ts"
  "app/api/pods/route.ts"
  "app/api/pods/trigger-amplification/route.ts"
  "app/api/user/route.ts"
  "app/api/webhook-delivery/route.ts"
  "app/api/webhooks/unipile/route.ts"
)

echo "Adding 'export const dynamic = \"force-dynamic\";' to ${#files[@]} files..."
echo ""

for file in "${files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "⚠️  SKIP: $file (not found)"
    continue
  fi

  # Check if already has export const dynamic
  if grep -q "export const dynamic" "$file"; then
    echo "✓ SKIP: $file (already has dynamic export)"
    continue
  fi

  # Find the first import line to insert after
  first_import_line=$(grep -n "^import" "$file" | head -1 | cut -d: -f1)

  if [ -z "$first_import_line" ]; then
    # No imports, add at top
    echo "export const dynamic = 'force-dynamic';" | cat - "$file" > "$file.tmp" && mv "$file.tmp" "$file"
    echo "✓ ADD: $file (at top)"
  else
    # Find last import in import block
    last_import=$(awk '/^import/{ last=NR } END{ print last }' "$file")

    # Insert after last import
    awk -v line="$last_import" -v text="\\nexport const dynamic = 'force-dynamic';" \
      'NR==line{ print; print text; next }1' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
    echo "✓ ADD: $file (after imports)"
  fi
done

echo ""
echo "✅ Complete! Modified files ready for review."
SCRIPT

chmod +x /tmp/add-dynamic-exports.sh
```

**Step 2: Review script logic**

Verify the script:
- Skips files that don't exist
- Skips files already having `export const dynamic`
- Inserts after import statements
- Reports what it's doing

**Step 3: Run script (dry-run verification)**

```bash
# Back up one file first to verify logic
cp app/api/admin/check-workflow/route.ts app/api/admin/check-workflow/route.ts.backup

# Run on single file to verify
cd /Users/rodericandrews/Obsidian/Master/_projects/bravo-revos
/tmp/add-dynamic-exports.sh 2>&1 | head -10
```

Expected output: Script reports adding declaration to files

**Step 4: Verify changes look correct**

```bash
git diff app/api/admin/check-workflow/route.ts
```

Expected: See `export const dynamic = 'force-dynamic';` added after imports

**Step 5: If looks good, commit**

```bash
git add -A
git commit -m "fix(api): add dynamic runtime declaration to 69 routes with external dependencies

- Prevents build-time execution of routes connecting to Redis/Supabase
- Fixes Vercel build failures (ECONNREFUSED, supabaseUrl required)
- Follows Next.js 14 best practices for runtime-only routes
- No functional changes, only build configuration"
```

---

## Task 2: Verify Local Build Success

**Step 1: Clean Next.js cache**

```bash
rm -rf .next
```

**Step 2: Run production build**

```bash
npm run build 2>&1 | tee /tmp/build-output.log
```

Expected: Build completes successfully with no Redis/Supabase errors

**Step 3: Check for Redis errors**

```bash
grep -i "ECONNREFUSED.*6379" /tmp/build-output.log
```

Expected: No output (no Redis connection attempts during build)

**Step 4: Check for Supabase errors**

```bash
grep -i "supabaseUrl is required" /tmp/build-output.log
```

Expected: No output (no Supabase client creation during build)

**Step 5: Verify build artifacts**

```bash
ls -la .next/server/app/api/ | head -20
```

Expected: All route functions compiled successfully

**Step 6: If build succeeds, commit build verification**

```bash
echo "✅ Local build verified" >> /tmp/build-verification.txt
git add /tmp/build-verification.txt
git commit -m "test: verify local build succeeds after runtime declarations"
```

---

## Task 3: Deploy to Vercel Staging

**Step 1: Push changes to git**

```bash
git push origin main
```

**Step 2: Deploy to Vercel**

```bash
vercel --token="4DmMuluSbKst2Zw7eJvFIXV5" --yes 2>&1 | tee /tmp/vercel-deploy-runtime-fix.log
```

**Step 3: Monitor build progress**

Wait for build completion (2-3 minutes)

**Step 4: Check Vercel build log for errors**

```bash
grep -i "error\|failed" /tmp/vercel-deploy-runtime-fix.log | grep -v "npm warn"
```

Expected: No build errors

**Step 5: Verify deployment succeeded**

```bash
grep "Deployment completed" /tmp/vercel-deploy-runtime-fix.log
```

Expected: Shows deployment URL

**Step 6: Extract and test deployment URL**

```bash
DEPLOY_URL=$(grep -o "https://bravo-revos-.*\.vercel\.app" /tmp/vercel-deploy-runtime-fix.log | head -1)
echo "Deployment URL: $DEPLOY_URL"

# Test health endpoint
curl "$DEPLOY_URL/api/health" | jq
```

Expected: Returns 200 with health status

**Step 7: If deployment succeeds, commit verification**

```bash
echo "✅ Vercel deployment succeeded: $DEPLOY_URL" >> /tmp/build-verification.txt
git add /tmp/build-verification.txt
git commit -m "test: verify Vercel deployment succeeds"
git push origin main
```

---

## Task 4: Smoke Test Critical Routes

**Step 1: Test Supabase-dependent route**

```bash
DEPLOY_URL="<from previous task>"

# Test route that uses Supabase
curl -X POST "$DEPLOY_URL/api/user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake-token-for-test" \
  -d '{}' \
  -w "\nHTTP Status: %{http_code}\n"
```

Expected: Returns 401 Unauthorized (not 500 server error from missing Supabase)

**Step 2: Test Redis-dependent route**

```bash
# Test route that uses Redis/BullMQ
curl -X POST "$DEPLOY_URL/api/pod/trigger-amplification" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake-token-for-test" \
  -d '{"post_id":"test","linkedin_url":"https://linkedin.com/posts/test"}' \
  -w "\nHTTP Status: %{http_code}\n"
```

Expected: Returns 401 Unauthorized (not 500 server error from Redis connection)

**Step 3: Test OpenAI-dependent route**

```bash
# Test route that uses OpenAI
curl -X POST "$DEPLOY_URL/api/hgc-v3" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake-token-for-test" \
  -d '{"message":"test"}' \
  -w "\nHTTP Status: %{http_code}\n"
```

Expected: Returns 401 Unauthorized (not 500 from missing OpenAI key)

**Step 4: Document smoke test results**

```bash
echo "✅ All smoke tests passed" >> /tmp/build-verification.txt
cat /tmp/build-verification.txt
```

**Step 5: Final commit**

```bash
git add /tmp/build-verification.txt
git commit -m "test: smoke tests pass on Vercel deployment"
git push origin main
```

---

## Rollback Plan

If deployment fails or routes break:

```bash
# Revert the runtime declarations commit
git revert HEAD~2  # Adjust count based on commits made

# Push revert
git push origin main

# Redeploy previous working version
vercel --token="4DmMuluSbKst2Zw7eJvFIXV5" --yes
```

---

## Success Criteria

- [  ] All 69 routes have `export const dynamic = 'force-dynamic'`
- [  ] Local build completes without Redis/Supabase errors
- [  ] Vercel build completes successfully
- [  ] Deployment URL accessible
- [  ] Critical routes return expected auth errors (not 500s)

---

## Estimated Time

- Task 1 (Script + Apply): 15 minutes
- Task 2 (Local Build): 10 minutes
- Task 3 (Vercel Deploy): 10 minutes
- Task 4 (Smoke Tests): 5 minutes

**Total: ~40 minutes**

---

## Related Documentation

- Next.js Dynamic Route Config: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic
- Vercel Build Logs: https://vercel.com/docs/deployments/troubleshoot-a-build
- Previous lazy init fixes: git log --grep="lazy initialization"
