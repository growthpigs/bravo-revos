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

### 3. **production** = Live/Production Environment
**Purpose:** Live code serving real users
**Who:** Only deploy after staging approval
**Render Deploy:** Yes (production environment)
**Deployment Trigger:** Push to production
**Testing:** Already tested in staging, no issues reported

**Workflow:**
```bash
# After staging approval and validation
git checkout production
git merge staging
git push origin production
# Render auto-deploys to production (LIVE)
```

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

3. PRODUCTION (production)
   ├─ Staging approval confirmed ✅
   ├─ Merge to production: git checkout production && git merge staging
   ├─ Push: git push origin production
   ├─ Render auto-deploys to production (LIVE)
   └─ Monitor Sentry for errors
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

If production has a critical issue:

```bash
# Identify last stable commit
git log --oneline production

# Checkout previous working version
git checkout production
git reset --hard <commit-hash>

# Force push to production (CAUTION!)
git push -f origin production

# Render auto-deploys reverted version
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
- Skip testing before merging
- Merge to production without staging validation
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
**Status:** ✅ ACTIVE AND DEPLOYED
**Next:** Start new feature work following this workflow

