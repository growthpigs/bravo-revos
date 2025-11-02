#!/bin/bash

# Archon MCP Server Startup Script
# Project: Bravo revOS
#
# This script connects this project to Archon's MCP server.
# It does NOT require the project to have its own MCP server.

# Navigate to project root
cd "$(dirname "$0")/.."

# Load environment variables if .env exists
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

# Export project metadata for MCP server
export PROJECT_NAME="Bravo revOS"
export PROJECT_PATH="$(pwd)"

# Connect to Archon's central MCP server
# This allows Archon to manage tasks, documents, and operations for this project
echo "🔗 Connecting 'Bravo revOS' to Archon MCP Server..."

# Path to Archon's MCP server (adjust if your Archon installation is elsewhere)
ARCHON_ROOT="/Users/rodericandrews/Obsidian/Master/_archon"

if [ -d "$ARCHON_ROOT/python" ]; then
    cd "$ARCHON_ROOT/python"

    # Start Archon MCP server with project context
    echo "✓ Project: $PROJECT_NAME"
    echo "✓ Path: $PROJECT_PATH"
    uv run python -m src.mcp_server.mcp_server
else
    echo "❌ Error: Archon MCP server not found at $ARCHON_ROOT"
    echo "   Please check your Archon installation path."
    exit 1
fi
