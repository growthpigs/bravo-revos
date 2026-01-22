#!/bin/bash

API_KEY="N6iCFCo2.qR5FtqsytD5/PNp4TeH5uHUctlDrAqt4vuUK6W/tz7k="
DSN="https://api3.unipile.com:13344"
ACCOUNT_ID="rqq9cNxISGu5mU9vJDRK3g"

echo "=========================================="
echo "CHECKING LINKEDIN ACCOUNT STATUS"
echo "=========================================="
echo ""
echo "Account ID: $ACCOUNT_ID"
echo ""

curl -X GET "$DSN/api/v1/accounts/$ACCOUNT_ID" \
  -H "X-API-KEY: $API_KEY" \
  -H "Accept: application/json" \
  -s | python3 -m json.tool

echo ""
echo "=========================================="
echo "If status = 'OK', account is ready to use!"
echo "If status = 'CREDENTIALS', still waiting for approval"
echo "=========================================="
