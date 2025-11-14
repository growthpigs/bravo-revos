#!/bin/bash

# Admin script to link a Unipile LinkedIn account to a user
# Run this after connecting a LinkedIn account via Unipile dashboard during onboarding

echo "=========================================="
echo "ADMIN: Link LinkedIn Account to User"
echo "=========================================="
echo ""

# Check if all arguments provided
if [ $# -ne 3 ]; then
  echo "Usage: $0 <user_email> <unipile_account_id> <account_name>"
  echo ""
  echo "Example:"
  echo "  $0 customer@example.com pJj4DVePS3umF9iJwSmx7w 'John Doe'"
  echo ""
  echo "Steps:"
  echo "1. Connect customer's LinkedIn via Unipile dashboard during onboarding call"
  echo "2. Copy the account_id from Unipile dashboard"
  echo "3. Run this script with customer's email, account_id, and name"
  exit 1
fi

USER_EMAIL="$1"
UNIPILE_ACCOUNT_ID="$2"
ACCOUNT_NAME="$3"

echo "User Email: $USER_EMAIL"
echo "Account ID: $UNIPILE_ACCOUNT_ID"
echo "Account Name: $ACCOUNT_NAME"
echo ""

# Get user_id from database
echo "Looking up user_id..."
USER_ID=$(psql "$DATABASE_URL" -t -c "SELECT id FROM users WHERE email = '$USER_EMAIL'" | tr -d ' ')

if [ -z "$USER_ID" ]; then
  echo "❌ ERROR: User not found with email: $USER_EMAIL"
  exit 1
fi

echo "✓ Found user_id: $USER_ID"
echo ""

# Make API call to link account
echo "Linking account via API..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/admin/linkedin/link-account \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat ~/.bravo-revos-admin-cookie 2>/dev/null || echo '')" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"unipileAccountId\": \"$UNIPILE_ACCOUNT_ID\",
    \"accountName\": \"$ACCOUNT_NAME\"
  }")

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ SUCCESS! LinkedIn account linked to user."
else
  echo "❌ FAILED! Check error above."
  exit 1
fi

echo "=========================================="
