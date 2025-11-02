# Bravo revOS - Project-Specific Instructions

## 🚨 CRITICAL: Repository Boundaries

**YOU MUST ONLY WORK IN THIS REPOSITORY: `/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/`**

### Iron Rules:
1. ❌ NEVER reference files from `#revOS` or any folder with `#` prefix (archived/done)
2. ❌ NEVER copy files from archived projects
3. ❌ NEVER look for specs outside this repository
4. ✅ ONLY work with files in `/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/`
5. ✅ Create FRESH documentation in `docs/projects/bravo-revos/`
6. ✅ All specs, research, and planning live HERE, not in archived folders

### Why This Matters:
- `#` prefix = archived/obsolete/done
- Bravo revOS is a NEW project with NEW requirements
- Copying old specs causes confusion and incorrect implementation
- This repository is the ONLY source of truth

**If you ever reference a path outside `/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/`, STOP and ask the user.**

---

## Project Information

**Project Name**: Bravo revOS
**Archon Project ID**: de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531
**Git Branch**: v1-lead-magnet
**Branch Flow**: v1-lead-magnet → main → staging → production

---

## Deployment

**Backend**: Render (Web Service + Background Worker)
**Frontend**: Netlify
**Docker**: Runs ONLY in Render's cloud (for Chrome/Playwright installation)

---

## Documentation Structure

All project documentation MUST live in:
`docs/projects/bravo-revos/`

This includes:
- spec.md - Feature specifications
- data-model.md - Database schema
- research.md - Research findings
- plan.md - Implementation plans
- roadmap.md - Project roadmap
- Any SITREPs or session documents

**ALWAYS upload documents to Archon immediately after creation using manage_document().**
