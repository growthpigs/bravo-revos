#!/usr/bin/env python3
"""
Upload the 3 core documents to Archon for Bravo revOS
"""
import requests

PROJECT_ID = "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531"
API_BASE = "http://localhost:8181/api"

# Read the three key documents
docs = [
    {
        "file": "spec.md",
        "title": "Bravo revOS - Master Specification",
        "type": "spec",
        "tags": ["specification", "architecture", "mvp", "core", "linkedin", "lead-generation"]
    },
    {
        "file": "data-model.md",
        "title": "Bravo revOS - Data Model Specification",
        "type": "spec",
        "tags": ["database", "schema", "data-model", "supabase", "postgresql", "rls"]
    },
    {
        "file": "quickstart.md",
        "title": "Bravo revOS - Developer Quick Start Guide",
        "type": "guide",
        "tags": ["quickstart", "setup", "developer", "onboarding", "guide"]
    }
]

print("📤 Uploading 3 core documents to Archon...")
print()

for doc in docs:
    # Read file content
    with open(doc["file"], 'r') as f:
        content = f.read()

    payload = {
        "document_type": doc["type"],
        "title": doc["title"],
        "content": {
            "markdown": content,
            "summary": f"{doc['title']} - Core documentation for Bravo revOS project"
        },
        "tags": doc["tags"],
        "author": "Claude"
    }

    try:
        response = requests.post(
            f"{API_BASE}/projects/{PROJECT_ID}/docs",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        if response.status_code in [200, 201]:
            result = response.json()
            doc_id = result.get("document", {}).get("id", "unknown")
            print(f"✅ {doc['title']}")
            print(f"   ID: {doc_id[:8] if len(doc_id) > 8 else doc_id}...")
            print(f"   Type: {doc['type']}")
            print(f"   Size: {len(content)} chars")
            print()
        else:
            print(f"❌ Failed: {doc['title']}")
            print(f"   Error: {response.status_code} - {response.text[:500]}")
            print()
    except Exception as e:
        print(f"❌ Failed: {doc['title']}")
        print(f"   Error: {str(e)}")
        print()

print("✅ Upload complete! Check Archon UI at:")
print(f"   http://localhost:3737/projects/{PROJECT_ID}")
