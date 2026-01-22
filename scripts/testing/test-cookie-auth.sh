#!/bin/bash

# Test Unipile authentication with LinkedIn cookie
# This bypasses password authentication entirely

API_KEY=$(grep '^UNIPILE_API_KEY=' .env.local | cut -d '=' -f2)
DSN=$(grep '^UNIPILE_DSN=' .env.local | cut -d '=' -f2)

echo "=========================================="
echo "UNIPILE COOKIE-BASED AUTHENTICATION TEST"
echo "=========================================="
echo "DSN: $DSN"
echo "API Key: ${API_KEY:0:10}..."
echo ""
echo "INSTRUCTIONS:"
echo "1. Extract li_at cookie from LinkedIn (see above)"
echo "2. Replace LI_AT_COOKIE_HERE below with your actual cookie"
echo "3. Replace USER_AGENT_HERE with your browser's User-Agent"
echo "4. Run this script again"
echo ""

# Actual cookie and user agent from LinkedIn browser session
LI_AT_COOKIE="AQEDAQBq8zIBhjHcAAABmlpuR78AAAGafnrLv04AEt7am24tEI_xYADa19jCqN09QBSZgIXy5KtFTzH1shHKGyZ3DmxTf9QBSW_51WRp8tM62lUyL6oQASu6JE7QBcTcCWb3gXOL9IjtIR5nTjBlA4-S"
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"

if [ "$LI_AT_COOKIE" = "LI_AT_COOKIE_HERE" ]; then
  echo "❌ ERROR: You need to replace LI_AT_COOKIE_HERE with your actual cookie!"
  echo ""
  echo "Get it from: LinkedIn → F12 → Application → Cookies → li_at"
  exit 1
fi

echo "Testing cookie authentication..."
echo ""

RESPONSE=$(curl -X POST "$DSN/api/v1/accounts" \
  -H "X-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"provider\": \"LINKEDIN\",
    \"access_token\": \"$LI_AT_COOKIE\",
    \"user_agent\": \"$USER_AGENT\"
  }" \
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

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✅ COOKIE AUTH SUCCESSFUL!"
  echo ""
  echo "LinkedIn account connected via cookie. Password auth is obsolete."
  echo "The account_id in the response is what you'll store in the database."
elif [ "$HTTP_CODE" = "202" ]; then
  echo "⚠️  CHECKPOINT REQUIRED"
  echo ""
  echo "LinkedIn needs additional verification. Check the response for:"
  echo "  - checkpoint_type (2FA, OTP, CAPTCHA, etc.)"
  echo "  - Instructions on how to complete verification"
else
  echo "❌ COOKIE AUTH FAILED: HTTP $HTTP_CODE"
  echo ""
  echo "Possible causes:"
  echo "  - Cookie expired (log out and back in to refresh)"
  echo "  - Wrong cookie value (double-check li_at)"
  echo "  - Unipile API issue"
fi

echo "=========================================="
