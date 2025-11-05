#!/usr/bin/env python3
"""
Upload Bravo revOS documents to Archon project docs array
"""

from supabase import create_client, Client
from datetime import datetime
import uuid
import os

# Supabase credentials
SUPABASE_URL = "https://kvjcidxbyimoswntpjcp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2amNpZHhieWltb3N3bnRwamNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTEyMzc0MywiZXhwIjoyMDc2Njk5NzQzfQ.3y85fEIn6icsDTFUKPRlaDqedBCL7Mu0hKTIUNfhLW8"
PROJECT_ID = "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Documents to upload
documents_to_upload = [
    # SPECS tab documents
    {
        "file": "spec.md",
        "title": "Bravo revOS - Master Specification",
        "document_type": "spec",
        "tags": ["specification", "architecture", "mvp", "bravo-revos"]
    },
    {
        "file": "data-model.md",
        "title": "Bravo revOS - Data Model",
        "document_type": "spec",
        "tags": ["database", "schema", "data-model", "bravo-revos"]
    },
    {
        "file": "quickstart.md",
        "title": "Bravo revOS - Developer Quickstart",
        "document_type": "spec",
        "tags": ["quickstart", "setup", "developer-guide", "bravo-revos"]
    },

    # GENERAL tab documents
    {
        "file": "SKILLS-AND-VOICE-INTEGRATION.md",
        "title": "Skills and Voice Integration",
        "document_type": "note",
        "tags": ["skills", "voice-cartridge", "ai", "bravo-revos"]
    },
    {
        "file": "WEBHOOK-SETTINGS-UI.md",
        "title": "Webhook Settings UI Specification",
        "document_type": "note",
        "tags": ["webhook", "ui", "esp-integration", "bravo-revos"]
    },
    {
        "file": "THREE-STEP-DM-SEQUENCE.md",
        "title": "Three-Step DM Sequence",
        "document_type": "note",
        "tags": ["dm", "automation", "lead-flow", "bravo-revos"]
    },
    {
        "file": "COMPREHENSIVE-LEAD-FLOW.md",
        "title": "Comprehensive Lead Flow",
        "document_type": "note",
        "tags": ["lead-flow", "automation", "process", "bravo-revos"]
    },
    {
        "file": "CORRECTED-TASKS-FINAL.md",
        "title": "Corrected Tasks - Final",
        "document_type": "note",
        "tags": ["tasks", "implementation", "roadmap", "bravo-revos"]
    },
    {
        "file": "SESSION-SUMMARY-2025-11-03-FINAL.md",
        "title": "Session Summary - Nov 3, 2025",
        "document_type": "note",
        "tags": ["session", "summary", "corrections", "bravo-revos"]
    }
]

def create_document_object(file_path, doc_info):
    """Create a properly formatted document object"""
    try:
        # Read file content
        if not os.path.exists(file_path):
            return None, f"File not found: {file_path}"

        with open(file_path, 'r') as f:
            content = f.read()

        # Create document in correct format
        doc = {
            "id": str(uuid.uuid4()),
            "tags": doc_info["tags"],
            "title": doc_info["title"],
            "author": "Claude",
            "status": "draft",
            "content": {
                "markdown": content
            },
            "version": "1.0",
            "updated_at": datetime.utcnow().isoformat(),
            "document_type": doc_info["document_type"]
        }

        return doc, None

    except Exception as e:
        return None, str(e)

def main():
    print("🚀 Uploading Bravo revOS documents to Archon...")
    print(f"   Project ID: {PROJECT_ID}\n")

    # Step 1: Get current project docs
    print("📥 Fetching current project...")
    project = supabase.table("archon_projects").select("*").eq("id", PROJECT_ID).single().execute()
    current_docs = project.data.get('docs', [])
    print(f"   Current documents: {len(current_docs)}")

    # Step 2: Create new document objects
    print("\n📄 Creating new document objects...")
    new_docs = []
    specs_count = 0
    general_count = 0

    for doc_info in documents_to_upload:
        file_path = doc_info["file"]
        doc, error = create_document_object(file_path, doc_info)

        if doc:
            new_docs.append(doc)
            if doc["document_type"] == "spec":
                specs_count += 1
                print(f"   ✓ [SPEC] {doc['title']}")
            else:
                general_count += 1
                print(f"   ✓ [NOTE] {doc['title']}")
        else:
            print(f"   ✗ {doc_info['title']}: {error}")

    print(f"\n   Created {len(new_docs)} new documents ({specs_count} specs, {general_count} notes)")

    # Step 3: Append to existing docs
    print("\n📤 Appending to project docs array...")
    updated_docs = current_docs + new_docs

    # Step 4: Update project
    result = supabase.table("archon_projects").update({"docs": updated_docs}).eq("id", PROJECT_ID).execute()

    if result.data:
        print(f"   ✓ Successfully updated project")

        # Step 5: Verify
        print("\n🔍 Verifying update...")
        verify = supabase.table("archon_projects").select("docs").eq("id", PROJECT_ID).single().execute()
        total_docs = len(verify.data.get('docs', []))

        print(f"   Total documents now: {total_docs}")
        print(f"   Added: {len(new_docs)} new documents")

        # Count by type
        specs = sum(1 for d in verify.data['docs'] if d.get('document_type') == 'spec')
        notes = sum(1 for d in verify.data['docs'] if d.get('document_type') == 'note')
        guides = sum(1 for d in verify.data['docs'] if d.get('document_type') == 'guide')

        print(f"\n📊 Document breakdown:")
        print(f"   - Specs: {specs}")
        print(f"   - Notes: {notes}")
        print(f"   - Guides: {guides}")

        # Show newly added bravo-revos docs
        print(f"\n📁 Bravo revOS documents:")
        bravo_docs = [d for d in verify.data['docs'] if 'bravo-revos' in d.get('tags', [])]
        print(f"   Total: {len(bravo_docs)}")
        for doc in bravo_docs:
            print(f"   - [{doc.get('document_type', '?')}] {doc.get('title', 'Untitled')}")

        print("\n" + "=" * 50)
        print("✅ Upload complete!")
        print("=" * 50)
        print("\n💡 View in Archon UI at: http://localhost:5173")
        print("   Documents should appear in Specs and General tabs")

    else:
        print("   ❌ Failed to update project")

if __name__ == "__main__":
    main()
