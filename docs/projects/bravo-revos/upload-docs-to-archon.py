#!/usr/bin/env python3
"""
Upload Bravo revOS documents to Archon with correct document_type for proper tab placement
"""

import requests
import json

PROJECT_ID = "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531"
API_URL = "http://localhost:8181"

# Documents to upload to SPECS tab
specs_docs = [
    {
        "file": "spec.md",
        "title": "Bravo revOS - Master Specification",
        "document_type": "spec"
    },
    {
        "file": "data-model.md",
        "title": "Bravo revOS - Data Model",
        "document_type": "spec"
    },
    {
        "file": "quickstart.md",
        "title": "Bravo revOS - Developer Quickstart",
        "document_type": "spec"
    }
]

# Documents to upload to GENERAL tab
general_docs = [
    {
        "file": "SKILLS-AND-VOICE-INTEGRATION.md",
        "title": "Skills and Voice Integration",
        "document_type": "note"
    },
    {
        "file": "WEBHOOK-SETTINGS-UI.md",
        "title": "Webhook Settings UI Specification",
        "document_type": "note"
    },
    {
        "file": "THREE-STEP-DM-SEQUENCE.md",
        "title": "Three-Step DM Sequence",
        "document_type": "note"
    },
    {
        "file": "COMPREHENSIVE-LEAD-FLOW.md",
        "title": "Comprehensive Lead Flow",
        "document_type": "note"
    },
    {
        "file": "CORRECTED-TASKS-FINAL.md",
        "title": "Corrected Tasks - Final",
        "document_type": "note"
    },
    {
        "file": "SESSION-SUMMARY-2025-11-03-FINAL.md",
        "title": "Session Summary - Nov 3, 2025",
        "document_type": "note"
    }
]

def upload_document(file_path, title, document_type):
    """Upload a document to Archon"""
    try:
        # Read file content
        with open(file_path, 'r') as f:
            content = f.read()

        # Prepare payload
        payload = {
            "title": title,
            "document_type": document_type,
            "content": {
                "full_content": content,
                "summary": f"{document_type.upper()}: {title}"
            },
            "author": "Claude"
        }

        # Upload via HTTP API
        response = requests.post(
            f"{API_URL}/projects/{PROJECT_ID}/documents",
            json=payload,
            timeout=30
        )

        if response.status_code == 201:
            return True, "Success"
        else:
            return False, f"Status {response.status_code}: {response.text}"

    except Exception as e:
        return False, str(e)

def main():
    print("🚀 Uploading Bravo revOS documents to Archon...")
    print(f"   Project ID: {PROJECT_ID}\n")

    # Upload specs documents
    print("📋 Uploading to SPECS tab:")
    specs_success = 0
    for doc in specs_docs:
        file_path = f"/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/docs/projects/bravo-revos/{doc['file']}"
        success, message = upload_document(file_path, doc['title'], doc['document_type'])

        if success:
            print(f"   ✓ {doc['title']}")
            specs_success += 1
        else:
            print(f"   ✗ {doc['title']}: {message}")

    print(f"\n   Uploaded {specs_success}/{len(specs_docs)} spec documents\n")

    # Upload general documents
    print("📁 Uploading to GENERAL tab:")
    general_success = 0
    for doc in general_docs:
        file_path = f"/Users/rodericandrews/Obsidian/Master/_projects/bravo-revos/docs/projects/bravo-revos/{doc['file']}"
        success, message = upload_document(file_path, doc['title'], doc['document_type'])

        if success:
            print(f"   ✓ {doc['title']}")
            general_success += 1
        else:
            print(f"   ✗ {doc['title']}: {message}")

    print(f"\n   Uploaded {general_success}/{len(general_docs)} general documents\n")

    # Summary
    total_success = specs_success + general_success
    total_docs = len(specs_docs) + len(general_docs)

    print("=" * 50)
    print(f"✅ Upload complete: {total_success}/{total_docs} documents uploaded")
    print(f"   - Specs tab: {specs_success} documents")
    print(f"   - General tab: {general_success} documents")
    print("=" * 50)

if __name__ == "__main__":
    main()
