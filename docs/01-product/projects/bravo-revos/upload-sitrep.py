#!/usr/bin/env python3
"""Upload SITREP to Archon documents via HTTP API"""

import requests
import json

PROJECT_ID = 'de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531'
API_URL = "http://localhost:8181"

# Read SITREP
with open('SITREP-task-correction-2025-11-03.md', 'r') as f:
    content = f.read()

# Upload to Archon via HTTP API
doc_data = {
    "title": "SITREP: Task Correction 2025-11-03",
    "document_type": "note",
    "content": {
        "summary": "Fixed Archon MCP server, deleted 52 incorrect tasks, created 16 corrected tasks (100 points) with accurate tech stack (Unipile API, NO Playwright in MVP)",
        "full_content": content,
        "key_achievements": [
            "✅ Archon MCP server restored and running (PID 36318)",
            "✅ 52 incorrect tasks deleted from Supabase",
            "✅ 16 corrected tasks created (100 points, 7 sessions)",
            "✅ Accurate tech stack: Unipile API (NOT Playwright in MVP)",
            "✅ All missing features included (pods, Mailgun, webhooks)"
        ]
    },
    "tags": ["sitrep", "task-correction", "session-2025-11-03"],
    "author": "Claude (CC1)"
}

response = requests.post(f"{API_URL}/projects/{PROJECT_ID}/documents", json=doc_data)

if response.status_code == 201:
    result = response.json()
    print(f"✓ SITREP uploaded to Archon")
    print(f"  Document ID: {result['id']}")
    print(f"  Title: {result['title']}")
else:
    print(f"❌ Upload failed: {response.status_code}")
    print(f"  Response: {response.text}")
