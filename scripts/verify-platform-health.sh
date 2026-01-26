#!/bin/bash
# Platform Stabilization - Pre-Implementation Verification Script
# Epic: Phase 2.1-2.3
# Date: 2026-01-26

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "🔬 PLATFORM STABILIZATION - VERIFICATION SCRIPT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "PASS" ]; then
    echo -e "  ${GREEN}✓${NC} $name"
    ((PASS_COUNT++))
  else
    echo -e "  ${RED}✗${NC} $name"
    ((FAIL_COUNT++))
  fi
}

# ─────────────────────────────────────────────────────────────────
echo "📡 1. EXTERNAL DEPENDENCIES"
echo ""

# Check production health
echo "  Checking production health endpoint..."
HEALTH=$(curl -s "https://bravo-revos.vercel.app/api/health" 2>/dev/null || echo '{"status":"error"}')

# Parse health checks
API_STATUS=$(echo "$HEALTH" | jq -r '.checks.api.status // "error"')
AGENTKIT_STATUS=$(echo "$HEALTH" | jq -r '.checks.agentkit.status // "error"')
DATABASE_STATUS=$(echo "$HEALTH" | jq -r '.checks.database.status // "error"')
CACHE_STATUS=$(echo "$HEALTH" | jq -r '.checks.cache.status // "error"')
MEM0_STATUS=$(echo "$HEALTH" | jq -r '.checks.mem0.status // "error"')

[ "$API_STATUS" = "healthy" ] && check "API responding" "PASS" || check "API responding" "FAIL"
[ "$AGENTKIT_STATUS" = "healthy" ] && check "AgentKit loaded" "PASS" || check "AgentKit loaded" "FAIL"
[ "$DATABASE_STATUS" = "healthy" ] && check "Database healthy" "PASS" || check "Database healthy" "FAIL"
[ "$CACHE_STATUS" = "healthy" ] && check "Redis/Cache healthy" "PASS" || check "Redis/Cache healthy" "FAIL"
[ "$MEM0_STATUS" = "healthy" ] && check "Mem0 accessible" "PASS" || check "Mem0 accessible" "FAIL"

echo ""

# ─────────────────────────────────────────────────────────────────
echo "🔧 2. BUILD CHECK"
echo ""

# Check if build works
echo "  Running npm run build..."
if npm run build --silent 2>&1 | grep -q "Build error"; then
  check "Build completes" "FAIL"
  BUILD_ERROR=$(npm run build 2>&1 | grep -A2 "Error:" | head -3)
  echo -e "    ${YELLOW}Error: $BUILD_ERROR${NC}"
else
  check "Build completes" "PASS"
fi

echo ""

# ─────────────────────────────────────────────────────────────────
echo "🧪 3. TEST SUITE"
echo ""

# Run tests
echo "  Running npm test..."
TEST_OUTPUT=$(npm test -- --passWithNoTests --silent 2>&1 | tail -5)
TESTS_PASSED=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= passed)' | head -1 || echo "0")
TESTS_FAILED=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= failed)' | head -1 || echo "0")
TESTS_SKIPPED=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= skipped)' | head -1 || echo "0")

echo "  Tests: $TESTS_PASSED passed, $TESTS_FAILED failed, $TESTS_SKIPPED skipped"

[ "$TESTS_FAILED" = "0" ] && check "All tests pass" "PASS" || check "All tests pass" "FAIL"
[ "$TESTS_SKIPPED" -lt 10 ] && check "Skipped tests < 10" "PASS" || check "Skipped tests < 10" "FAIL"

echo ""

# ─────────────────────────────────────────────────────────────────
echo "📝 4. TYPECHECK"
echo ""

if npm run typecheck --silent 2>&1; then
  check "TypeScript passes" "PASS"
else
  check "TypeScript passes" "FAIL"
fi

echo ""

# ─────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "📊 SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}Passed:${NC} $PASS_COUNT"
echo -e "  ${RED}Failed:${NC} $FAIL_COUNT"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo -e "  ${RED}❌ NO-GO - $FAIL_COUNT checks failed${NC}"
  exit 1
else
  echo -e "  ${GREEN}✅ GO - All checks passed${NC}"
  exit 0
fi
