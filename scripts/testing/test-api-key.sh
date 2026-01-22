#!/bin/bash

# Test if Unipile API key is valid (doesn't require LinkedIn credentials)

API_KEY=$(grep '^UNIPILE_API_KEY=' .env.local | cut -d '=' -f2)
DSN=$(grep '^UNIPILE_DSN=' .env.local | cut -d '=' -f2)

echo "=========================================="
echo "UNIPILE API KEY VALIDATION TEST"
echo "=========================================="
echo "DSN: $DSN"
echo "API Key: ${API_KEY:0:10}..."
echo ""
echo "Test: List accounts (GET /api/v1/accounts)"
echo "This endpoint tests if API key is valid WITHOUT needing LinkedIn credentials"
echo ""

# Test 1: List accounts (tests API key validity)
echo "Sending request..."
RESPONSE=$(curl -X GET "$DSN/api/v1/accounts" \
  -H "X-API-KEY: $API_KEY" \
  -H "Accept: application/json" \
  -w "\n###HTTP_CODE###%{http_code}" \
  -s)

HTTP_CODE=$(echo "$RESPONSE" | grep "###HTTP_CODE###" | sed 's/.*###HTTP_CODE###//')
BODY=$(echo "$RESPONSE" | sed 's/###HTTP_CODE###.*//')

echo ""
echo "Response Body:"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""
echo "HTTP Status: $HTTP_CODE"
echo ""
echo "=========================================="
echo "RESULT:"
echo "=========================================="

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ API KEY IS VALID"
  echo ""
  echo "The API key works! The issue is with LinkedIn credentials."
elif echo "$BODY" | grep -q "invalid_api_key\|invalid_credentials\|unauthorized"; then
  ERROR_TYPE=$(echo "$BODY" | grep -o '"type":"[^"]*"' | head -1)
  echo "❌ API KEY IS INVALID"
  echo ""
  echo "Error: $ERROR_TYPE"
  echo "The API key is not working. Check your Unipile dashboard."
else
  echo "⚠️  UNEXPECTED RESPONSE"
  echo ""
  echo "HTTP $HTTP_CODE - Check response above"
fi

echo "=========================================="
