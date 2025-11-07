#!/bin/bash

# Apply RLS Migration 009 to Supabase
# This script requires: supabase CLI installed and authenticated

echo "🔒 Applying RLS Policies Migration (009)..."
echo ""

# Set Supabase project ID
PROJECT_ID="kvjcidxbyimoswntpjcp"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Apply the migration
echo "📋 Executing migration 009_add_rls_policies_all_tables.sql..."
echo ""

supabase db push --project-id $PROJECT_ID supabase/migrations/009_add_rls_policies_all_tables.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ RLS Policies Applied Successfully!"
    echo ""
    echo "You can verify in Supabase:"
    echo "→ https://supabase.com/dashboard/project/$PROJECT_ID/auth/policies"
else
    echo ""
    echo "❌ Error applying migration. Check your Supabase credentials."
    exit 1
fi
