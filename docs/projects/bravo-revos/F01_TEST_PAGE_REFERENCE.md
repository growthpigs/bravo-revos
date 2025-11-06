# F-01 Orchestration Dashboard - Test Page Reference

## Test Page URL

```
http://localhost:3000/admin/orchestration-dashboard
```

## What This Page Does

The Orchestration Dashboard is a **browser-based testing interface** for Comet (normal user without terminal/console access) to test all F-01 AgentKit Campaign Orchestration features.

### Features You Can Test

1. **Orchestrate Post** - AI decides engagement strategy for new posts
2. **Optimize Message** - AI improves message copy for better engagement
3. **Analyze Performance** - AI analyzes campaign performance and provides recommendations
4. **Generate Post Content** - AI creates engaging LinkedIn posts with trigger words

## How to Test

### Prerequisites

1. ✅ Backend running: `npm run dev` (should be running already)
2. ✅ Test data created: Campaign, Pod, Post, Pod Members (see F01_DATABASE_SETUP_FINAL.sql)
3. ✅ OpenAI API key set in `.env.local`
4. ✅ Supabase credentials configured

### Step-by-Step

1. **Open the dashboard**: Navigate to `http://localhost:3000/admin/orchestration-dashboard`

2. **Enter test data IDs** at the top:
   - Campaign ID (from database)
   - Pod ID (from database)
   - Post ID (from database)

3. **Click any button** to test that feature:
   - **Orchestrate Post** - Tests core F-01 orchestration logic
   - **Optimize Message** - Tests message improvement
   - **Analyze Performance** - Tests performance analysis
   - **Generate Post** - Tests content generation

4. **View results** - All responses display below showing:
   - Success/failure status
   - AI decision details
   - Strategy information
   - Any errors encountered

## Expected Results

### Orchestrate Post Success Response
```json
{
  "success": true,
  "activitiesScheduled": 6,
  "strategy": {
    "shouldSchedule": true,
    "timing": "optimal",
    "engagementStrategy": {
      "likeWindow": [1, 30],
      "commentWindow": [30, 180],
      "memberSelection": "all"
    }
  }
}
```

### Optimize Message Success Response
```json
{
  "success": true,
  "optimizedMessage": "Saw your comment - here's the framework...",
  "variants": ["Variant 1", "Variant 2"],
  "confidence": 0.87
}
```

### Analyze Performance Success Response
```json
{
  "success": true,
  "analysis": {
    "overallScore": 78,
    "insights": ["Insight 1", "Insight 2"],
    "recommendations": ["Recommendation 1"],
    "nextActions": [{"action": "...", "priority": "high"}]
  }
}
```

### Generate Post Success Response
```json
{
  "success": true,
  "postContent": {
    "postText": "...",
    "hashtags": ["#Tag1", "#Tag2"],
    "bestPostingTime": "Tuesday 10am EST",
    "expectedEngagement": "high"
  }
}
```

## Validation Checklist

Use this checklist to confirm F-01 is working:

### Core Functionality
- [ ] Page loads without errors
- [ ] Can enter Campaign, Pod, Post IDs
- [ ] Orchestrate Post button works
- [ ] Returns success with `activitiesScheduled > 0`
- [ ] Strategy object has all required fields

### AI Integration
- [ ] Response shows AI decision-making
- [ ] Timing is one of: immediate, optimal, delayed
- [ ] Confidence scores are between 0-1
- [ ] Messages are optimized (different from original)

### Database
- [ ] Activities created in `pod_activities` table
- [ ] Decisions logged in `agentkit_decisions` table
- [ ] Optimizations logged in `agentkit_optimizations` table
- [ ] Analyses logged in `agentkit_analyses` table

### Error Handling
- [ ] Missing IDs show clear error messages
- [ ] Invalid IDs handled gracefully
- [ ] No 500 errors or crashes

## Test Data

Use these IDs from the F01_DATABASE_SETUP_FINAL.sql:

```
Client: 550e8400-e29b-41d4-a716-446655440000
User: 550e8400-e29b-41d4-a716-446655440001
LinkedIn Account: 550e8400-e29b-41d4-a716-446655440020
Campaign: (returned from setup script)
Pod: (returned from setup script)
Post: (returned from setup script)
Pod Members: (3 members created)
```

## Troubleshooting

### Page shows "404 Not Found"
**Solution**: Make sure backend is running with `npm run dev`

### "Campaign not found" error
**Solution**: Verify Campaign ID exists in database - run F01_DATABASE_SETUP_FINAL.sql

### "OpenAI API Error"
**Solution**: Check OPENAI_API_KEY is set in .env.local with valid key

### No activities created
**Solution**: Verify Pod ID and Post ID are correct, check database for records

## Code Location

- **Page Code**: `/app/admin/orchestration-dashboard/page.tsx`
- **API Endpoint**: `/api/agentkit/orchestrate`
- **Core Logic**: `/lib/agentkit/orchestrator.ts`
- **Tests**: `/__tests__/agentkit-orchestration.test.ts`

## Features Tested

✅ OpenAI GPT-4o integration
✅ Campaign context retrieval
✅ Pod member coordination
✅ Activity scheduling
✅ Message optimization
✅ Performance analysis
✅ Post generation
✅ Database persistence
✅ Error handling
✅ AI decision-making logic

---

**Ready for Testing**: Comet can now test F-01 through normal browser interface without terminal access.

Upload this to Archon Context Hub for reference.
