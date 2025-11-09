#!/usr/bin/env python3
"""Add **Points:** tags to all task descriptions"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('/Users/rodericandrews/Obsidian/Master/_agro-archon/agro-archon/python/.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
PROJECT_ID = "de2e1ce0-3d40-4cbe-80eb-8d0fd14fb531"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Task points mapping (from SITREP + Expert Review)
TASK_POINTS = {
    "A-00: Project Foundation & Context [READ FIRST]": 0,
    "A-01: Bolt.new Full-Stack Scaffold": 15,
    "T001: Supabase Storage Setup": 3,
    "T002: Cartridge Database & API": 8,
    "T003: Voice Auto-Generation from LinkedIn": 7,
    "T004: Cartridge Management UI": 5,
    "T005: Unipile Integration & Session Management": 5,
    "T006: Comment Polling System": 7,
    "T007: BullMQ Rate-Limited DM Queue": 8,
    "T008: Email Extraction from DM Replies": 5,
    "T009: Webhook to Client CRM/ESP": 10,
    "T010: Mailgun One-Time Lead Magnet Delivery": 5,
    "T011: Pod Infrastructure & Database": 5,
    "T012: LinkedIn Session Capture for Pod Members": 5,
    "T013: Pod Post Detection System": 5,
    "T014: Pod Automation Engine": 5,
    "T015: AgentKit Campaign Orchestration": 5,
    "T016: Mem0 Memory System Integration": 5,
    "T017: Real-time Monitoring Dashboard": 3,
    "T018: End-to-End Testing Suite": 5,
}

print("=" * 80)
print("ADDING POINTS TO TASK DESCRIPTIONS")
print("=" * 80)

# Get all tasks
result = supabase.table('archon_tasks').select("*").eq('project_id', PROJECT_ID).execute()

for task in result.data:
    title = task['title']
    points = TASK_POINTS.get(title)

    if points is None:
        print(f"⚠️  Unknown task: {title}")
        continue

    desc = task['description']

    # Skip if already has points
    if '**Points:**' in desc:
        print(f"✓ {title} - already has points")
        continue

    # Add points to end of description
    new_desc = desc.rstrip() + f"\n\n**Points:** {points}"

    # Update task
    supabase.table('archon_tasks').update({
        'description': new_desc
    }).eq('id', task['id']).execute()

    print(f"✅ {title} - added {points} points")

print("\n" + "=" * 80)
print("✅ ALL TASKS UPDATED")
print("=" * 80)

# Verify total
result = supabase.table('archon_tasks').select("*").eq('project_id', PROJECT_ID).execute()
total = sum(TASK_POINTS.get(t['title'], 0) for t in result.data)
print(f"\nTotal Story Points: {total}")
