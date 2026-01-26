# Archon MCP Setup for Claude Code

## Current Status

✅ **Archon MCP Server is RUNNING**
- Process ID: 77651 (started 2025-11-17 07:32 AM)
- Port: 8051
- URL: `http://localhost:8051/mcp`
- Logs: `/tmp/archon-mcp.log`

❌ **Claude Code NOT CONNECTED**
- Archon MCP tools not available in current session
- Need to add MCP configuration and restart Claude Code

---

## How to Connect Archon MCP

### Option 1: Add to Claude Code MCP Config (Recommended)

**Location:** `/Users/rodericandrews/.claude/mcp_config.json` (or similar)

Add this to your MCP servers configuration:

```json
{
  "mcpServers": {
    "archon": {
      "command": "npx",
      "args": ["-y", "node", "-e", "require('http').request('http://localhost:8051/mcp').end()"],
      "transport": "http",
      "url": "http://localhost:8051/mcp"
    }
  }
}
```

**OR if HTTP transport is directly supported:**

```json
{
  "mcpServers": {
    "archon": {
      "transport": "http",
      "url": "http://localhost:8051/mcp"
    }
  }
}
```

### Option 2: Manual Connection (If Supported)

In Claude Code, run:
```bash
/mcp connect archon http://localhost:8051/mcp
```

---

## After Adding Configuration

1. **Restart Claude Code completely**
   - Close all sessions
   - Restart the application
   - Navigate back to bravo-revos project

2. **Verify Connection**
   - Run: `claude mcp list`
   - Should show: `archon: http://localhost:8051/mcp (HTTP) - ✓ Connected`

3. **Test Archon Tools**
   ```javascript
   // Should now work:
   mcp__archon__find_projects({ project_id: "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531" })
   mcp__archon__find_tasks({ filter_by: "status", filter_value: "todo" })
   mcp__archon__manage_task({ action: "create", ... })
   ```

---

## Available Archon MCP Tools

Once connected, these tools will be available:

### Project Management
- `mcp__archon__find_projects` - Search/get projects
- `mcp__archon__manage_project` - Create/update/delete projects

### Task Management
- `mcp__archon__find_tasks` - Search/filter tasks
- `mcp__archon__manage_task` - Create/update/delete tasks

### Document Management
- `mcp__archon__find_documents` - Search documents
- `mcp__archon__manage_document` - Create/update documents
- `mcp__archon__validate_document_sync` - Verify sync

### RAG Knowledge Base
- `mcp__archon__rag_get_available_sources` - List knowledge sources
- `mcp__archon__rag_search_knowledge_base` - Search docs
- `mcp__archon__rag_search_code_examples` - Find code examples

### Other Tools
- `mcp__archon__health_check` - Check MCP server health
- `mcp__archon__session_info` - Get session information

---

## Troubleshooting

### MCP Server Not Running

Check if server is running:
```bash
lsof -ti:8051
```

If not running, start it:
```bash
cd /Users/rodericandrews/Obsidian/Master/_agro-archon/agro-archon
./start_mcp.sh > /tmp/archon-mcp.log 2>&1 &
```

### Connection Fails

1. **Check server logs:**
   ```bash
   tail -f /tmp/archon-mcp.log
   ```

2. **Verify backend API is running:**
   ```bash
   curl http://localhost:8181/health
   ```

3. **Check firewall/network:**
   ```bash
   curl http://localhost:8051/health
   ```

### Tools Not Appearing

1. Restart Claude Code completely (close and reopen)
2. Check MCP config is valid JSON
3. Verify URL is correct: `http://localhost:8051/mcp`
4. Check logs for connection errors

---

## Next Steps After Connection

Once Archon MCP is connected:

1. **Verify Project Access**
   ```javascript
   mcp__archon__find_projects({
     project_id: "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531"
   })
   ```

2. **Create ChatKit Integration Tasks**
   - Use `TASK_BREAKDOWN.md` as source
   - Create 11 tasks with `manage_task("create", ...)`
   - Set proper dependencies and priorities
   - Assign to appropriate team members

3. **Upload Knowledge Documents**
   - Upload `REVOS_AGENTKIT_COMPLETE_GUIDE_CORRECTED.md`
   - Upload `TASK_BREAKDOWN.md`
   - Tag with: "agentkit", "chatkit", "specification"

4. **Begin Implementation**
   - Start with Task 1 (Manual Setup)
   - Follow task order from TASK_BREAKDOWN.md
   - Update Archon status as you progress

---

## Server Management

### Check Server Status
```bash
lsof -ti:8051 && echo "✅ MCP server running" || echo "❌ MCP server not running"
```

### View Logs
```bash
tail -f /tmp/archon-mcp.log
```

### Stop Server
```bash
lsof -ti:8051 | xargs kill
```

### Restart Server
```bash
lsof -ti:8051 | xargs kill
cd /Users/rodericandrews/Obsidian/Master/_agro-archon/agro-archon
./start_mcp.sh > /tmp/archon-mcp.log 2>&1 &
```

---

## Project Information

**Project ID:** de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531
**Project Name:** bravo-revos
**Archon UI:** http://localhost:3737/projects/de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531

**Supabase Project:** trdoainmejxanrownbuz
**Repository:** growthpigs/bravo-revos
**Branch:** main (will create `feat/chatkit-integration`)

---

**Last Updated:** 2025-11-17
**MCP Server Status:** ✅ Running (PID 77651)
**Claude Code Status:** ❌ Not connected (need to restart)
