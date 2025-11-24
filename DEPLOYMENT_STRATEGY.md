# Three-Tier Deployment Strategy for Bravo RevOS

## Current Problem
- Pushing to `main` creates production deployment immediately
- No staging environment to test changes before production
- Hard to rollback if something breaks in production

## Proposed Solution: Three-Tier Workflow

### 1. Development (Local)
**Branch:** `staging` (or feature branches)  
**URL:** `http://localhost:3000`  
**Purpose:** Active development and debugging  
**Process:**
- Make changes locally
- Test with `npm run dev`
- Commit to staging branch

### 2. Staging (Preview/Testing)
**Branch:** `staging`  
**URL:** `https://bravo-revos-git-staging-agro-bros.vercel.app`  
**Purpose:** Test changes before promoting to production  
**Process:**
- Push staging branch: `git push origin staging`
- Vercel auto-deploys to staging URL
- Test thoroughly (LinkedIn posting, workflows, etc.)
- Verify everything works

### 3. Production (Stable)
**Branch:** `main`  
**URL:** `https://bravo-revos.vercel.app`  
**Purpose:** Live production app (locked/stable)  
**Process:**
- ONLY merge staging → main when ready for production
- `git checkout main && git merge staging && git push origin main`
- Vercel auto-deploys to production URL
- Users see stable, tested version

## Vercel Configuration

### Current Setup (Automatic):
Vercel automatically creates deployments for:
- ✅ **main branch** → Production (`bravo-revos.vercel.app`)
- ✅ **staging branch** → Preview with predictable URL
- ✅ **All other branches** → Preview URLs

### Branch URLs (Predictable):
```
main branch:    https://bravo-revos.vercel.app (production)
staging branch: https://bravo-revos-git-staging-agro-bros.vercel.app
feature branch: https://bravo-revos-git-feat-name-agro-bros.vercel.app
```

### Environment Variables:
- Production: Set in Vercel dashboard → main branch only
- Preview: Separate env vars for staging/preview branches
- Local: `.env.local` file

## Recommended Workflow

### Making Changes:
```bash
# 1. Work on staging branch
git checkout staging
# ... make changes ...
git add .
git commit -m "fix: your change"

# 2. Push to staging for testing
git push origin staging

# 3. Test on staging URL
open https://bravo-revos-git-staging-agro-bros.vercel.app

# 4. If everything works, promote to production
git checkout main
git merge staging --no-edit
git push origin main

# 5. Verify production
open https://bravo-revos.vercel.app
```

### Emergency Rollback:
```bash
# Find last good commit
git log --oneline -5

# Revert to last good commit
git checkout main
git reset --hard <commit-hash>
git push origin main --force

# Vercel auto-deploys the reverted version
```

## Vercel Dashboard Settings

**To configure in Vercel dashboard:**

1. Go to: https://vercel.com/agro-bros/bravo-revos/settings/git
2. **Production Branch:** Set to `main`
3. **Preview Branches:** Enable for `staging` and feature branches
4. **Automatic Deployments:** Enable for all branches
5. **Deploy Hooks:** Optional - for manual triggers

## Benefits

✅ **Test before production** - Catch bugs in staging
✅ **Easy rollback** - Revert main branch if needed  
✅ **Predictable URLs** - Know where staging lives
✅ **No surprises** - Production only updates when you merge
✅ **Clean workflow** - Matches Git branching strategy

## Current Status

**Working:**
- ✅ Staging branch exists
- ✅ Main branch is production
- ✅ Vercel auto-deploys both branches

**To Configure:**
- [ ] Set main as production branch in Vercel dashboard
- [ ] Test staging URL works correctly
- [ ] Document staging URL for team
- [ ] Set up separate env vars for staging vs production (if needed)

## Next Steps

1. Commit this document
2. Push to staging first: `git push origin staging`
3. Test staging URL
4. Only merge to main when ready for production
5. Never push directly to main without testing in staging first

---

**Production URL:** https://bravo-revos.vercel.app  
**Staging URL:** https://bravo-revos-git-staging-agro-bros.vercel.app  
**Local Dev:** http://localhost:3000
