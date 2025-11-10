# Archon Document Upload Instructions

## 📋 Documents Created (Ready for Upload)

Three key documents have been created and need to be uploaded to Archon:

1. **LEAD_MAGNET_LIBRARY_TAB_IMPLEMENTATION.md** - Complete technical spec for CC2
2. **CC2_QUICK_START_LIBRARY_TAB.md** - Quick reference guide for CC2
3. **DUAL_TRACK_COORDINATION_PLAN.md** - Master coordination document

---

## 🚀 How to Upload (In Claude Desktop with MCP)

### Step 1: Start Archon MCP Server (if not running)

```bash
cd /Users/rodericandrews/Obsidian/Master/_agro-archon/agro-archon/python
bash .archon/start.sh
```

### Step 2: Open Claude Desktop

Make sure you're in Claude Desktop (not claude.ai web)

### Step 3: Upload Each Document

```javascript
// Document 1: Implementation Plan
manage_document("upload",
  file_path="docs/projects/bravo-revos/LEAD_MAGNET_LIBRARY_TAB_IMPLEMENTATION.md",
  project_id="de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531",
  title="Lead Magnet Library Tab - Implementation Plan",
  category="implementation"
)

// Document 2: Quick Start
manage_document("upload",
  file_path="docs/projects/bravo-revos/CC2_QUICK_START_LIBRARY_TAB.md",
  project_id="de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531",
  title="CC2 Quick Start - Library Tab",
  category="operations"
)

// Document 3: Coordination Plan
manage_document("upload",
  file_path="docs/projects/bravo-revos/DUAL_TRACK_COORDINATION_PLAN.md",
  project_id="de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531",
  title="Dual Track Execution - HGC + Lead Magnets",
  category="planning"
)
```

---

## 📝 Alternative: Manual Upload Script

If MCP has issues, you can use Python directly:

```python
# Save this as upload-coordination-docs.py
import sys
sys.path.append('/Users/rodericandrews/Obsidian/Master/_agro-archon/agro-archon/python/src')

from notion_client import Client

notion = Client(auth=os.getenv("NOTION_TOKEN"))
project_id = "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531"

docs = [
    ("LEAD_MAGNET_LIBRARY_TAB_IMPLEMENTATION.md", "implementation"),
    ("CC2_QUICK_START_LIBRARY_TAB.md", "operations"),
    ("DUAL_TRACK_COORDINATION_PLAN.md", "planning")
]

for filename, category in docs:
    path = f"/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/docs/projects/bravo-revos/{filename}"
    with open(path, 'r') as f:
        content = f.read()
    
    # Upload to Notion (implement your upload logic)
    print(f"Uploading {filename}...")
```

---

## ✅ Verification

After upload, verify in Archon UI:
1. Go to Archon dashboard
2. Select project: "Bravo revOS"
3. Check "Documents" section
4. Confirm all 3 documents appear

---

## 🎯 What Happens Next

### After Documents Uploaded:

1. **CC1** (HGC Chat Integration)
   - Reads `HGC_INTEGRATION_GUIDE_FOR_CC2.md`
   - Builds floating chat bar
   - Tests memory persistence

2. **CC2** (Lead Magnet Library)
   - Reads `CC2_QUICK_START_LIBRARY_TAB.md`
   - Creates API route
   - Builds library tab component

3. **Both Reference**:
   - `DUAL_TRACK_COORDINATION_PLAN.md` for coordination
   - Regular check-ins on progress
   - Flag blockers immediately

---

## 📊 Document Status

| Document | Status | Category | Purpose |
|----------|--------|----------|---------|
| LEAD_MAGNET_LIBRARY_TAB_IMPLEMENTATION.md | ✅ Ready | implementation | Full technical spec |
| CC2_QUICK_START_LIBRARY_TAB.md | ✅ Ready | operations | Quick reference |
| DUAL_TRACK_COORDINATION_PLAN.md | ✅ Ready | planning | Coordination master doc |

---

## 🚨 Critical Notes

1. **Project ID**: `de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531` (Bravo revOS)
2. **All documents** already in git at `docs/projects/bravo-revos/`
3. **Archon upload** makes them accessible via MCP tools
4. **Git is for version control**, Archon is for AI/human access

---

## 🆘 If Upload Fails

### Check 1: MCP Server Running
```bash
lsof -i :8051
# Should show Python process
```

### Check 2: Logs
```bash
tail -f /tmp/archon-mcp.log
```

### Check 3: Manual Workaround
Files are already in git, so they're version controlled. Upload to Archon can be done later if MCP has issues. Priority is getting CC1 and CC2 started.

---

## ✅ Ready to Proceed?

**Next steps**:
1. Upload these 3 documents to Archon (use commands above)
2. Verify they appear in Archon UI
3. CC1 and CC2 can begin work simultaneously
4. Use `DUAL_TRACK_COORDINATION_PLAN.md` for coordination

**Status**: All documentation complete and ready for upload!
