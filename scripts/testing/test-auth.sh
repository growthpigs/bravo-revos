#!/bin/bash

# Test Unipile authentication with test credentials

API_KEY=$(grep '^UNIPILE_API_KEY=' .env.local | cut -d '=' -f2)
DSN=$(grep '^UNIPILE_DSN=' .env.local | cut -d '=' -f2)

echo "=========================================="
echo "UNIPILE API AUTHENTICATION TEST"
echo "=========================================="
echo "DSN: $DSN"
echo "API Key: ${API_KEY:0:10}..."
echo ""
echo "Test: Authenticate with DUMMY credentials"
echo "This will show us what error Unipile returns"
echo ""

# Test with dummy credentials
echo "Sending authentication request with test@example.com / testpass123..."
RESPONSE=$(curl -X POST "$DSN/api/v1/accounts" \
  -H "X-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "provider": "LINKEDIN",
    "username": "test@example.com",
    "password": "testpass123"
  }' \
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
echo "ANALYSIS:"
echo "=========================================="

if echo "$BODY" | grep -q "invalid_api_key"; then
  echo "❌ API KEY IS INVALID"
  echo "The Unipile API key is wrong or expired"
elif echo "$BODY" | grep -q "invalid_credentials"; then
  echo "✅ API KEY IS VALID!"
  echo "API key works. Error is 'invalid_credentials' which is expected"
  echo "for dummy test@example.com credentials."
  echo ""
  echo "Your real LinkedIn credentials are likely incorrect OR"
  echo "LinkedIn may be blocking the login attempt."
elif echo "$BODY" | grep -q "unauthorized\|forbidden"; then
  echo "⚠️  API KEY MIGHT BE INVALID"
  echo "Got unauthorized/forbidden - check your Unipile dashboard"
else
  echo "⚠️  UNEXPECTED RESPONSE"
  echo "See response above for details"
fi

echo "=========================================="
