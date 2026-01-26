# Bravo revOS V1 - Quick Reference Card

**Last Updated**: 2025-11-04
**Project ID**: `de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531`
**Current Branch**: bolt-scaffold

---

## 📊 At a Glance

| Metric | Value |
|--------|-------|
| Total Epics | 7 |
| Total Tasks | 19 |
| Total Story Points | 116 |
| Foundation Task | A-01 (15 pts) |
| Highest Priority | Epic A (Critical) |

---

## 🗂️ Epic Overview

```
Epic A: Bolt.new Scaffold        │ 1 task  │ 15 pts │ Critical
Epic B: Cartridge System         │ 4 tasks │ 23 pts │ High
Epic C: Unipile & BullMQ         │ 3 tasks │ 20 pts │ High
Epic D: Email & Webhook          │ 3 tasks │ 20 pts │ High
Epic E: Engagement Pods          │ 4 tasks │ 20 pts │ Medium
Epic F: AI Integration           │ 2 tasks │ 10 pts │ Low
Epic G: Monitoring & Testing     │ 2 tasks │  8 pts │ Medium
```

---

## 📁 Files Created (2025-11-04)

### Primary Documentation
1. **COMPLETE-TASK-STRUCTURE.md** (20K)
   - Full task details for all 19 tasks
   - Copy-paste ready for task creation
   - Includes all descriptions, validation criteria

2. **TASK-CREATION-SUMMARY.md** (8K)
   - Executive summary and overview
   - Next steps guide
   - Risk mitigation strategies

3. **archon-mcp-commands.md** (11K)
   - Exact MCP commands to create all tasks
   - Verification commands
   - Quick command reference

### Supporting Files
4. **create-all-epic-tasks.py** (23K)
   - Python data structure with all tasks
   - Can be adapted for MCP automation

5. **QUICK-REFERENCE.md** (This file)
   - Fast lookup reference
   - Key metrics and file locations

---

## 🎯 Task Structure by Epic

### Epic A: Foundation (15 pts)
```
A-01: Bolt.new Full-Stack Scaffold [User] [15pts]
      ├─ Next.js 14 + Supabase
      ├─ Admin portal + Client dashboard
      ├─ Complete database schema
      └─ iOS-style toggle components
```

### Epic B: Cartridge System (23 pts)
```
B-01: Supabase Storage Setup [CC1] [3pts]
B-02: Cartridge Database & API [CC1] [8pts]
B-03: Voice Auto-Generation from LinkedIn [CC2] [7pts]
B-04: Cartridge Management UI [CC2] [5pts]
```

### Epic C: Unipile & BullMQ (20 pts)
```
C-01: Unipile Integration & Session Management [CC1] [5pts]
C-02: Comment Polling System [CC2] [7pts]
C-03: BullMQ Rate-Limited DM Queue [CC3] [8pts]
```

### Epic D: Email & Webhook (20 pts)
```
D-01: Email Extraction from DM Replies [CC1] [5pts]
D-02: Webhook to Client CRM/ESP [CC2] [10pts]
D-03: Mailgun One-Time Lead Magnet Delivery [CC3] [5pts]
```

### Epic E: Engagement Pods (20 pts)
```
E-01: Pod Infrastructure & Database [CC1] [5pts]
E-02: LinkedIn Session Capture for Pod Members [CC2] [5pts]
E-03: Pod Post Detection System [CC3] [5pts]
E-04: Pod Automation Engine [CC1] [5pts]
```

### Epic F: AI Integration (10 pts)
```
F-01: AgentKit Campaign Orchestration [CC2] [5pts]
F-02: Mem0 Memory System Integration [CC3] [5pts]
```

### Epic G: Monitoring & Testing (8 pts)
```
G-01: Real-time Monitoring Dashboard [CC1] [3pts]
G-02: End-to-End Testing Suite [CC2] [5pts]
```

---

## 👥 Task Distribution by Assignee

| Assignee | Task Count | Total Points | Tasks |
|----------|------------|--------------|-------|
| User | 1 | 15 | A-01 |
| CC1 | 5 | 21 | B-01, B-02, C-01, D-01, E-01, G-01 |
| CC2 | 6 | 39 | B-03, B-04, C-02, D-02, F-01, G-02 |
| CC3 | 5 | 28 | C-03, D-03, E-03, F-02 |

---

## 🌿 Branch Structure

```
main
├── epic-A-bolt-scaffold (A-01)
├── epic-B-cartridge-system (B-01, B-02, B-03, B-04)
├── epic-C-unipile-bullmq (C-01, C-02, C-03)
├── epic-D-email-webhook (D-01, D-02, D-03)
├── epic-E-engagement-pods (E-01, E-02, E-03, E-04)
├── epic-F-ai-integration (F-01, F-02)
└── epic-G-monitoring-testing (G-01, G-02)
```

---

## 🚀 Next Steps (In Order)

### 1. Upload Documentation to Archon
```bash
# Upload all task documentation
manage_document(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='Bravo revOS V1 - Complete Task Structure',
    document_type='note',
    content={...},
    tags=['planning', 'tasks', 'v1']
)
```

### 2. Create All Tasks in Archon
- Use commands from `archon-mcp-commands.md`
- Create all 19 tasks with full descriptions
- Verify task order: 100, 200, 300, etc.

### 3. Verify in Archon UI
- Check all 19 tasks visible
- Verify epic groupings
- Confirm branches set correctly
- Check assignees correct

### 4. Start A-01 Foundation
- Mark A-01 as 'doing'
- Open Bolt.new
- Use 300-word prompt from task description
- Generate complete scaffold
- Push to GitHub
- Mark as 'review'

### 5. Continue with Epic B
- Start with B-01 (Storage Setup)
- Follow context-first approach
- Read A-00 before each task
- Query knowledge base as instructed

---

## 📚 Critical Documentation References

### Project Documentation
- `spec.md` - Complete system specification
- `data-model.md` - Database schema and relationships
- `CONTEXT-FIRST-STANDARDIZATION-2025-11-04.md` - Context-first guide

### Task Documentation
- `COMPLETE-TASK-STRUCTURE.md` - All 19 tasks with full details
- `TASK-CREATION-SUMMARY.md` - Executive summary
- `archon-mcp-commands.md` - MCP commands reference

### Templates
- `A00_CONTEXT_HUB_TEMPLATE.md` - A-00 task template
- `TASK_SITREP_TEMPLATE.md` - Task completion SITREP
- `EPIC_SITREP_TEMPLATE.md` - Epic completion SITREP

---

## ⚡ Key Commands

### Find Tasks
```python
# All tasks
find_tasks(project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531')

# By status
find_tasks(project_id='...', filter_by='status', filter_value='todo')

# By epic
find_tasks(project_id='...', filter_by='epic', filter_value='Epic A: Bolt.new Scaffold')

# By assignee
find_tasks(project_id='...', filter_by='assignee', filter_value='CC1')
```

### Manage Task
```python
# Mark doing
manage_task(action='update', task_id='...', status='doing')

# Mark review
manage_task(action='update', task_id='...', status='review')

# Update metadata
manage_task(action='update', task_id='...', metadata={...})
```

### Upload Document
```python
manage_document(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='Document Title',
    document_type='note',
    content={'summary': '...', 'full_content': '...'},
    tags=[...]
)
```

---

## ✅ Validation Checklist

### Before Starting Any Task
- [ ] Read A-00 if first task in project
- [ ] Review task description completely
- [ ] Search project docs as instructed
- [ ] Query knowledge base with exact queries
- [ ] Mark task 'doing' in Archon

### During Task Execution
- [ ] Follow context-first approach
- [ ] Reference documentation in code
- [ ] Track time and message count
- [ ] Update story points if estimate wrong

### Before Marking 'Review'
- [ ] Run validator subagent
- [ ] Create task SITREP
- [ ] Upload SITREP to Archon
- [ ] Update task metadata
- [ ] Verify all deliverables complete

### Epic Completion
- [ ] All tasks in epic marked 'done'
- [ ] Create epic SITREP
- [ ] Upload epic SITREP to Archon
- [ ] Merge epic branch to main
- [ ] Update project documentation

---

## 🎯 Success Metrics

### Velocity Targets
- **3pt task**: 20-40 messages
- **5pt task**: 40-80 messages
- **8pt task**: 80-150 messages
- **15pt task**: 150-250 messages

### Quality Metrics
- All tests passing (G-02)
- Zero RLS violations (multi-tenancy)
- All SITREPs uploaded
- All documentation current

### Timeline Estimate
- **Epic A**: 1 session (User in Bolt.new)
- **Epic B**: 4 sessions (23 pts)
- **Epic C**: 3 sessions (20 pts)
- **Epic D**: 3 sessions (20 pts)
- **Epic E**: 4 sessions (20 pts)
- **Epic F**: 2 sessions (10 pts)
- **Epic G**: 2 sessions (8 pts)
- **Total**: ~19 sessions

---

## 🔗 Quick Links

- **Project in Archon**: [Project ID: de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531]
- **Repository**: `/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/`
- **Documentation**: `docs/projects/bravo-revos/`
- **Templates**: See global templates in `~/.claude/` or project templates

---

## 💡 Tips

1. **Always read A-00 first** - Contains all project context
2. **Query knowledge base** - Use exact queries from task descriptions
3. **Run validator before review** - Catch issues early
4. **Upload SITREPs immediately** - Don't batch document uploads
5. **Update story points** - If estimate was wrong, update and explain
6. **Track metrics** - Time, messages, variance for learning

---

**Status**: Ready for task creation in Archon
**Next Action**: Upload documentation and create all 19 tasks
**Priority**: Critical (A-01 blocks all other work)
