#!/usr/bin/env python3
"""Upload missing documents to Archon - critical per CLAUDE.md rules"""

import os
import uuid
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('/Users/rodericandrews/Obsidian/Master/_agro-archon/agro-archon/python/.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
PROJECT_ID = "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531"  # Bravo revOS

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_document(title, content, document_type="note"):
    """Upload a document to Archon document_versions table"""

    doc_id = str(uuid.uuid4())

    # Create document version (this is the table that exists)
    doc_data = {
        "id": str(uuid.uuid4()),
        "document_id": doc_id,
        "project_id": PROJECT_ID,
        "title": title,
        "content": content,
        "version": 1,
        "created_at": datetime.utcnow().isoformat(),
        "created_by": "Claude (CC1)",
        "document_type": document_type
    }

    try:
        result = supabase.table("archon_document_versions").insert(doc_data).execute()
        print(f"✅ Uploaded: {title}")
        print(f"   Document ID: {doc_id}")
        return doc_id
    except Exception as e:
        print(f"❌ Failed to upload {title}: {e}")
        return None

print("=" * 80)
print("UPLOADING MISSING DOCUMENTS TO ARCHON")
print("=" * 80)
print(f"Project: Bravo revOS ({PROJECT_ID})\n")

# Read and upload EXPERT-FINAL-TASK-REVIEW
print("1. Uploading Expert Final Task Review...")
try:
    with open("EXPERT-FINAL-TASK-REVIEW-2025-11-04.md", "r") as f:
        content = f.read()

    doc_id = upload_document(
        title="Expert Final Task Review - November 4, 2025",
        content=content,
        document_type="note"
    )
except Exception as e:
    print(f"   Error reading file: {e}")

# Read and upload SITREP-clean-slate
print("\n2. Uploading Clean Slate SITREP...")
try:
    with open("SITREP-clean-slate-2025-11-04.md", "r") as f:
        content = f.read()

    doc_id = upload_document(
        title="SITREP: Clean Slate Task Reconstruction - November 4, 2025",
        content=content,
        document_type="note"
    )
except Exception as e:
    print(f"   Error reading file: {e}")

# Read and upload CONTEXT-FIRST-STANDARDIZATION if it exists
print("\n3. Uploading Context-First Standardization...")
try:
    with open("CONTEXT-FIRST-STANDARDIZATION-2025-11-04.md", "r") as f:
        content = f.read()

    doc_id = upload_document(
        title="Context-First Standardization Across All Archon Projects",
        content=content,
        document_type="spec"
    )
except FileNotFoundError:
    print("   File not found in current directory")
except Exception as e:
    print(f"   Error: {e}")

print("\n" + "=" * 80)

# Verify uploads
result = supabase.table("archon_document_versions").select("title, created_at").eq('project_id', PROJECT_ID).order('created_at', desc=True).limit(5).execute()

print("Recent documents in Bravo revOS project:")
for doc in result.data:
    print(f"  - {doc['title']}")
    print(f"    Created: {doc['created_at']}")

print("\n✅ Documents uploaded to Archon as required by CLAUDE.md!")
print("   Users can now view them in the Archon UI.")