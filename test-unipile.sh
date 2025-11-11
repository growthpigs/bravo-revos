#!/bin/bash

# Test Unipile API directly - this eliminates our Node.js code entirely

# Read credentials from .env.local
API_KEY=$(grep '^UNIPILE_API_KEY=' .env.local | cut -d '=' -f2)
DSN=$(grep '^UNIPILE_DSN=' .env.local | cut -d '=' -f2)

echo "=========================================="
echo "UNIPILE API TEST"
echo "=========================================="
echo "DSN: $DSN"
echo "API Key: ${API_KEY:0:10}..."
echo ""
echo "Testing with your LinkedIn credentials..."
echo ""

# Read LinkedIn credentials from user
read -p "Enter LinkedIn email (rodericandrews@gmail.com): " LINKEDIN_EMAIL
read -sp "Enter LinkedIn password: " LINKEDIN_PASSWORD
echo ""
echo ""

# Make the API call
echo "Sending request to Unipile..."
echo ""

curl -X POST "$DSN/api/v1/accounts" \
  -H "X-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"provider\": \"LINKEDIN\",
    \"username\": \"$LINKEDIN_EMAIL\",
    \"password\": \"$LINKEDIN_PASSWORD\"
  }" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v 2>&1

echo ""
echo "=========================================="
echo "Test complete."
echo ""
echo "If HTTP Status is 401 with 'invalid_credentials':"
echo "  → API key is VALID, LinkedIn credentials are WRONG"
echo ""
echo "If HTTP Status is 401 with 'invalid_api_key' or 'unauthorized':"
echo "  → API key is INVALID"
echo ""
echo "If HTTP Status is 200:"
echo "  → Everything works! Account connected."
echo "=========================================="
