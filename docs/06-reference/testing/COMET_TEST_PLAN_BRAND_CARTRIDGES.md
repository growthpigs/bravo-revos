# Comet AI Browser Testing Plan: Brand Cartridges & Topic Generation

**Deployment URL:** https://bravo-revos-6obm5qq1s-growthpigs-projects.vercel.app

**Test Date:** 2025-11-18
**Fixes Being Validated:**
1. Brand cartridge RLS bypass (industry/target_audience loading)
2. AgentKit response extraction (topic button labels)

---

## Prerequisites

**Authentication Required:**
- You must be logged in as a user with an active brand cartridge
- Expected test user: User with "non profit" industry, "solo preneurs" target audience
- If login fails, STOP and report back

---

## Test Scenario 1: Brand Context Loading

**Objective:** Verify brand cartridge data loads correctly from database

### Steps:
1. Navigate to: `https://bravo-revos-6obm5qq1s-growthpigs-projects.vercel.app/dashboard`
2. Wait for page to fully load (look for chat input at bottom)
3. Type "write" in the chat input
4. Press Enter or click submit button
5. Wait 5-10 seconds for response

### Expected Results:
✅ **PASS Criteria:**
- Message appears with "📋 **Brand Context Loaded**"
- Shows **Industry:** with actual value (e.g., "non profit", NOT "N/A")
- Shows **Target Audience:** with actual value (e.g., "solo preneurs", NOT "N/A")
- Shows "Step 1: Ideal Customer Profile (ICP DNA)" section
- Shows "Burning Question:" with detailed question text

❌ **FAIL Criteria:**
- Shows "Industry: N/A"
- Shows "Target Audience: N/A"
- No brand context message appears
- Error message appears

### Actual Results:
[COMET: Record what you see - copy the EXACT text shown]

---

## Test Scenario 2: Topic Button Labels

**Objective:** Verify AgentKit extraction returns actual topic text (not error messages)

### Steps:
1. Continue from Test Scenario 1 (should have brand context loaded)
2. Look at the buttons shown below "Select a topic to write about:"
3. Count the number of buttons visible
4. Read the label/text on each button

### Expected Results:
✅ **PASS Criteria:**
- See 4 topic buttons
- Each button has meaningful topic text like:
  - "Maximizing Google Ads for Solo Entrepreneurs..."
  - "Transforming Ad Traffic into Qualified Leads..."
  - "Building Trust Without Breaking the Bank..."
  - (Or similar personalized topics)
- Button text is relevant to "non profit" and "solo preneurs"
- NO buttons say "Error: could not extract..."

❌ **FAIL Criteria:**
- Buttons show "Error: could not extract response text from AgentKit result"
- Less than 4 buttons appear
- Button labels are generic (not personalized)
- Buttons are blank or missing

### Actual Results:
[COMET: List each button label you see]
1. Button 1: _______________
2. Button 2: _______________
3. Button 3: _______________
4. Button 4: _______________

---

## Test Scenario 3: Working Document Area

**Objective:** Verify UI opens working document panel

### Steps:
1. Continue from Test Scenario 2
2. Observe if a "Working Document" panel appears on the right side
3. Check if it shows "_(Awaiting topic selection...)_"

### Expected Results:
✅ **PASS Criteria:**
- Working Document panel visible
- Shows title "LinkedIn Post"
- Shows placeholder text "_(Awaiting topic selection...)_"

❌ **FAIL Criteria:**
- No working document panel appears
- Panel is empty/blank
- Error message in panel

### Actual Results:
[COMET: Describe what you see in the working document area]

---

## Test Scenario 4: Topic Button Click (Optional - if buttons work)

**Objective:** Verify clicking a topic generates a post

### Steps:
1. Continue from Test Scenario 3
2. Click the FIRST topic button (top button)
3. Wait 10-15 seconds for AI generation
4. Observe the working document area

### Expected Results:
✅ **PASS Criteria:**
- Working document updates with actual LinkedIn post content
- Post is relevant to the topic clicked
- Post mentions nonprofit/solo entrepreneur context
- Chat shows confirmation message like "✅ LinkedIn post generated in working document"

❌ **FAIL Criteria:**
- Another error message appears
- Working document stays as "_(Awaiting topic selection...)_"
- Post is generic (doesn't match brand context)

### Actual Results:
[COMET: Copy first 200 characters of generated post, or describe error]

---

## Summary Report Format

After completing all tests, provide this summary:

```
TEST EXECUTION SUMMARY
Deployment: https://bravo-revos-6obm5qq1s-growthpigs-projects.vercel.app
Test Date: [DATE/TIME]

SCENARIO 1 - Brand Context Loading: [PASS/FAIL]
- Industry shown: [VALUE]
- Target Audience shown: [VALUE]
- Notes: [Any issues]

SCENARIO 2 - Topic Button Labels: [PASS/FAIL]
- Number of buttons: [COUNT]
- Button labels: [LIST]
- Notes: [Any issues]

SCENARIO 3 - Working Document Area: [PASS/FAIL]
- Panel visible: [YES/NO]
- Content: [DESCRIPTION]

SCENARIO 4 - Topic Click (if attempted): [PASS/FAIL/SKIPPED]
- Post generated: [YES/NO]
- Notes: [Any issues]

OVERALL STATUS: [ALL PASS / PARTIAL PASS / FAIL]
CRITICAL ISSUES: [List any blocking issues]
MINOR ISSUES: [List any non-blocking issues]
```

---

## Troubleshooting Notes for Comet

**If page won't load:**
- Try refreshing once
- Check if you see Vercel deployment screen
- Report URL accessibility issue

**If login required but no credentials:**
- Report back - Claude will provide auth details
- Do not proceed without login

**If buttons don't appear:**
- Take screenshot
- Check browser console for errors (if possible)
- Report exact UI state

**If test takes too long (>30 seconds):**
- Note the timeout
- Take screenshot of current state
- Move to next test

---

## Success Criteria Summary

**Fix #1 (Brand Cartridges): VALIDATED IF:**
- ✅ Industry shows real value (not "N/A")
- ✅ Target Audience shows real value (not "N/A")

**Fix #2 (AgentKit Extraction): VALIDATED IF:**
- ✅ Topic buttons show meaningful text
- ✅ NO buttons say "Error: could not extract..."
- ✅ Topics are personalized to brand

**BOTH FIXES WORKING = Ready for production deploy**
