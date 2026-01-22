#!/bin/bash

# Direct Unipile API Test - Create LinkedIn Post
# This bypasses the Next.js API and calls Unipile directly

API_KEY="N6iCFCo2.qR5FtqsytD5/PNp4TeH5uHUctlDrAqt4vuUK6W/tz7k="
DSN="https://api3.unipile.com:13344"
ACCOUNT_ID="pJj4DVePS3umF9iJwSmx7w"

echo "=========================================="
echo "TESTING LINKEDIN POST - DIRECT TO UNIPILE"
echo "=========================================="
echo ""
echo "Account ID: $ACCOUNT_ID"
echo ""

# Post content about AI and design
POST_TEXT="Exciting developments in generative AI are reshaping how we approach design!

As AI tools become more sophisticated, designers are finding new ways to blend human creativity with machine intelligence. The key is not replacement, but augmentation.

What's your take on AI-assisted design? 🤖✨

#GenerativeAI #DesignThinking #AIInnovation"

echo "Post content:"
echo "$POST_TEXT"
echo ""
echo "Sending to Unipile API..."
echo ""

# Call Unipile directly
RESPONSE=$(curl -s -X POST "$DSN/api/v1/posts" \
  -H "X-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"account_id\": \"$ACCOUNT_ID\",
    \"text\": $(echo "$POST_TEXT" | jq -Rs .),
    \"provider\": \"LINKEDIN\"
  }")

echo "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"post_id"' || echo "$RESPONSE" | grep -q '"id"'; then
  echo "✅ SUCCESS! Post created on LinkedIn."

  # Extract post_id
  POST_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('post_id', data.get('id', 'N/A')))" 2>/dev/null)

  if [ "$POST_ID" != "N/A" ] && [ "$POST_ID" != "" ]; then
    echo "Post ID: $POST_ID"
    echo ""
    echo "Check your LinkedIn profile to see the post!"
  fi

  # Extract URL if available
  URL=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('url', 'N/A'))" 2>/dev/null)

  if [ "$URL" != "N/A" ] && [ "$URL" != "" ]; then
    echo "Post URL: $URL"
  fi
else
  echo "❌ FAILED! Check error above."
  exit 1
fi

echo "=========================================="
