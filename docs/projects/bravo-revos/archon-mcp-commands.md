# Archon MCP Commands to Create All Tasks

**Project ID**: `de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531`

These are the exact MCP commands needed to create all 19 tasks in Archon.

---

## Epic A: Bolt.new Scaffold

### A-01: Bolt.new Full-Stack Scaffold
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='A-01: Bolt.new Full-Stack Scaffold',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=15,
    status='todo',
    priority='critical',
    assignee='User',
    branch='epic-A-bolt-scaffold',
    epic='Epic A: Bolt.new Scaffold',
    task_order=100
)
```

---

## Epic B: Cartridge System

### B-01: Supabase Storage Setup
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='B-01: Supabase Storage Setup',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=3,
    status='todo',
    priority='high',
    assignee='CC1',
    branch='epic-B-cartridge-system',
    epic='Epic B: Cartridge System',
    task_order=200
)
```

### B-02: Cartridge Database & API
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='B-02: Cartridge Database & API',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=8,
    status='todo',
    priority='high',
    assignee='CC1',
    branch='epic-B-cartridge-system',
    epic='Epic B: Cartridge System',
    task_order=210
)
```

### B-03: Voice Auto-Generation from LinkedIn
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='B-03: Voice Auto-Generation from LinkedIn',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=7,
    status='todo',
    priority='high',
    assignee='CC2',
    branch='epic-B-cartridge-system',
    epic='Epic B: Cartridge System',
    task_order=220
)
```

### B-04: Cartridge Management UI
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='B-04: Cartridge Management UI',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=5,
    status='todo',
    priority='high',
    assignee='CC2',
    branch='epic-B-cartridge-system',
    epic='Epic B: Cartridge System',
    task_order=230
)
```

---

## Epic C: Unipile & BullMQ

### C-01: Unipile Integration & Session Management
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='C-01: Unipile Integration & Session Management',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=5,
    status='todo',
    priority='high',
    assignee='CC1',
    branch='epic-C-unipile-bullmq',
    epic='Epic C: Unipile & BullMQ',
    task_order=300
)
```

### C-02: Comment Polling System
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='C-02: Comment Polling System',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=7,
    status='todo',
    priority='high',
    assignee='CC2',
    branch='epic-C-unipile-bullmq',
    epic='Epic C: Unipile & BullMQ',
    task_order=310
)
```

### C-03: BullMQ Rate-Limited DM Queue
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='C-03: BullMQ Rate-Limited DM Queue',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=8,
    status='todo',
    priority='high',
    assignee='CC3',
    branch='epic-C-unipile-bullmq',
    epic='Epic C: Unipile & BullMQ',
    task_order=320
)
```

---

## Epic D: Email & Webhook

### D-01: Email Extraction from DM Replies
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='D-01: Email Extraction from DM Replies',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=5,
    status='todo',
    priority='high',
    assignee='CC1',
    branch='epic-D-email-webhook',
    epic='Epic D: Email & Webhook',
    task_order=400
)
```

### D-02: Webhook to Client CRM/ESP
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='D-02: Webhook to Client CRM/ESP',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=10,
    status='todo',
    priority='high',
    assignee='CC2',
    branch='epic-D-email-webhook',
    epic='Epic D: Email & Webhook',
    task_order=410
)
```

### D-03: Mailgun One-Time Lead Magnet Delivery
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='D-03: Mailgun One-Time Lead Magnet Delivery',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=5,
    status='todo',
    priority='high',
    assignee='CC3',
    branch='epic-D-email-webhook',
    epic='Epic D: Email & Webhook',
    task_order=420
)
```

---

## Epic E: Engagement Pods

### E-01: Pod Infrastructure & Database
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='E-01: Pod Infrastructure & Database',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=5,
    status='todo',
    priority='medium',
    assignee='CC1',
    branch='epic-E-engagement-pods',
    epic='Epic E: Engagement Pods',
    task_order=500
)
```

### E-02: LinkedIn Session Capture for Pod Members
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='E-02: LinkedIn Session Capture for Pod Members',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=5,
    status='todo',
    priority='medium',
    assignee='CC2',
    branch='epic-E-engagement-pods',
    epic='Epic E: Engagement Pods',
    task_order=510
)
```

### E-03: Pod Post Detection System
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='E-03: Pod Post Detection System',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=5,
    status='todo',
    priority='medium',
    assignee='CC3',
    branch='epic-E-engagement-pods',
    epic='Epic E: Engagement Pods',
    task_order=520
)
```

### E-04: Pod Automation Engine
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='E-04: Pod Automation Engine',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=5,
    status='todo',
    priority='medium',
    assignee='CC1',
    branch='epic-E-engagement-pods',
    epic='Epic E: Engagement Pods',
    task_order=530
)
```

---

## Epic F: AI Integration

### F-01: AgentKit Campaign Orchestration
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='F-01: AgentKit Campaign Orchestration',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=5,
    status='todo',
    priority='low',
    assignee='CC2',
    branch='epic-F-ai-integration',
    epic='Epic F: AI Integration',
    task_order=600
)
```

### F-02: Mem0 Memory System Integration
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='F-02: Mem0 Memory System Integration',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=5,
    status='todo',
    priority='low',
    assignee='CC3',
    branch='epic-F-ai-integration',
    epic='Epic F: AI Integration',
    task_order=610
)
```

---

## Epic G: Monitoring & Testing

### G-01: Real-time Monitoring Dashboard
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='G-01: Real-time Monitoring Dashboard',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=3,
    status='todo',
    priority='medium',
    assignee='CC1',
    branch='epic-G-monitoring-testing',
    epic='Epic G: Monitoring & Testing',
    task_order=700
)
```

### G-02: End-to-End Testing Suite
```
manage_task(
    action='create',
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    title='G-02: End-to-End Testing Suite',
    description='[See COMPLETE-TASK-STRUCTURE.md for full description]',
    story_points=5,
    status='todo',
    priority='medium',
    assignee='CC2',
    branch='epic-G-monitoring-testing',
    epic='Epic G: Monitoring & Testing',
    task_order=710
)
```

---

## Verification Commands

### Check All Tasks Created
```
find_tasks(
    project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531',
    filter_by='status',
    filter_value='todo'
)
```

### Count Tasks by Epic
```
# Epic A
find_tasks(project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531', filter_by='epic', filter_value='Epic A: Bolt.new Scaffold')

# Epic B
find_tasks(project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531', filter_by='epic', filter_value='Epic B: Cartridge System')

# Epic C
find_tasks(project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531', filter_by='epic', filter_value='Epic C: Unipile & BullMQ')

# Epic D
find_tasks(project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531', filter_by='epic', filter_value='Epic D: Email & Webhook')

# Epic E
find_tasks(project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531', filter_by='epic', filter_value='Epic E: Engagement Pods')

# Epic F
find_tasks(project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531', filter_by='epic', filter_value='Epic F: AI Integration')

# Epic G
find_tasks(project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531', filter_by='epic', filter_value='Epic G: Monitoring & Testing')
```

### Check Task by Assignee
```
# User tasks
find_tasks(project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531', filter_by='assignee', filter_value='User')

# CC1 tasks
find_tasks(project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531', filter_by='assignee', filter_value='CC1')

# CC2 tasks
find_tasks(project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531', filter_by='assignee', filter_value='CC2')

# CC3 tasks
find_tasks(project_id='de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531', filter_by='assignee', filter_value='CC3')
```

---

## Notes

1. **Full descriptions**: Replace `[See COMPLETE-TASK-STRUCTURE.md for full description]` with actual full descriptions from the COMPLETE-TASK-STRUCTURE.md file.

2. **Task order**: Tasks are ordered by epic (100s, 200s, 300s, etc.) for proper sorting in Kanban view.

3. **Branch strategy**: Each epic has its own branch pattern. All tasks within an epic share the same branch.

4. **Priority levels**:
   - critical: A-01 (foundation)
   - high: B, C, D epics (core functionality)
   - medium: E, G epics (enhancements, testing)
   - low: F epic (AI integration)

5. **Assignee distribution**:
   - User: 1 task (Bolt.new scaffold)
   - CC1: 5 tasks (storage, databases, sessions, pods)
   - CC2: 6 tasks (UI, voice, webhooks, monitoring)
   - CC3: 5 tasks (queues, email, AI, detection)

6. **Story point total**: 116 points across 19 tasks

---

## After Creating All Tasks

1. Verify in Archon UI that all 19 tasks appear
2. Check epic groupings are correct
3. Confirm branches are set properly
4. Verify task order is sequential
5. Upload this document to Archon using manage_document()
6. Start with A-01 (mark as 'doing' when ready)
