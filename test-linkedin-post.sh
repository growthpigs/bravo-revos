#!/bin/bash

# Test LinkedIn Posting
# Posts content about AI/design to your LinkedIn profile

echo "=========================================="
echo "TESTING LINKEDIN POST CREATION"
echo "=========================================="
echo ""

# Post content about AI and design
POST_TEXT="Exciting developments in generative AI are reshaping how we approach design!

As AI tools become more sophisticated, designers are finding new ways to blend human creativity with machine intelligence. The key is not replacement, but augmentation.

What's your take on AI-assisted design? 🤖✨

#GenerativeAI #DesignThinking #AIInnovation"

echo "Post content:"
echo "$POST_TEXT"
echo ""
echo "Sending request to API..."
echo ""

# Call the API endpoint
# Note: This assumes you're logged in to the app at localhost:3000
# If you need to authenticate, use your session cookie

RESPONSE=$(curl -s -X POST http://localhost:3000/api/linkedin/posts \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat ~/.bravo-revos-admin-cookie 2>/dev/null || echo '')" \
  -d "{
    \"text\": $(echo "$POST_TEXT" | jq -Rs .),
    \"accountId\": \"pJj4DVePS3umF9iJwSmx7w\"
  }")

echo "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ SUCCESS! Post created on LinkedIn."

  # Extract URL if available
  URL=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('post', {}).get('url', 'N/A'))" 2>/dev/null)

  if [ "$URL" != "N/A" ]; then
    echo "Post URL: $URL"
  fi
else
  echo "❌ FAILED! Check error above."
  exit 1
fi

echo "=========================================="
