# Staging Test Guide - Local Verification Before Production

**Date:** 2025-11-05
**Branch:** `staging-2025-11-05`
**Status:** ✅ Ready for Local Testing

---

## Quick Start (5 minutes)

```bash
# You're already on staging branch
git status  # Should show: "On branch staging-2025-11-05"

# Terminal 1: Start Redis
redis-server --port 6379

# Terminal 2: Start dev server
npm run dev

# Terminal 3: Run tests
npm test
```

---

## What to Test

### 1. **TypeScript Compilation** ✅
```bash
npx tsc --noEmit
# Expected: Zero errors
```

### 2. **Test Suite** ✅
```bash
npm test
# Expected: 90+ tests passing
```

### 3. **Build for Production** ✅
```bash
npm run build
# Expected: Successful build with all routes compiled
```

### 4. **Dev Server** ✅
```bash
npm run dev
# Open http://localhost:3000 in browser
# Should load without errors
```

---

## API Testing (After Dev Server Running)

### Test DM Queue
```bash
curl -X POST http://localhost:3000/api/dm-queue/status \
  -H "Content-Type: application/json"
# Expected: Queue status with 0 waiting, 0 active, 0 failed
```

### Test Comment Polling
```bash
curl -X GET http://localhost:3000/api/comment-polling \
  -H "Content-Type: application/json"
# Expected: Queue statistics
```

### Test Pod Post Detection
```bash
curl -X POST http://localhost:3000/api/pod-posts \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "podId": "test-pod-1",
    "accountId": "test-account",
    "podMemberIds": ["member-1", "member-2"],
    "campaignId": "test-campaign",
    "userId": "test-user"
  }'
# Expected: 200 OK with job ID
```

---

## Validation Checklist

- [ ] TypeScript compiles with zero errors
- [ ] All 90+ tests pass
- [ ] Build succeeds with no warnings
- [ ] Dev server starts without errors
- [ ] API endpoints respond correctly
- [ ] Redis connection works
- [ ] No console errors in browser

---

## If Issues Arise

### TypeScript Errors
```bash
# Clear build cache and retry
rm -rf .next
npx tsc --noEmit
```

### Test Failures
```bash
# Run specific test file
npm test -- __tests__/dm-queue.test.ts

# Run with verbose output
npm test -- --verbose
```

### Redis Connection Issues
```bash
# Verify Redis running
redis-cli ping
# Expected: PONG

# Check Redis on port 6379
lsof -i :6379
```

### Dev Server Issues
```bash
# Kill any existing process on port 3000
lsof -i :3000
kill -9 <PID>

# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

---

## Production Readiness

After passing all checks above, staging is ready to merge to production:

```bash
# Switch to main
git checkout main

# Merge from staging
git merge staging-2025-11-05

# Push to production
git push origin main
```

---

## Rollback Plan

If issues are found in staging:

```bash
# Revert to tagged release
git checkout v1.0.0-refactored

# Or return to previous main
git checkout main
git reset --hard HEAD~1
```

---

## Success Criteria

✅ All tests pass
✅ TypeScript: Zero errors
✅ Build: Complete without warnings
✅ Dev server: Starts and serves pages
✅ APIs: All endpoints functional
✅ Redis: Connected and working
✅ No console errors/warnings

---

**Status:** Ready to test locally
**Next:** Verify all checks pass, then merge to production
