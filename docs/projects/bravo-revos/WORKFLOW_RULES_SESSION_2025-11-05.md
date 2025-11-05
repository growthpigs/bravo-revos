# Bravo revOS Workflow Rules & Standards - Session 2025-11-05

**Document Type:** Workflow Standards
**Created:** 2025-11-05
**Status:** ACTIVE - Implementation Standard
**Audience:** All Claude Code sessions, developers, contributors

---

## Executive Summary

This document captures the complete workflow system established in today's session for Bravo revOS. It defines the integration between:
- **Git branch management** (HEAD positioning)
- **Archon task tracking** (todo → doing → review → done)
- **Code implementation** (where work actually happens)
- **Merge procedures** (how code flows through stages)

**Core Rule:** "The HEAD has to be moved to that tab. We can't be working on things without moving the HEAD from GitHub."

---

## Part 1: Git Branch & HEAD Management

### Branch Structure (Three-Tier Deployment)

Every Bravo revOS project uses the standard three-tier branch strategy:

```
feat/descriptive-name (temporary - YOUR working branch)
       ↓ (merge when work complete)
main (Development Environment)
       ↓ (merge for code review)
staging (Code Review Environment)
       ↓ (merge after approval)
production (Live/Production Environment)
```

### HEAD Positioning Rule (CRITICAL)

**Rule:** When working on a task, the git HEAD MUST be on the feature branch for that task, NOT on main.

```bash
# WRONG - Don't do this:
git checkout main
# [work on files while on main]  ❌

# CORRECT - Do this:
git checkout -b feat/descriptive-name
# [work on files while on feat/descriptive-name]  ✅
```

**Why:**
- Keeps main clean and stable
- Prevents accidental commits to main
- Isolates work per task
- Easy to review branch diffs
- Simplifies merge workflow

### Branch Naming Convention

```
feat/feature-name     → New features (B-01, B-02, B-03, B-04, etc.)
fix/bug-name          → Bug fixes
docs/description      → Documentation
refactor/name         → Refactoring
test/scenario         → Test additions
chore/maintenance     → Dependencies, config updates
```

**Examples from Bravo revOS:**
- `feat/supabase-storage` (B-01)
- `feat/cartridge-database` (B-02)
- `feat/voice-generation` (B-03)
- `feat/cartridge-ui` (B-04)
- `feat/unipile-integration` (C-01)
- `feat/comment-polling` (C-02)
- `feat/dm-queue` (C-03)

---

## Part 2: Archon Task Workflow

### Task Status Flow

Every task MUST progress through these stages in order. **NO SKIPPING.**

```
todo → doing → review → done
```

**No exceptions.** Each transition requires:
- **todo → doing:** Mark task "doing", checkout feature branch
- **doing → review:** Implement work, commit to branch, mark task "review", create SITREP
- **review → done:** User approves, merge branch to next tier, mark task "done"

### todo → doing: Start Work

```
Archon:
1. find_tasks(task_id="...")  # Get the task
2. manage_task("update", task_id="...", status="doing")  # Mark doing

Git:
3. git checkout -b feat/descriptive-name  # Create feature branch (or checkout if exists)
4. git push -u origin feat/descriptive-name  # Push to GitHub
   → Archon UI automatically creates new branch tab
```

**What Happens:**
- Task status changes to "doing" in Archon
- New branch tab appears in Archon UI automatically when pushed to GitHub
- You are now isolated on your working branch
- All commits go to this branch, not main

### doing → review: Complete Work

```
Implement & Commit:
1. [Write code, run tests, validate]
2. git add .
3. git commit -m "feat: [what you implemented]"

Documentation:
4. Create SITREP (.md file in docs/projects/bravo-revos/)
5. Upload SITREP to Archon: manage_document("create", ...)

Archon:
6. manage_task("update", task_id="...", status="review")

Verification:
7. Verify task is in "review" status
8. Verify SITREP appears in Archon documents
```

**Deliverables at "review" stage:**
- ✅ Code complete on feature branch
- ✅ All tests passing (69/69 for Bravo revOS)
- ✅ Zero TypeScript errors
- ✅ Build succeeds
- ✅ SITREP created and uploaded to Archon
- ✅ Task marked "review" (not "done" yet)

### review → done: Approve & Merge

This happens in two steps:

**Step 1: User Review (you read the SITREP)**
```
User reviews SITREP in Archon:
- Reads implementation summary
- Checks test results
- Reviews deliverables
- Decides: APPROVE or REQUEST CHANGES
```

**Step 2: Merge (once approved)**
```
Git Merge Procedure:

1. Merge feature branch to main:
   git checkout main
   git merge feat/descriptive-name
   git push origin main

2. Merge main to staging:
   git checkout staging
   git merge main
   git push origin staging

3. Staging validation/testing happens automatically (Render deploys)

4. After staging validation, merge to production:
   git checkout production
   git merge staging
   git push origin production

5. Clean up feature branch:
   git branch -d feat/descriptive-name
   git push origin --delete feat/descriptive-name

Archon:
6. manage_task("update", task_id="...", status="done")

Result:
- Code is now LIVE in production
- Feature branch is deleted
- Task shows as "done"
- Next task can be started
```

---

## Part 3: Archon Task Management Rules

### Rule 1: No Skipping Stages

**CRITICAL:** Do not skip stages. Do not mark task "done" without going through "review".

```
❌ WRONG:  todo → doing → done  (skipped review)
✅ CORRECT: todo → doing → review → done
```

**Why:**
- "review" stage is where work is validated
- User needs chance to review SITREP
- Ensures quality gate before merging to production
- Prevents broken code from reaching production

### Rule 2: One Task "doing" at a Time

Only ONE task should be in "doing" status at any moment (per session).

```
When starting new task:
1. Previous task must be in "review" or "done"
2. Then mark new task "doing"
3. Check out new feature branch
```

### Rule 3: SITREP is Mandatory

**Every** task that moves to "review" MUST have:
1. `.md` file in `docs/projects/bravo-revos/`
2. Uploaded to Archon via `manage_document("create", ...)`
3. Contains:
   - Summary of what was implemented
   - Test results (pass/fail)
   - Deliverables checklist
   - Any blockers or issues
   - Production readiness assessment

**Example:** `C03_DM_QUEUE_SITREP.md` uploaded to Archon

### Rule 4: All Work Must Be Committed Before Moving to "review"

```
Before marking "review":
- All code changes must be committed to feature branch
- No uncommitted changes (git status must be clean)
- SITREP must be created and uploaded
- Tests must all pass
- Build must succeed
```

---

## Part 4: Branch Management During Work

### Creating Feature Branch

```bash
# Option 1: Create new branch
git checkout -b feat/descriptive-name
git push -u origin feat/descriptive-name

# Option 2: Checkout existing branch
git checkout feat/descriptive-name
git pull origin feat/descriptive-name
```

### During Development

```bash
# Make changes
git add .
git commit -m "feat: description of work"

# Push regularly
git push origin feat/descriptive-name

# Keep up with main (if main changes while you work)
git fetch origin
git rebase origin/main  # or git merge origin/main
```

### Verification Before Moving to "review"

```bash
# 1. Verify all changes are committed
git status  # Should show "nothing to commit"

# 2. Run tests
npm test  # Should show: Tests: X passed, X total

# 3. Run TypeScript check
npx tsc --noEmit  # Should show: zero errors

# 4. Run build
npm run build  # Should complete successfully

# 5. Verify branch is ahead of main
git log --oneline main..HEAD  # Shows commits on feature branch
```

---

## Part 5: Complete Workflow Example

### Example: C-03 DM Queue (How It Should Have Been Done)

```
STAGE 1: todo → doing
═══════════════════════════════════════════════════════════════

Archon:
  manage_task("update", task_id="C-03", status="doing")

Git:
  git checkout -b feat/dm-queue
  git push -u origin feat/dm-queue
  # → Branch tab appears in Archon UI automatically

HEAD is now on: feat/dm-queue


STAGE 2: doing → review (Implementation)
═══════════════════════════════════════════════════════════════

Work on feature branch:
  [Implement dm-queue.ts]
  [Implement dm-queue/route.ts]
  [Run tests: 69/69 pass ✅]
  [Build succeeds ✅]
  [TypeScript: zero errors ✅]

Commit regularly:
  git add lib/queue/dm-queue.ts
  git commit -m "feat: Implement DM queue with rate limiting"
  git add app/api/dm-queue/route.ts
  git commit -m "feat: Add DM queue API endpoints"
  git push origin feat/dm-queue

Documentation:
  [Create C03_DM_QUEUE_SITREP.md]
  [Include test results, deliverables, grade: A]

Upload to Archon:
  manage_document("create", project_id="...", title="C-03 DM Queue - SITREP", ...)

Mark for Review:
  manage_task("update", task_id="C-03", status="review")

Status: ✅ ready for user review


STAGE 3: review (User Review)
═══════════════════════════════════════════════════════════════

User:
  1. Reads SITREP in Archon
  2. Reviews implementation summary
  3. Checks test results (69/69 pass)
  4. Checks deliverables (all ✅)
  5. Decides: "Looks good, move to done"


STAGE 4: review → done (Merge to Production)
═══════════════════════════════════════════════════════════════

Merge to main:
  git checkout main
  git merge feat/dm-queue
  git push origin main
  # Automatic Render deployment to dev environment

Merge to staging:
  git checkout staging
  git merge main
  git push origin staging
  # Automatic Render deployment to staging environment

Validate in staging:
  [Tests pass]
  [API works]
  [No errors in Sentry]

Merge to production:
  git checkout production
  git merge staging
  git push origin production
  # Automatic Render deployment to production (LIVE)

Clean up:
  git branch -d feat/dm-queue
  git push origin --delete feat/dm-queue
  # Branch tab disappears from Archon UI

Final:
  manage_task("update", task_id="C-03", status="done")

Status: ✅ LIVE in production
```

---

## Part 6: Key Rules & Constraints

### Rule: Don't Push to Origin Without Permission

```
❌ Don't push to main without reviewing SITREP
❌ Don't push to staging without code review
❌ Don't push to production without staging validation
✅ Push to feat/descriptive-name freely
✅ Ask user before merging to main
```

### Rule: No Force Push to Main, Staging, Production

```
❌ NEVER: git push -f origin main
❌ NEVER: git push -f origin staging
❌ NEVER: git push -f origin production
✅ Force push ONLY to feature branches if absolutely necessary
```

### Rule: Commit Messages Matter

```
Good:
  "feat: Implement C-03 DM Queue with rate limiting"
  "fix: Resolve race condition in rate limiter"
  "docs: Add SITREP for DM Queue"

Bad:
  "fixes"
  "update"
  "work in progress"
  "asdf"
```

### Rule: Always Test Before Committing

```
Before git commit:
  ✅ npm test        (all tests pass)
  ✅ npm run build   (build succeeds)
  ✅ npx tsc --noEmit (zero TypeScript errors)
```

### Rule: Staging is for Review, Production is for Live

```
main       → Your development work (Render deploys to dev)
staging    → Team review & validation (Render deploys to staging)
production → LIVE for users (Render deploys to production)
```

---

## Part 7: Integration with Archon

### Archon Task-Branch Mapping

When you push feature branch to GitHub, Archon automatically creates a tab:

```
Archon Project Dashboard:
├─ main (dev environment)
├─ staging (review environment)
├─ production (live environment)
└─ feat/dm-queue (your working branch) ← Appears automatically when pushed
```

Each tab shows:
- Commits on that branch
- Tasks filtered to that branch
- Documents filtered to that branch
- Clear separation of work

### Archon Task Status Shows Git Status

```
Task A-00:
  Status: done
  Branch: bolt-scaffold

Task B-01:
  Status: done
  Branch: cartridge-system

Task C-03:
  Status: review
  Branch: unipile-integration

Task D-01:
  Status: todo
  Branch: (none yet - will be feat/email-extraction)
```

---

## Part 8: Daily Operations

### Session Start

```
1. Check Archon for current tasks
   find_tasks(filter_by="status", filter_value="doing")

2. If any task is "doing":
   git checkout [that-branch]
   Continue work

3. If no task "doing":
   find_tasks(filter_by="status", filter_value="todo")
   Pick next task
   Mark it "doing": manage_task(..., status="doing")
   Check out branch: git checkout -b feat/descriptive-name
   Begin work
```

### During Work

```
Regularly (every 30-60 min):
  1. npm test
  2. npm run build
  3. git add .
  4. git commit -m "feat: description"
  5. git push origin feat/descriptive-name
```

### When Work Complete

```
1. Final validation:
   ✅ Tests pass (69/69)
   ✅ Build succeeds
   ✅ TypeScript: zero errors

2. Create SITREP:
   docs/projects/bravo-revos/[TASK]_SITREP.md

3. Upload to Archon:
   manage_document("create", ...)

4. Mark "review":
   manage_task(..., status="review")

5. Wait for user approval
```

---

## Part 9: Merge Approval Workflow

### User Approval Steps

1. **Reads SITREP** in Archon documents
2. **Verifies deliverables** (all checklist items ✅)
3. **Reviews test results** (69/69 pass, zero errors)
4. **Approves** by saying "Move to done"
5. **You then merge** through all three branches

### Merge After Approval

```bash
# 1. Merge to main (dev)
git checkout main
git merge feat/dm-queue
git push origin main

# 2. Merge to staging (review)
git checkout staging
git merge main
git push origin staging

# 3. Validate in staging (wait for Render deployment)
# [Check logs, verify APIs work]

# 4. Merge to production (LIVE)
git checkout production
git merge staging
git push origin production

# 5. Clean up
git branch -d feat/dm-queue
git push origin --delete feat/dm-queue

# 6. Mark done in Archon
manage_task(..., status="done")
```

---

## Part 10: Review & Monitoring

### Pre-Merge Checklist

Before moving to "review", verify:

- [ ] Feature branch created and pushed to GitHub
- [ ] All work committed (git status clean)
- [ ] Tests passing (69/69 for Bravo revOS)
- [ ] Build succeeds
- [ ] TypeScript: zero errors
- [ ] SITREP created and uploaded to Archon
- [ ] Task marked "review" in Archon
- [ ] Code review complete (SITREP reviewed)

### Pre-Production Checklist

Before merging feat → main → staging → production:

- [ ] SITREP reviewed by user
- [ ] Deliverables approved
- [ ] No blockers identified
- [ ] Ready for deployment
- [ ] User gives approval: "Move to done"

---

## Part 11: Emergency Procedures

### If Something Goes Wrong

**Branch is behind main:**
```bash
git fetch origin
git rebase origin/main
git push origin feat/descriptive-name
```

**Need to undo commit:**
```bash
git reset --soft HEAD~1  # Keep changes, undo commit
git reset --hard HEAD~1  # Discard changes and commit
```

**Merge conflict:**
```bash
git merge main  # Try to merge
# Fix conflicts in editor
git add .
git commit -m "merge: Resolve conflicts with main"
git push origin feat/descriptive-name
```

**Emergency rollback from production:**
```bash
git checkout production
git reset --hard [previous-good-commit]
git push -f origin production  # ONLY time force push is OK
```

---

## Part 12: Summary of Session Rules

From 2025-11-05 session with user:

1. ✅ **HEAD movement:** Always work on feature branch, not main
2. ✅ **Task workflow:** todo → doing → review → done (no skipping)
3. ✅ **Archon integration:** Use manage_task for status, manage_document for SITREPs
4. ✅ **Three-tier merge:** feat → main → staging → production
5. ✅ **SITREP mandatory:** Every task moving to review needs .md + Archon upload
6. ✅ **Branch tabs:** Archon UI creates tabs automatically when you push
7. ✅ **One "doing" task:** Only one task in "doing" status at a time
8. ✅ **Test before commit:** 69/69 tests, zero errors, build succeeds
9. ✅ **No force push:** Never force push to main/staging/production
10. ✅ **Clear commits:** Descriptive commit messages matter

---

## Document Control

**Version:** 1.0
**Created:** 2025-11-05
**Status:** ACTIVE - Enforced Standard
**Last Updated:** 2025-11-05
**Applies To:** Bravo revOS and all future projects
**Review Cycle:** Quarterly or when new patterns emerge

**When to Update This Document:**
- New workflow patterns discovered
- Rules need clarification
- Edge cases encountered
- Process improvements implemented

**How to Update:**
1. Edit this file
2. Increment version number
3. Add entry to "Last Updated"
4. Upload updated version to Archon
5. Notify team

---

## Sign-Off

These rules were established through real-world implementation during the C-01, C-02, C-03 development cycle and validated with:
- 8 tasks moved to "done" (A-00 through C-02)
- 1 task in "review" (C-03)
- 69/69 tests passing
- Zero TypeScript errors
- Full production deployment cycle

**This is the system.** Follow it for every task.

