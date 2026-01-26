# Lead Magnet Library Testing Guide

## Overview

The lead magnet library feature is now complete and ready for testing. This document provides a step-by-step guide to validate:

1. ✅ **Database**: 98 magnets imported and accessible
2. ✅ **API Endpoints**: Fetch, filter, and search magnets
3. ✅ **UI Components**: Modal library browser and campaign wizard integration
4. ✅ **End-to-End Flow**: Full campaign creation with library selection

## Current Status

| Component | Status | Details |
|-----------|--------|---------|
| Database Table | ✅ Ready | `lead_magnet_library` table created in Bravo RevOS |
| Data Import | ✅ Complete | 98 magnets imported with auto-categorization |
| API Endpoints | ✅ Ready | GET /api/lead-magnets with search/filter support |
| Modal Component | ✅ Ready | `lead-magnet-library-modal.tsx` with search and category filter |
| Campaign Wizard | ✅ Ready | Step 1 integrated with Browse/Create choice |
| Build Status | ✅ Zero Errors | TypeScript validation passed |

## Testing Phases

### Phase 1: Database Verification (Quick - 2 minutes)

**Goal**: Confirm 98 magnets are in the database with correct categorization.

```bash
# Query should show 98 total magnets
SELECT COUNT(*) as total FROM lead_magnet_library WHERE is_active = true;

# Breakdown by category:
SELECT category, COUNT(*) FROM lead_magnet_library GROUP BY category ORDER BY COUNT DESC;
```

**Expected Result**:
- Total: 98 magnets
- AI & Automation: 37
- LinkedIn & Growth: 54
- General: 3
- Sales & Outreach: 2
- Email & Nurturing: 1
- Tools & Systems: 1

### Phase 2: API Endpoint Testing (5 minutes)

**Goal**: Verify API correctly returns filtered/searched magnets.

#### Test 2.1: Fetch All Magnets
```bash
curl http://localhost:3000/api/lead-magnets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected**: Returns 98 magnets in `data` array with pagination info.

#### Test 2.2: Search by Title
```bash
curl "http://localhost:3000/api/lead-magnets?search=linkedin" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**: Returns magnets with "linkedin" in title or description (should be ~15+).

#### Test 2.3: Filter by Category
```bash
curl "http://localhost:3000/api/lead-magnets?category=AI%20%26%20Automation" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**: Returns 37 magnets in the "AI & Automation" category.

#### Test 2.4: Fetch Single Magnet
```bash
curl "http://localhost:3000/api/lead-magnets/[MAGNET_ID]" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**: Returns single magnet object with all fields (id, title, description, url, category, is_active).

### Phase 3: UI Component Testing (8 minutes)

**Goal**: Test modal opens, searches, filters, and selects correctly.

#### Test 3.1: Open Campaign Wizard
1. Navigate to: `http://localhost:3000/dashboard/campaigns/new`
2. You should see **Step 1: Lead Magnet Selection**

**Expected**: Page loads without errors, Step indicator shows "1 of 7"

#### Test 3.2: Browse/Create Options
1. On Step 1, you should see two cards:
   - **Browse Library** (with Library icon)
   - **Create Custom** (with Plus icon)

**Expected**: Both cards are clickable

#### Test 3.3: Open Library Modal
1. Click **"Browse Library"** button
2. Modal should open with:
   - Search input at top
   - Category filter pills
   - Grid of 98 magnets (2 columns)

**Expected**: Modal loads, no console errors, magnets visible

#### Test 3.4: Search Functionality
1. In modal, click search input
2. Type: `"linkedin"`
3. List should filter to show only LinkedIn-related magnets

**Expected**:
- Search results update dynamically
- Count shows fewer items (e.g., "15 results")
- Results include "LinkedIn & Growth" category items

#### Test 3.5: Category Filter
1. Click category pill: **"AI & Automation"**
2. Grid should update to show only AI-related magnets

**Expected**:
- 37 magnets displayed
- All have category tag "AI & Automation"
- Clear visual feedback on selected category

#### Test 3.6: Search + Filter Combined
1. Keep category filter on "AI & Automation"
2. Type search: `"prompt"`
3. Should show intersection of both filters

**Expected**: Shows fewer results (only AI magnets with "prompt" in title/description)

#### Test 3.7: Select Magnet
1. Click any magnet card
2. Modal should close
3. Selected magnet details should appear below

**Expected**:
- Modal closes automatically
- Magnet details card shows:
  - Title
  - Category badge
  - URL
  - Description
- "Change Selection" button available to re-open modal

#### Test 3.8: Switch to Create Custom
1. From selected state, click **"Back"** (if available) or reload page
2. Click **"Create Custom"** card
3. Original delivery method/template selectors should appear

**Expected**:
- UI switches from Browse to Create mode
- Form shows template picker, delivery methods, trigger word
- Browse Library option is no longer visible

### Phase 4: End-to-End Campaign Creation (10 minutes)

**Goal**: Create a campaign using library selection and verify it persists.

#### Test 4.1: Library Selection
1. Go to `http://localhost:3000/dashboard/campaigns/new`
2. Click **"Browse Library"**
3. Search for and select a magnet (e.g., search "linkedin", select "LinkedIn Connection Framework")
4. Verify selection appears below

**Expected**: Magnet details card shows selected item

#### Test 4.2: Continue Through Wizard
1. Click **"Next"** button (or equivalent to proceed to Step 2)
2. Go through remaining steps:
   - Step 2: Campaign basics (name, description)
   - Step 3: DM sequence (message copy)
   - Step 4: Trigger word
   - Step 5: Scheduling
   - Step 6: Review
   - Step 7: Launch

**Expected**: No errors, form persists data across steps

#### Test 4.3: Review Step
1. On final review step, verify **Lead Magnet Selection** section shows:
   - Selected magnet title
   - Category
   - URL link

**Expected**: All data correctly displayed in review

#### Test 4.4: Create Campaign
1. Click **"Create Campaign"** or **"Launch"**
2. Should redirect to campaigns list or success page

**Expected**: Campaign created successfully, visible in campaigns list

#### Test 4.5: Verify Campaign Data
1. Find created campaign in campaigns list
2. Click to open campaign details
3. Verify lead magnet information is stored and displayed

**Expected**:
- Campaign shows selected magnet
- URL is clickable and correct
- All magnet metadata preserved

### Phase 5: Editing Magnets (For Future - Admin Interface)

**Status**: Not yet implemented (scheduled for later phase)

**What's needed**:
- Admin interface to view all 98 magnets
- Edit magnet URL, title, description
- Enable/disable magnets
- Add new magnets manually
- Delete magnets

**Why This Matters**: User requirement stated: "eventually we'll have access to all of them, but please allow for us to change those links in the library"

## Error Scenarios to Test

### Scenario 1: No Library Selected
1. On Step 1, don't select anything
2. Try to proceed to Step 2
3. Should show validation error: "Please select a lead magnet from the library"

**Expected**: Error message prevents progression

### Scenario 2: Failed API Request
1. Open browser DevTools (F12 → Console)
2. Open library modal
3. Watch for any fetch errors

**Expected**:
- If API fails, modal shows error state
- User can retry or switch to Create Custom

### Scenario 3: Slow Network
1. Open DevTools → Network tab → Throttle to "Slow 3G"
2. Click "Browse Library"
3. Watch loading state

**Expected**:
- Loading spinner displays
- Eventually loads or shows error gracefully

## Browser Console Debugging

Filter console logs to see library-specific debug output:

```
Filter by: [LEAD_MAGNET_LIBRARY]
```

Relevant logs:
- `[LEAD_MAGNET_LIBRARY] Fetch error: ...` - API call failures
- `[LEAD_MAGNET_LIBRARY] Modal opened` - User interactions
- `[LEAD_MAGNET_LIBRARY] Selection: ...` - Selected magnet details

## Success Criteria

✅ All of the following must pass:

1. **Database**: 98 magnets present and properly categorized
2. **API**: Endpoints return correct data with filtering/search
3. **Modal UI**: Opens, searches, filters, and selects without errors
4. **Campaign Wizard**: Library selection integrates into step flow
5. **Data Persistence**: Selected magnet persists through wizard steps
6. **End-to-End**: Can create full campaign with library magnet
7. **No Console Errors**: Browser console has no red error logs

## Next Steps After Testing

### If All Tests Pass ✅
1. Commit changes to v1-lead-magnet branch
2. Create PR to main branch
3. Begin Phase 2 testing (email extraction, DM delivery)
4. Schedule demo with stakeholder

### If Issues Found ❌
1. Document exact error in browser console
2. Note reproduction steps
3. Check:
   - Are you using correct Supabase project? (trdoainmejxanrownbuz)
   - Is dev server running? (`npm run dev`)
   - Are you logged in with valid auth?
   - Try hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

## Database Connection Details

**Project**: Bravo RevOS
**URL**: https://supabase.com/dashboard/project/trdoainmejxanrownbuz
**Table**: `lead_magnet_library`
**Records**: 98 total

To manually verify via Supabase:
1. Go to: https://supabase.com/dashboard/project/trdoainmejxanrownbuz
2. Select Table Editor (left sidebar)
3. Click `lead_magnet_library` table
4. Should see 98 rows with proper data

## Support

If you encounter any issues:

1. **Check git status**: Are there unstaged changes?
   ```bash
   git status
   ```

2. **Verify imports**: Check component imports are correct
   ```bash
   grep -r "lead-magnet-library-modal" components/
   ```

3. **Check types**: Run TypeScript validation
   ```bash
   npx tsc --noEmit
   ```

4. **View error logs**: Check browser console for specific errors
   - Press F12 → Console tab
   - Look for red error messages
   - Search for `[LEAD_MAGNET` to filter to library-related logs

5. **Network tab**: Check API requests
   - Press F12 → Network tab
   - Open library modal
   - Look for `/api/lead-magnets` request
   - Check response for data

---

**Last Updated**: 2025-11-07
**Feature Status**: Ready for full testing
**Data Status**: 98/108 magnets imported successfully
