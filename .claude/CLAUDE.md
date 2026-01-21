# RevOS - Claude Code Project Config

**Primary docs:** See `/CLAUDE.md` at project root for full context.

This file contains Claude Code-specific overrides and supplementary configuration.

---

## MCP Servers

Project MCP config in `.mcp.json`:
- Archon (enabled in settings.local.json)

---

## Workspace Settings

- Use `@openai/agents` - never raw OpenAI SDK
- Health check before any completion claim: `GET /api/health`
- Active API route: `/api/hgc-v2` (V3 deprecated)
