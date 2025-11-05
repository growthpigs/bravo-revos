#!/bin/bash
# Test script for C-03 DM Queue validation
# Tests rate limiting with 150 DM attempts

echo "================================"
echo "C-03 DM Queue Validation Test"
echo "================================"
echo ""

# Prerequisites check
echo "1. Checking prerequisites..."
if ! pgrep -x "redis-server" > /dev/null; then
    echo "   ❌ Redis not running. Start with: redis-server"
    exit 1
fi
echo "   ✅ Redis running"

if ! curl -s http://localhost:3000/api/dm-queue > /dev/null 2>&1; then
    echo "   ❌ Dev server not running on port 3000. Start with: npm run dev"
    exit 1
fi
echo "   ✅ Dev server running"
echo ""

# Test configuration
ACCOUNT_ID="test-account-1"
CAMPAIGN_ID="validation-test-$(date +%s)"

echo "2. Configuration:"
echo "   - Account ID: $ACCOUNT_ID"
echo "   - Campaign ID: $CAMPAIGN_ID"
echo "   - Target: Queue 150 DMs"
echo "   - Expected: Only 100 sent in 24 hours"
echo ""

# Reset rate limit counter (for testing)
echo "3. Resetting rate limit counter..."
redis-cli DEL "dm-count:$ACCOUNT_ID:$(date -u +%Y-%m-%d)" > /dev/null
echo "   ✅ Counter reset"
echo ""

# Queue 150 DMs
echo "4. Queueing 150 DMs..."
SUCCESS_COUNT=0
RATE_LIMITED_COUNT=0

for i in $(seq 1 150); do
    RESULT=$(curl -s -X POST http://localhost:3000/api/dm-queue \
        -H "Content-Type: application/json" \
        -d "{
            \"action\": \"queue\",
            \"accountId\": \"$ACCOUNT_ID\",
            \"recipientId\": \"user-$i\",
            \"recipientName\": \"Test User $i\",
            \"message\": \"Test DM $i\",
            \"campaignId\": \"$CAMPAIGN_ID\",
            \"userId\": \"test-user\"
        }")

    if echo "$RESULT" | grep -q "success"; then
        ((SUCCESS_COUNT++))
        if [ $((i % 10)) -eq 0 ]; then
            echo "   Queued: $i DMs..."
        fi
    else
        ((RATE_LIMITED_COUNT++))
    fi

    # Small delay to avoid overwhelming API
    sleep 0.05
done

echo "   ✅ Queueing complete"
echo "   - Successfully queued: $SUCCESS_COUNT"
echo "   - Rate limited: $RATE_LIMITED_COUNT"
echo ""

# Check rate limit status
echo "5. Checking rate limit status..."
RATE_STATUS=$(curl -s "http://localhost:3000/api/dm-queue?accountId=$ACCOUNT_ID")
SENT_TODAY=$(echo "$RATE_STATUS" | grep -o '"sentToday":[0-9]*' | cut -d: -f2)
REMAINING=$(echo "$RATE_STATUS" | grep -o '"remaining":[0-9]*' | cut -d: -f2)

echo "   Rate limit status:"
echo "   - Sent today: $SENT_TODAY / 100"
echo "   - Remaining: $REMAINING"
echo ""

# Check queue status
echo "6. Checking queue status..."
QUEUE_STATUS=$(curl -s http://localhost:3000/api/dm-queue)
echo "   Queue statistics:"
echo "$QUEUE_STATUS" | grep -o '"waiting":[0-9]*,"active":[0-9]*,"delayed":[0-9]*,"completed":[0-9]*,"failed":[0-9]*' | \
    sed 's/,/\n   /g' | sed 's/"//g' | sed 's/:/: /'
echo ""

# Validation
echo "7. Validation Results:"
echo "================================"

if [ "$SENT_TODAY" -le 100 ]; then
    echo "   ✅ PASS: Rate limit enforced ($SENT_TODAY <= 100)"
else
    echo "   ❌ FAIL: Rate limit exceeded ($SENT_TODAY > 100)"
fi

if [ "$REMAINING" -ge 0 ]; then
    echo "   ✅ PASS: Remaining count valid ($REMAINING >= 0)"
else
    echo "   ❌ FAIL: Remaining count invalid ($REMAINING < 0)"
fi

DELAYED=$(echo "$QUEUE_STATUS" | grep -o '"delayed":[0-9]*' | cut -d: -f2)
if [ "$DELAYED" -gt 0 ]; then
    echo "   ✅ PASS: Excess DMs delayed ($DELAYED delayed jobs)"
else
    echo "   ⚠️  WARNING: No delayed jobs (might be processing too fast)"
fi

echo "================================"
echo ""
echo "✅ C-03 Validation Test Complete"
echo ""
echo "Next steps:"
echo "  1. Check logs: npm run dev output"
echo "  2. Verify Redis keys: redis-cli KEYS 'dm-*'"
echo "  3. Monitor queue: curl http://localhost:3000/api/dm-queue"
