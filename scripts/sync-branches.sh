#!/bin/bash
# Sync main → staging → production
# Usage: ./scripts/sync-branches.sh

set -e  # Exit on error

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  Branch Sync: main → staging → production                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verify we're in the right repo
REPO_ROOT=$(git rev-parse --show-toplevel)
if [[ ! -f "$REPO_ROOT/package.json" ]]; then
  echo -e "${RED}❌ Not in bravo-revos repository${NC}"
  exit 1
fi

echo -e "${YELLOW}Step 1: Verify main branch is ready${NC}"
git checkout main
git pull origin main

MAIN_SHA=$(git rev-parse HEAD)
echo -e "${GREEN}✓ Main at commit: $MAIN_SHA${NC}"
echo ""

read -p "Continue to sync staging? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo -e "${YELLOW}Step 2: Sync main → staging${NC}"
git checkout staging
git pull origin staging
git merge main --no-edit
STAGING_SHA=$(git rev-parse HEAD)
echo -e "${GREEN}✓ Staging merged: $STAGING_SHA${NC}"

git push origin staging
echo -e "${GREEN}✓ Staging pushed to origin${NC}"
echo ""

read -p "Continue to sync production? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Stopped at staging. Production not updated."
  exit 0
fi

echo -e "${YELLOW}Step 3: Sync staging → production${NC}"
git checkout production
git pull origin production
git merge staging --no-edit
PROD_SHA=$(git rev-parse HEAD)
echo -e "${GREEN}✓ Production merged: $PROD_SHA${NC}"

git push origin production
echo -e "${GREEN}✓ Production pushed to origin${NC}"
echo ""

echo -e "${YELLOW}Step 4: Return to main${NC}"
git checkout main
echo -e "${GREEN}✓ Back on main branch${NC}"
echo ""

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  ✅ SYNC COMPLETE                                         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Branch Status:"
echo "  main:       $MAIN_SHA"
echo "  staging:    $STAGING_SHA"
echo "  production: $PROD_SHA"
echo ""
echo "All three branches are now synchronized."
echo ""
echo "Next steps:"
echo "  - Verify staging deploy: [your staging URL]"
echo "  - Verify production deploy: [your production URL]"
echo "  - Monitor health endpoint: /api/health"
