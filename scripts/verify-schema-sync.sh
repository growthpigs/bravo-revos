#!/bin/bash
# Database Schema Sync - Verification Script
# Run before and after migration to verify success

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "🔬 DATABASE SCHEMA SYNC - VERIFICATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Load env
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

SUPABASE_URL="https://ebxshdqfaqupnvpghodi.supabase.co"
ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "PASS" ]; then
    echo -e "  ${GREEN}✓${NC} $name"
    ((PASS++))
  else
    echo -e "  ${RED}✗${NC} $name"
    ((FAIL++))
  fi
}

# ─────────────────────────────────────────────────────────────────
echo "📡 1. SUPABASE CONNECTIVITY"
echo ""

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" -H "apikey: $ANON_KEY")
[ "$STATUS" = "200" ] && check "Supabase API accessible" "PASS" || check "Supabase API accessible" "FAIL"

# ─────────────────────────────────────────────────────────────────
echo ""
echo "📊 2. CRITICAL TABLES EXIST"
echo ""

CRITICAL_TABLES="agency client user campaign post lead linkedin_account webhook_config workflow"

for TABLE in $CRITICAL_TABLES; do
  RESPONSE=$(curl -s "$SUPABASE_URL/rest/v1/$TABLE?limit=1" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY")
  if echo "$RESPONSE" | grep -q "relation.*does not exist"; then
    check "Table: $TABLE" "FAIL"
  else
    check "Table: $TABLE" "PASS"
  fi
done

# ─────────────────────────────────────────────────────────────────
echo ""
echo "🔍 3. CODE REFERENCES CHECK"
echo ""

# Check for plural refs that should be singular
PLURAL_REFS=$(grep -rh "\.from(" --include="*.ts" --include="*.tsx" lib/ app/ 2>/dev/null | grep -E "from\(['\"]campaigns['\"]|from\(['\"]users['\"]|from\(['\"]posts['\"]\)" | wc -l | tr -d ' ')
[ "$PLURAL_REFS" = "0" ] && check "No plural table refs (campaigns/users/posts)" "PASS" || check "No plural table refs ($PLURAL_REFS found)" "FAIL"

# ─────────────────────────────────────────────────────────────────
echo ""
echo "🏗️ 4. BUILD & TYPECHECK"
echo ""

npm run typecheck 2>/dev/null && check "TypeScript passes" "PASS" || check "TypeScript passes" "FAIL"

# ─────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📋 SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "  Passed: ${GREEN}$PASS${NC}"
echo -e "  Failed: ${RED}$FAIL${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}✓ ALL CHECKS PASSED${NC}"
  exit 0
else
  echo -e "  ${RED}✗ SOME CHECKS FAILED${NC}"
  exit 1
fi
