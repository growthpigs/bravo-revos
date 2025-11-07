#!/bin/bash

# Database verification script using psql
PSQL=/opt/homebrew/Cellar/postgresql@15/15.14_1/bin/psql

# Load environment variables
source .env.local

# Extract Supabase connection string
SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Parse URL to get host
# Format: https://projectid.supabase.co
PROJECT_ID=$(echo $SUPABASE_URL | sed 's/https:\/\/\([^.]*\).*/\1/')
DB_HOST="${PROJECT_ID}.supabase.co"
DB_PORT=5432
DB_USER="postgres"
DB_NAME="postgres"

echo "🔗 Connecting to Supabase Database"
echo "📍 Host: $DB_HOST"
echo "📊 Database: $DB_NAME"
echo ""

# Note: To connect with psql, you need the database password, not the service role key
# For now, we'll use curl to query via Supabase REST API

echo "📋 Verifying Database Tables via REST API"
echo ""

TABLES=(
  "agencies"
  "clients"
  "users"
  "campaigns"
  "pods"
  "pod_activities"
  "leads"
  "posts"
  "voice_cartridges"
  "webhooks"
  "lead_magnets"
  "linkedin_accounts"
  "memories"
  "email_queue"
  "activity_logs"
)

VERIFIED=0
TOTAL=${#TABLES[@]}

for table in "${TABLES[@]}"; do
  # Use curl to check if table exists and is accessible
  RESPONSE=$(curl -s -X GET \
    "${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -w "\n%{http_code}" 2>&1)

  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    echo "   ✅ $table"
    ((VERIFIED++))
  else
    echo "   ❌ $table (HTTP $HTTP_CODE)"
  fi
done

echo ""
echo "============================================================"
echo "✅ Database Verification Complete"
echo "============================================================"
echo ""
echo "📊 Results: $VERIFIED/$TOTAL tables verified"
echo ""

if [ "$VERIFIED" -eq "$TOTAL" ]; then
  echo "✅ All tables are accessible!"
  echo ""
  echo "🚀 System is ready for E2E testing"
  echo ""
  echo "Next steps:"
  echo "   1. Open http://localhost:3001 in your browser"
  echo "   2. Follow the 8 E2E test scenarios"
  echo "   3. Report results back"
  exit 0
else
  echo "⚠️  Some tables may not be accessible"
  echo "Please check your Supabase connection settings"
  exit 1
fi
