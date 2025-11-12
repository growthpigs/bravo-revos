# CC1 & CC2 Coordination Protocol

**Created**: 2025-11-12
**Status**: Active

## Problem Identified

CC1 and CC2 were both editing the same files on the same branch (`feat/unipile-multi-channel`), causing:
- Merge conflicts
- Overwritten work
- Confusion about which version is correct

## Solution: Task-Based Branch Strategy

### Branch Assignment

**CC1 (Backend/Infrastructure Focus)**:
- Branch: `feat/cc1-backend-fixes`
- Responsibilities:
  - TypeScript configuration
  - Database schema/migrations
  - API endpoints
  - Test infrastructure
  - Build/deployment fixes
  - Type safety improvements

**CC2 (Frontend/UX Focus)**:
- Branch: `feat/cc2-ui-improvements`
- Responsibilities:
  - Chat interface (FloatingChatBar)
  - UI components
  - User interactions (ESC keys, modals)
  - Conversation management
  - Frontend state management
  - Visual design/CSS

### Coordination Rules

1. **Before Starting Work**:
   - Pull latest from `feat/unipile-multi-channel`
   - Create your agent-specific branch if it doesn't exist
   - Check if the file you're editing is in your domain

2. **During Work**:
   - Commit frequently with clear messages
   - Push to origin regularly (at least every 3-4 commits)
   - Alert user if you need to edit a file outside your domain

3. **Merging Back**:
   - Merge `feat/unipile-multi-channel` into your branch regularly
   - Resolve any conflicts immediately
   - When feature complete, create PR to merge back

4. **Shared Files** (both agents may edit):
   - `package.json` - Coordinate additions
   - `tsconfig.json` - CC1 leads, CC2 reviews
   - `.env.local` - Coordinate additions
   - Migration files - CC1 creates, CC2 reviews

### Emergency Protocol

If both agents need to work on the same file:
1. **Communicate via commit messages** - Tag with [CC1→CC2] or [CC2→CC1]
2. **Use feature flags** - Implement both features with flags, integrate later
3. **Time-box turns** - CC1 works for 30min, commits, then CC2 can work

### Current Branch Status

```
feat/unipile-multi-channel (main integration branch)
├── feat/cc1-backend-fixes (CC1 working branch)
└── feat/cc2-ui-improvements (CC2 working branch)
```

## Git Commands Quick Reference

### CC1 Setup
```bash
git checkout feat/unipile-multi-channel
git pull origin feat/unipile-multi-channel
git checkout -b feat/cc1-backend-fixes
git push -u origin feat/cc1-backend-fixes
```

### CC2 Setup
```bash
git checkout feat/unipile-multi-channel
git pull origin feat/unipile-multi-channel
git checkout -b feat/cc2-ui-improvements
git push -u origin feat/cc2-ui-improvements
```

### Regular Sync (Both Agents)
```bash
# Sync with main integration branch
git fetch origin
git checkout feat/unipile-multi-channel
git pull origin feat/unipile-multi-channel
git checkout feat/cc1-backend-fixes  # or feat/cc2-ui-improvements
git merge feat/unipile-multi-channel
git push origin feat/cc1-backend-fixes  # or feat/cc2-ui-improvements
```

## Success Metrics

- ✅ Zero merge conflicts between CC1 and CC2 work
- ✅ Each agent commits 5+ times per session
- ✅ Clear separation of backend vs frontend work
- ✅ Faster development (parallel work, no blocking)
