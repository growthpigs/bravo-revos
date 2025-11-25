# Bravo revOS - Three-Tier Branch Strategy

**Established:** 2025-11-05
**Status:** ✅ ACTIVE

---

## 📋 Branch Hierarchy

Your three-tier production environment strategy:

```
main (Development)
  ↓ (code review when ready)
staging (Code Review)
  ↓ (approved for production)
production (Live/Production)
```

---

## 🎯 Each Branch's Purpose

### 1. **main** = Development Environment
**Purpose:** Latest development code, continuous testing
**Who:** All developers, feature branches merge here first
**Render Deploy:** Yes (dev environment)
**Deployment Trigger:** Push to main
**Testing:** Full test suite, TypeScript, builds

**Workflow:**
```bash
# Start feature work
git checkout -b feat/new-feature

# When ready for development testing
git checkout main
git merge feat/new-feature
git push origin main
# Render auto-deploys to dev
```

---

### 2. **staging** = Code Review Environment
**Purpose:** Pre-production validation before live deployment
**Who:** Team lead, code reviewers, QA
**Render Deploy:** Yes (staging/review environment)
**Deployment Trigger:** Push to staging
**Testing:** All tests must pass, API validation, integration testing

**Workflow:**
```bash
# When dev code is ready for review
git checkout staging
git merge main
git push origin staging
# Render auto-deploys to staging
# Team reviews and validates in staging environment
```

---

### 3. **production** = Live/Production Environment 🔒
**Purpose:** Live code serving real users
**Who:** Only deploy after staging approval
**Render Deploy:** Yes (production environment)
**Deployment Trigger:** 🔒 **GitHub PR approval only** (branch is LOCKED)
**Testing:** Already tested in staging, no issues reported
**GitHub Protection:** ✅ Branch protection enabled - direct pushes blocked

**Workflow (PR-ONLY):**
```bash
# After staging approval and validation
# 🔒 DO NOT PUSH DIRECTLY - Create PR instead

# Option 1: Via GitHub UI (Recommended)
# 1. Go to https://github.com/growthpigs/bravo-revos
# 2. Click "New Pull Request"
# 3. Base: production ← Compare: staging
# 4. Get approval from team
# 5. Merge PR
# 6. Render auto-deploys to production (LIVE)

# Option 2: Via GitHub CLI
gh pr create --base production --head staging --title "Deploy staging to production"
gh pr merge <pr-number> --squash
# Render auto-deploys to production (LIVE)
```

**⚠️ IMPORTANT:** Direct pushes to production will fail due to GitHub branch protection.

---

## 🔄 Complete Feature Workflow

### From Feature → Production

```
1. DEVELOPMENT (main)
   ├─ Create feature branch: git checkout -b feat/feature-name
   ├─ Implement feature, commit
   ├─ Push: git push origin feat/feature-name
   ├─ Merge to main: git checkout main && git merge feat/feature-name
   ├─ Push to main: git push origin main
   └─ Render auto-deploys to dev environment

2. CODE REVIEW (staging)
   ├─ Merge from main: git checkout staging && git merge main
   ├─ Push: git push origin staging
   ├─ Render auto-deploys to staging environment
   ├─ Team validates in staging (APIs, UI, edge cases)
   └─ If issues: fix on main, repeat step 2

3. PRODUCTION (production) 🔒
   ├─ Staging approval confirmed ✅
   ├─ Create PR: staging → production (via GitHub UI or gh cli)
   ├─ Get team approval on PR
   ├─ Merge PR (squash or merge commit)
   ├─ Render auto-deploys to production (LIVE)
   └─ Monitor Sentry for errors

   ⚠️ Direct pushes blocked by GitHub branch protection
```

---

## 📊 Current Status (2025-11-05)

**All three branches synced and in production:**

| Branch | Last Commit | Status | Environment |
|--------|------------|--------|-------------|
| **main** | fee7c59 (deployment docs) | ✅ Synced | Dev |
| **staging** | 0f8e950 (session summary) | ✅ Ready for review | Review |
| **production** | 0f8e950 (merged from staging) | ✅ LIVE | Production |

**Code in all environments:**
- ✅ Refactored Redis connection singleton
- ✅ Centralized configuration (lib/config.ts)
- ✅ Input validation layer (lib/validation.ts)
- ✅ 69/69 tests passing
- ✅ Zero TypeScript errors
- ✅ All 3 APIs functional (C-02, C-03, E-03)

---

## 🚀 Render Deployment Configuration

Render should be configured with:

```
Branch: main    → Deploy to Dev environment
Branch: staging → Deploy to Staging environment
Branch: production → Deploy to Production environment
```

**Auto-deploy enabled:** Yes (on push to any branch)
**Webhook:** GitHub push events trigger automatic deployment

---

## 📝 Commit Message Convention

Use clear prefixes to identify what kind of change:

```bash
# Feature implementation
git commit -m "feat: Add new feature X"

# Bug fixes
git commit -m "fix: Resolve issue with Y"

# Refactoring
git commit -m "refactor: Improve code structure"

# Documentation
git commit -m "docs: Add deployment guide"

# Testing
git commit -m "test: Add unit tests for X"

# Configuration
git commit -m "config: Update environment variables"
```

---

## ✅ Deployment Checklist

### Before merging to staging:
- [ ] All tests passing on main
- [ ] TypeScript compiles (zero errors)
- [ ] Code reviewed locally
- [ ] Commit messages clear and descriptive

### Before merging to production:
- [ ] Staging environment tested thoroughly
- [ ] No errors in Sentry from staging
- [ ] All APIs responding correctly
- [ ] Business approval received
- [ ] Ready for live deployment

### After production deployment:
- [ ] Monitor Sentry for errors (24 hours)
- [ ] Check API response times
- [ ] Verify all background jobs running
- [ ] No user-reported issues
- [ ] Database migrations successful (if any)

---

## 🚨 Emergency Rollback Procedure

### For main or staging branches:

```bash
# Identify last stable commit
git log --oneline main  # or staging

# Checkout previous working version
git checkout main  # or staging
git reset --hard <commit-hash>

# Force push (main/staging allow this)
git push -f origin main  # or staging

# Render auto-deploys reverted version
```

### For production branch (LOCKED - PR-only):

```bash
# 🔒 Cannot force push - use PR revert workflow instead

# 1. Create emergency revert branch
git checkout production
git pull origin production
git log --oneline -10  # Find last good commit
git checkout -b emergency/revert-to-<commit-hash>
git reset --hard <good-commit-hash>
git push origin emergency/revert-to-<commit-hash>

# 2. Create emergency PR on GitHub
# Go to: https://github.com/growthpigs/bravo-revos
# Create PR: emergency/revert-to-<commit-hash> → production
# Title: "🚨 EMERGENCY: Revert production to <commit-hash>"

# 3. Get emergency approval (team lead)
# 4. Merge PR immediately
# 5. Render auto-deploys reverted version to production

# Alternative: Use GitHub CLI
gh pr create --base production --head emergency/revert-to-<commit-hash> \
  --title "🚨 EMERGENCY: Revert production to <commit-hash>"
gh pr merge <pr-number> --admin --squash  # Requires admin rights
```

**⚠️ IMPORTANT:** Production branch has GitHub protection - force pushes will fail. Always use PR workflow for production rollbacks.

---

## 🔒 GitHub Branch Protection (Production Only)

**Status:** ✅ Configured for production branch

### Protection Rules Enabled:

The `production` branch has the following GitHub protections:

1. **Require Pull Request Reviews**
   - ✅ At least 1 approval required before merging
   - ✅ Dismiss stale pull request approvals when new commits pushed

2. **Restrict Pushes**
   - ✅ Direct pushes blocked for all users (including admins)
   - ✅ Only PR merges allowed

3. **Prevent Force Pushes**
   - ✅ Force pushes disabled
   - ✅ History cannot be rewritten

4. **Prevent Deletion**
   - ✅ Branch cannot be deleted

5. **Require Status Checks** (Optional - configure if needed)
   - Tests must pass before merge
   - TypeScript compilation must succeed

### How to Configure:

1. Go to: https://github.com/growthpigs/bravo-revos/settings/branches
2. Click "Add branch protection rule"
3. Branch name pattern: `production`
4. Enable these protections:
   - ✅ Require pull request reviews before merging (1 approval)
   - ✅ Lock branch (prevent force pushes and deletions)
   - ✅ Restrict who can push to matching branches (admins only for emergencies)
   - ✅ Do not allow bypassing the above settings
5. Save changes

### Testing the Protection:

```bash
# This should FAIL:
git checkout production
git push origin production
# Error: protected branch hook declined

# This is the CORRECT way:
# Create PR on GitHub: staging → production
# Get approval, merge PR
```

---

## 🎓 Best Practices

✅ **DO:**
- Always test locally on main before pushing
- Keep feature branches small and focused
- Use descriptive commit messages
- Review code thoroughly in staging
- Document breaking changes

❌ **DON'T:**
- Force push to main, staging, or production
- Push directly to production (use PR workflow)
- Skip testing before merging
- Merge to production without staging validation
- Bypass PR approval process for production
- Commit secrets or credentials
- Deploy untested code to production

---

## 📞 Questions?

This three-tier strategy ensures:
1. **Development agility** - rapid feature development on main
2. **Quality gates** - code review and validation on staging
3. **Production safety** - only tested, approved code goes live

Feature flow is clean: `feature` → `main` (dev) → `staging` (review) → `production` (live)

---

**Established:** 2025-11-05
**Updated:** 2025-11-25 (Added GitHub branch protection for production)
**Status:** ✅ ACTIVE AND DEPLOYED
**Production Protection:** 🔒 LOCKED - PR-only workflow enforced via GitHub
**Next:** Configure GitHub branch protection rules, then continue feature work

