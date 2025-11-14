#!/bin/bash

# Test if we can USE existing dashboard account IDs directly

API_KEY=$(grep '^UNIPILE_API_KEY=' .env.local | cut -d '=' -f2)
DSN=$(grep '^UNIPILE_DSN=' .env.local | cut -d '=' -f2)

echo "=========================================="
echo "TEST: Using Existing Account ID Directly"
echo "=========================================="
echo ""

# Roderic Andrews account ID from dashboard
ACCOUNT_ID="8MTOKOT8TpCHT2xkAzu4dg"

echo "Testing GET /api/v1/accounts/$ACCOUNT_ID"
echo ""

RESPONSE=$(curl -X GET "$DSN/api/v1/accounts/$ACCOUNT_ID" \
  -H "X-API-KEY: $API_KEY" \
  -H "Accept: application/json" \
  -w "\n###HTTP_CODE###%{http_code}" \
  -s)

HTTP_CODE=$(echo "$RESPONSE" | grep "###HTTP_CODE###" | sed 's/.*###HTTP_CODE###//')
BODY=$(echo "$RESPONSE" | sed 's/###HTTP_CODE###.*//')

echo "Response Body:"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""
echo "HTTP Status: $HTTP_CODE"
echo ""
echo "=========================================="
echo "RESULT:"
echo "=========================================="

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ SUCCESS! We CAN access dashboard accounts via API!"
  echo ""
  echo "This means we can USE existing accounts, just can't create new ones via API."
  echo "Solution: Use dashboard to connect accounts, then reference their IDs in code."
elif [ "$HTTP_CODE" = "401" ]; then
  echo "❌ FAILED: API key cannot access dashboard accounts"
  echo ""
  echo "Contact Unipile support - accounts in different permission scope."
else
  echo "⚠️  UNEXPECTED: HTTP $HTTP_CODE"
  echo ""
  echo "Check response above for details."
fi

echo "=========================================="
