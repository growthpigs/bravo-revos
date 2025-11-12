# CC1 Prompt: Documentation Structure Setup

Create the branch-based documentation structure for your work:

## Quick Setup

```bash
# 1. Create folder structure
mkdir -p docs/SITREPs docs/features docs/branches/2025-11-12-kakiyo-alignment

# 2. Create feature branch
git checkout -b feat/kakiyo-alignment

# 3. Commit structure
git add docs/
git commit -m "docs: create branch folder structure"
```

## Folder Structure

```
docs/
  SITREPs/          ← Overall app situation reports
  features/         ← Major feature specs (high-level)
  branches/         ← Branch-specific work
    2025-11-12-kakiyo-alignment/
      plan.md       ← Your implementation plan
      sitrep.md     ← Feature completion report (when done)
      validation.md ← Test results
```

## Rules for Future

**When starting ANY new mandate/sprint/feature:**

1. Ask user: "What should the branch name be?"
2. Create branch: `git checkout -b feat/[name]`
3. Create folder: `docs/branches/[YYYY-MM-DD]-[name]/`
4. Save ALL work in that folder (plan.md, sitrep.md, validation.md)

## Branch Naming Convention

- Features: `feat/[kebab-case-name]`
- Fixes: `fix/[kebab-case-name]`
- Docs: `docs/[kebab-case-name]`

**Example:** `feat/kakiyo-alignment`

## Folder Naming Convention

- Date: `YYYY-MM-DD` (today's date)
- Name: Same as branch name (without `feat/` prefix)
- Use kebab-case

**Example:** `docs/branches/2025-11-12-kakiyo-alignment/`
