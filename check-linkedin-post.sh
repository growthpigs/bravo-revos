#!/bin/bash

# Check LinkedIn Post Status
# Verifies a post was successfully created

API_KEY="N6iCFCo2.qR5FtqsytD5/PNp4TeH5uHUctlDrAqt4vuUK6W/tz7k="
DSN="https://api3.unipile.com:13344"
ACCOUNT_ID="pJj4DVePS3umF9iJwSmx7w"

if [ -z "$1" ]; then
  echo "Usage: $0 <post_id>"
  echo ""
  echo "Example:"
  echo "  $0 7393983390246457344"
  exit 1
fi

POST_ID="$1"

echo "=========================================="
echo "CHECKING LINKEDIN POST STATUS"
echo "=========================================="
echo ""
echo "Post ID: $POST_ID"
echo "Account: $ACCOUNT_ID"
echo ""

curl -s -X GET "$DSN/api/v1/posts/$POST_ID?account_id=$ACCOUNT_ID" \
  -H "X-API-KEY: $API_KEY" \
  -H "Accept: application/json" \
  | python3 -m json.tool 2>/dev/null

echo ""
echo "=========================================="
