# COMET Comprehensive Testing Script

**Purpose**: Complete browser-based testing guide for Colm (normal user, no terminal access)
**Date**: 2025-11-06
**Scope**: F-01 Orchestration + Voice Cartridge + Basic Functionality

---

## Testing Environment Setup

### Prerequisites
- Browser: Chrome/Firefox/Safari (latest)
- Dev Server: `http://localhost:3000` (must be running)
- Test Account: Use any valid login credentials
- Test Data: Will be provided in database or use existing campaigns

### Before You Start
1. Open browser to `http://localhost:3000`
2. Clear browser cache if you encounter any issues
3. Open Developer Console (F12 or Cmd+Option+I) to check for errors
4. Have this script ready alongside your browser window

---

## PHASE 1: Authentication & Basic Navigation

### Test 1.1: Can You Log In?

**Steps:**
1. Go to `http://localhost:3000/auth/login`
2. Enter any valid email and password (or use test credentials if provided)
3. Click "Sign In"
4. Wait for redirect

**Expected Result:**
- ✅ Login page loads without errors
- ✅ Form accepts input
- ✅ Redirects to dashboard after login
- ✅ No 500 errors in console

**Pass/Fail**: _______________

---

### Test 1.2: Dashboard Loads

**Steps:**
1. After login, you should be on `/dashboard`
2. Look for main sections: Campaigns, Cartridges, Settings

**Expected Result:**
- ✅ Dashboard loads without errors
- ✅ Can see navigation menu
- ✅ No loading spinners stuck indefinitely

**Pass/Fail**: _______________

---

## PHASE 2: Voice Cartridge Testing (Known Issue)

### Test 2.1: Navigate to Cartridges Page

**Steps:**
1. From dashboard, click "Cartridges" in navigation
2. Wait for page to load
3. Look for "Add Cartridge" or "New Cartridge" button

**Expected Result:**
- ✅ Cartridges page loads
- ✅ Can see list of existing cartridges (if any)
- ✅ Button to create new cartridge is visible

**Pass/Fail**: _______________

---

### Test 2.2: Attempt to Add Voice Cartridge (Debugging the Known Issue)

**Steps:**
1. Click "Add Cartridge" button
2. If a form appears:
   - Look for "Cartridge Type" dropdown or similar
   - Look for options like "Voice", "Text", "Image", etc.
   - Select "Voice" if available
   - Fill in cartridge name (e.g., "Test Voice Cartridge")
   - Fill in any other required fields
3. Click "Create" or "Save" button
4. **Keep the Developer Console open during this**

**What to Look For (If It Fails):**
- Error message shown on page?
- Error in browser console (F12)?
- Specific error code or message?
- Does button stay stuck in loading state?
- Does page refresh with no change?

**Record Any Error Messages Below:**
```
Error Message: _________________________________
Error Code: ___________________________________
Location in Page: _____________________________
Console Error (if visible): ___________________
```

**Expected Result (If Working):**
- ✅ Form submits successfully
- ✅ Success message appears
- ✅ Cartridge appears in list
- ✅ New cartridge is configured

**Pass/Fail**: _______________

**If Failed:**
- Go to Test 2.3 (Error Debugging)

---

### Test 2.3: Error Debugging for Voice Cartridge (If Test 2.2 Failed)

**Steps:**
1. Click "Add Cartridge" again
2. Open Developer Console (F12)
3. Go to "Network" tab
4. Start filling out the form again
5. When you click "Create", watch the Network tab for API calls
6. Look for a red X (failed request)
7. Click on the failed request and check:
   - **Request tab**: What data was sent?
   - **Response tab**: What did the server say?
   - **Console tab**: Any JavaScript errors?

**Information to Collect:**
```
API Endpoint: /api/cartridges (or similar)
HTTP Status: 400? 401? 500? _______________
Response Body/Error: ________________________
API Error Message: ____________________________
```

**Pass/Fail**: _______________

**Action**: Report findings in Section 8 below

---

## PHASE 3: F-01 Orchestration Testing

### Test 3.1: Navigate to Orchestration Dashboard

**Steps:**
1. Go to `http://localhost:3000/admin/orchestration-dashboard`
2. Wait for page to load

**Expected Result:**
- ✅ Page loads without 404 error
- ✅ Can see "F-01 AgentKit Campaign Orchestration Dashboard" title
- ✅ Form with input fields is visible

**Pass/Fail**: _______________

**If 404 Error:**
- Stop here and report this in Section 8

---

### Test 3.2: Enter Test Campaign/Pod/Post IDs

**Steps:**
1. You need three UUIDs:
   - Campaign ID
   - Pod ID
   - Post ID

   **If you have test data IDs**, use those. Otherwise:
   - Contact administrator for test data
   - Or run the setup script: `F01_DATABASE_SETUP_FINAL.sql`

2. Enter the three IDs in the input fields:
   - First field: Campaign ID
   - Second field: Pod ID
   - Third field: Post ID

3. Verify all three fields have values

**Expected Result:**
- ✅ Input fields accept the UUIDs
- ✅ All buttons become **enabled** (not grayed out)

**Pass/Fail**: _______________

---

### Test 3.3: Test "Orchestrate Post" Feature

**Steps:**
1. With Campaign, Pod, Post IDs filled in
2. Click "Orchestrate Post" button
3. Wait for response (should show JSON result below)
4. Read the response carefully

**Expected Result:**
```json
{
  "success": true,
  "activitiesScheduled": [some number > 0],
  "strategy": {
    "shouldSchedule": true,
    "timing": "optimal" or "immediate" or "delayed",
    "engagementStrategy": {
      "likeWindow": [some numbers],
      "commentWindow": [some numbers],
      "memberSelection": "all" or specific selection
    }
  }
}
```

**Pass/Fail Criteria:**
- ✅ `success: true`
- ✅ `activitiesScheduled` is a number > 0
- ✅ `strategy` object has all fields
- ✅ `timing` is one of: immediate, optimal, delayed
- ✅ No red error box appears

**Pass/Fail**: _______________

**If Failed:**
- Note the error message below and go to Test 3.7

---

### Test 3.4: Test "Optimize Message" Feature

**Steps:**
1. Look for section "2. Optimize Message"
2. You should see a text input with default message: "Hi, I have a framework that helps with scaling."
3. You can change this message or leave it as is
4. Below that, see a dropdown for "Goal" with options: Engagement, Conversion, Awareness
5. Leave as "Engagement" (or try another)
6. Click "Optimize Message" button
7. Wait for response

**Expected Result:**
```json
{
  "success": true,
  "optimizedMessage": "A different message that's better than the original",
  "variants": ["Variant 1", "Variant 2", "Variant 3"],
  "confidence": 0.85 (a number between 0-1)
}
```

**Pass/Fail Criteria:**
- ✅ `success: true`
- ✅ `optimizedMessage` is different from original
- ✅ `variants` array has 2-3 alternatives
- ✅ `confidence` is between 0 and 1
- ✅ No error box

**Pass/Fail**: _______________

---

### Test 3.5: Test "Analyze Performance" Feature

**Steps:**
1. Look for section "3. Analyze Performance"
2. Just one button to click: "Analyze Performance"
3. This needs Campaign ID (which you already entered)
4. Click button and wait for response

**Expected Result:**
```json
{
  "success": true,
  "analysis": {
    "overallScore": [number between 0-100],
    "insights": ["Insight 1", "Insight 2", "Insight 3"],
    "recommendations": ["Recommendation 1", "Recommendation 2"],
    "nextActions": [
      {"action": "Do something", "priority": "high"},
      {"action": "Do something else", "priority": "medium"}
    ]
  }
}
```

**Pass/Fail Criteria:**
- ✅ `success: true`
- ✅ `overallScore` is a number between 0-100
- ✅ `insights` array has 2+ items
- ✅ `recommendations` array has 1+ items
- ✅ `nextActions` has action objects with "action" and "priority" fields

**Pass/Fail**: _______________

---

### Test 3.6: Test "Generate Post" Feature

**Steps:**
1. Look for section "4. Generate Post Content"
2. You should see an input field with default: "How to scale your leadership team"
3. You can change the topic or leave as is
4. Click "Generate Post" button
5. Wait for response

**Expected Result:**
```json
{
  "success": true,
  "postContent": {
    "postText": "A complete LinkedIn post text (long content)",
    "hashtags": ["#Hashtag1", "#Hashtag2", "#Hashtag3"],
    "bestPostingTime": "Tuesday 10am EST" (or similar),
    "expectedEngagement": "high" or "medium" or "low"
  }
}
```

**Pass/Fail Criteria:**
- ✅ `success: true`
- ✅ `postContent.postText` is substantial (50+ characters)
- ✅ `hashtags` array has 2-5 hashtags
- ✅ `bestPostingTime` is a readable time string
- ✅ `expectedEngagement` is one of: high, medium, low

**Pass/Fail**: _______________

---

### Test 3.7: Error Handling (If F-01 Tests Failed)

**If any F-01 test failed, do this:**

**Steps:**
1. Open Developer Console (F12)
2. Go to "Network" tab
3. Go back to "Console" tab
4. Try the failed test again (e.g., Orchestrate Post)
5. Watch for any red error messages in console
6. Note exact error text

**Error Information:**
```
Error Type: JavaScript error / Network error / API error
Error Text: _________________________________
Timestamp: __________________________________
What triggered it: Test 3.3 / 3.4 / 3.5 / 3.6 (circle one)
```

**Pass/Fail**: _______________

---

## PHASE 4: Database Verification (Advanced)

**Only do this if you have database access**

### Test 4.1: Verify Activities Were Created

**Steps:**
1. After successful "Orchestrate Post" test
2. Ask admin to check database for new records in `pod_activities` table
3. Should see 2-6 new activity records created

**Expected Result:**
- ✅ New activities exist in database
- ✅ Activities linked to the Pod ID you tested with

**Pass/Fail**: _______________

---

## PHASE 5: Summary & Issue Documentation

### Test 5.1: Complete This Checklist

**Overall Testing Status:**

| Feature | Pass? | Notes |
|---------|-------|-------|
| Authentication | ☐ | |
| Dashboard Navigation | ☐ | |
| Voice Cartridge Add | ☐ | |
| F-01 Orchestrate | ☐ | |
| F-01 Optimize | ☐ | |
| F-01 Analyze | ☐ | |
| F-01 Generate | ☐ | |
| Error Handling | ☐ | |

---

## SECTION 8: Issues & Errors Found

**Use this section to document any problems you encountered:**

### Issue 1: Voice Cartridge Failure

**Status**: KNOWN ISSUE - Needs Investigation

**Description**:
When attempting to add a voice cartridge, the request fails.

**Error Details** (from Test 2.3):
```
API Endpoint: ____________________________
HTTP Status: ____________________________
Error Message: ____________________________
Console Error: ____________________________
```

**Steps to Reproduce:**
1. Navigate to Cartridges
2. Click "Add Cartridge"
3. Select "Voice" type
4. Fill form and click "Create"
5. Request fails

**Suspected Cause**:
- ⚪ API endpoint not implemented
- ⚪ Missing validation on voice cartridge fields
- ⚪ Database constraint issue
- ⚪ Authentication/permission issue
- ⚪ Unknown (describe): _____________________

---

### Issue 2: [If Found During Testing]

**Description**: ___________________________________

**Error Details**:
```
Error: ______________________________________
Location: ____________________________________
Reproducible: Yes / No
```

---

### Issue 3: [If Found During Testing]

**Description**: ___________________________________

---

## SECTION 9: Success Metrics

**When all tests pass, you'll have verified:**

- ✅ Authentication system working
- ✅ Dashboard navigation functional
- ✅ F-01 orchestration feature complete
- ✅ AI integration (GPT-4o) functional
- ✅ Database operations working
- ✅ API endpoints responding correctly
- ✅ Error handling in place
- ✅ Real-time AI decision-making working

---

## SECTION 10: Notes for Developer

**If You Encounter Issues:**

1. **Check browser console** (F12) first - errors show there
2. **Take screenshots** of any error messages
3. **Note exact error text** - don't paraphrase
4. **Try in incognito mode** - rules out cache issues
5. **Report all findings** to developer with:
   - What test was running
   - Exact error message
   - Steps to reproduce
   - Browser and OS version

---

## SECTION 11: Quick Reference

### Test Data Needed
```
Campaign ID: [Will be provided]
Pod ID:      [Will be provided]
Post ID:     [Will be provided]
```

### Test URLs
```
Login:                 http://localhost:3000/auth/login
Dashboard:             http://localhost:3000/dashboard
Cartridges:            http://localhost:3000/dashboard/cartridges
Orchestration:         http://localhost:3000/admin/orchestration-dashboard
```

### Key Files
- Test page source: `/app/admin/orchestration-dashboard/page.tsx`
- Database setup: `/supabase/migrations/F01_DATABASE_SETUP_FINAL.sql`
- Test data: Contact administrator

---

## Summary

This script covers:
1. **Basic functionality** - Can you log in and navigate?
2. **Voice cartridge issue** - What exactly fails and why?
3. **F-01 features** - Do all 4 orchestration features work?
4. **Error documentation** - Clear record of what doesn't work

**Time Estimate**: 30-45 minutes for complete testing
**Difficulty**: Easy - No technical knowledge required

**When Complete**: Send this document back with all sections filled out.

---

**Script Version**: 1.0
**Last Updated**: 2025-11-06
**For Questions**: Contact Development Team
