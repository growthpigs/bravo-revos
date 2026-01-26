#!/usr/bin/env python3
"""
Upload all Bravo revOS documents to Archon database
"""

from supabase import create_client, Client
from datetime import datetime
import os

# Supabase credentials
SUPABASE_URL = "https://kvjcidxbyimoswntpjcp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2amNpZHhieWltb3N3bnRwamNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTEyMzc0MywiZXhwIjoyMDc2Njk5NzQzfQ.3y85fEIn6icsDTFUKPRlaDqedBCL7Mu0hKTIUNfhLW8"
PROJECT_ID = "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Documents to upload
documents = [
    # SPECS tab documents
    {
        "file": "spec.md",
        "title": "Bravo revOS - Master Specification",
        "document_type": "spec",
        "tags": ["specification", "architecture", "mvp"]
    },
    {
        "file": "data-model.md",
        "title": "Bravo revOS - Data Model",
        "document_type": "spec",
        "tags": ["database", "schema", "data-model"]
    },
    {
        "file": "quickstart.md",
        "title": "Bravo revOS - Developer Quickstart",
        "document_type": "spec",
        "tags": ["quickstart", "setup", "developer-guide"]
    },

    # GENERAL tab documents
    {
        "file": "SKILLS-AND-VOICE-INTEGRATION.md",
        "title": "Skills and Voice Integration",
        "document_type": "note",
        "tags": ["skills", "voice-cartridge", "ai"]
    },
    {
        "file": "WEBHOOK-SETTINGS-UI.md",
        "title": "Webhook Settings UI Specification",
        "document_type": "note",
        "tags": ["webhook", "ui", "esp-integration"]
    },
    {
        "file": "THREE-STEP-DM-SEQUENCE.md",
        "title": "Three-Step DM Sequence",
        "document_type": "note",
        "tags": ["dm", "automation", "lead-flow"]
    },
    {
        "file": "COMPREHENSIVE-LEAD-FLOW.md",
        "title": "Comprehensive Lead Flow",
        "document_type": "note",
        "tags": ["lead-flow", "automation", "process"]
    },
    {
        "file": "CORRECTED-TASKS-FINAL.md",
        "title": "Corrected Tasks - Final",
        "document_type": "note",
        "tags": ["tasks", "implementation", "roadmap"]
    },
    {
        "file": "SESSION-SUMMARY-2025-11-03-FINAL.md",
        "title": "Session Summary - Nov 3, 2025",
        "document_type": "note",
        "tags": ["session", "summary", "corrections"]
    }
]

def upload_document(doc_info):
    """Upload a single document to Archon"""
    try:
        # Read file content
        file_path = doc_info["file"]
        if not os.path.exists(file_path):
            return False, f"File not found: {file_path}"

        with open(file_path, 'r') as f:
            content = f.read()

        # Create document record
        doc_data = {
            "project_id": PROJECT_ID,
            "title": doc_info["title"],
            "document_type": doc_info["document_type"],
            "content": {
                "full_content": content,
                "summary": f"{doc_info['document_type'].upper()}: {doc_info['title']}"
            },
            "author": "Claude",
            "tags": doc_info["tags"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        # Insert into database
        result = supabase.table("archon_documents").insert(doc_data).execute()

        if result.data:
            return True, result.data[0]['id']
        else:
            return False, "No data returned"

    except Exception as e:
        return False, str(e)

def main():
    print("🚀 Uploading Bravo revOS documents to Archon...")
    print(f"   Project ID: {PROJECT_ID}\n")

    # Track statistics
    specs_success = 0
    general_success = 0
    specs_total = sum(1 for d in documents if d["document_type"] == "spec")
    general_total = sum(1 for d in documents if d["document_type"] == "note")

    # Upload specs documents
    print("📋 Uploading to SPECS tab:")
    for doc in [d for d in documents if d["document_type"] == "spec"]:
        success, result = upload_document(doc)
        if success:
            print(f"   ✓ {doc['title']} (ID: {result[:8]}...)")
            specs_success += 1
        else:
            print(f"   ✗ {doc['title']}: {result}")

    print(f"\n   Uploaded {specs_success}/{specs_total} spec documents\n")

    # Upload general documents
    print("📁 Uploading to GENERAL tab:")
    for doc in [d for d in documents if d["document_type"] == "note"]:
        success, result = upload_document(doc)
        if success:
            print(f"   ✓ {doc['title']} (ID: {result[:8]}...)")
            general_success += 1
        else:
            print(f"   ✗ {doc['title']}: {result}")

    print(f"\n   Uploaded {general_success}/{general_total} general documents\n")

    # Summary
    total_success = specs_success + general_success
    total_docs = len(documents)

    print("=" * 50)
    print(f"✅ Upload complete: {total_success}/{total_docs} documents uploaded")
    print(f"   - Specs tab: {specs_success} documents")
    print(f"   - General tab: {general_success} documents")
    print("=" * 50)

    # Query to verify
    print("\n🔍 Verifying documents in database...")
    result = supabase.table("archon_documents").select("title, document_type").eq("project_id", PROJECT_ID).execute()
    if result.data:
        print(f"   Total documents in database: {len(result.data)}")
        for doc in result.data:
            print(f"   - [{doc['document_type']}] {doc['title']}")

if __name__ == "__main__":
    main()
