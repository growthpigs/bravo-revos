# B-04 Manual Test Plan - Step-by-Step

**Purpose**: Validate B-04 Cartridge Management UI works correctly
**Time Required**: ~30-45 minutes
**Prerequisites**: Development server running (`npm run dev`)

---

## Setup

1. Start development server:
   ```bash
   cd /Users/rodericandrews/Obsidian/Master/_projects/bravo-revos
   npm run dev
   ```

2. Open browser to: http://localhost:3000/dashboard/cartridges

3. Have this checklist ready to mark items as you test

---

## Test 1: Basic Navigation (2 minutes)

**Goal**: Verify page loads and navigation works

- [ ] Sidebar shows "Voice Cartridges" link with Zap icon
- [ ] Click "Voice Cartridges" → page loads without errors
- [ ] Page title: "Voice Cartridges"
- [ ] Two tabs visible: "All Cartridges" and "Quick Guide"
- [ ] "New Cartridge" button visible in top-right
- [ ] No console errors (open DevTools with F12)

**If any fail**: Check browser console for errors

---

## Test 2: Create Cartridge (5 minutes)

**Goal**: Verify new cartridge creation works

### Steps:
1. [ ] Click "New Cartridge" button
2. [ ] Modal opens with title "Create New Voice Cartridge"
3. [ ] Enter name: `Test Voice Pro`
4. [ ] Enter description: `Test cartridge for validation`

### Tone & Attitude:
5. [ ] Click "Tone & Attitude" header to expand
6. [ ] Change formality dropdown to "Friendly"
7. [ ] Drag enthusiasm slider to 7
8. [ ] Verify label shows "7/10"
9. [ ] Drag empathy slider to 8
10. [ ] Verify label shows "8/10"

### Personality:
11. [ ] Click "Personality" header to expand
12. [ ] In "Voice Description" textarea, type: `Helpful and approachable expert`
13. [ ] In "Personality Traits" input, type `professional` and press Enter
14. [ ] Verify: "professional" badge appears
15. [ ] Add trait `helpful` (press Enter)
16. [ ] Add trait `clear` (press Enter)
17. [ ] Verify: 3 trait badges visible

### Live Preview:
18. [ ] Scroll down to "Live Preview" section
19. [ ] Verify: Preview shows "Friendly" formality
20. [ ] Verify: Preview shows enthusiasm 7/10
21. [ ] Verify: Preview shows empathy 8/10
22. [ ] Click "Personality" tab in preview
23. [ ] Verify: Shows 3 traits and voice description

### Save:
24. [ ] Click "Save Cartridge" button
25. [ ] Verify: Toast notification "Cartridge created successfully"
26. [ ] Verify: Modal closes
27. [ ] Verify: "Test Voice Pro" appears in cartridge list
28. [ ] Verify: Amber "user" badge next to name
29. [ ] Verify: "Active" badge (green)
30. [ ] Verify: Description shows: "Test cartridge for validation"

**If creation fails**: Check toast error message and console

---

## Test 3: Edit Cartridge (4 minutes)

**Goal**: Verify editing existing cartridge works

### Steps:
1. [ ] Find "Test Voice Pro" in the list
2. [ ] Click the three dots (⋮) dropdown button
3. [ ] Verify dropdown shows: Edit Voice, Duplicate, Auto-Generate, Delete
4. [ ] Click "Edit Voice"
5. [ ] Modal opens with title "Edit Voice Cartridge"
6. [ ] Verify: Name pre-filled with "Test Voice Pro"
7. [ ] Verify: Description pre-filled
8. [ ] Change name to: `Test Voice Pro - Updated`

### Vocabulary:
9. [ ] Click "Vocabulary & Language" header to expand
10. [ ] In "Words to Avoid" input, type `unfortunately` and press Enter
11. [ ] Verify: Red badge appears with "unfortunately"
12. [ ] In "Industry Terms" input, type `API` and press Enter
13. [ ] Add term: `machine learning` (press Enter)
14. [ ] Verify: 2 industry term badges visible

### Save:
15. [ ] Click "Save Cartridge" button
16. [ ] Verify: Toast "Cartridge updated successfully"
17. [ ] Verify: Modal closes
18. [ ] Verify: List shows "Test Voice Pro - Updated"

**If edit fails**: Check toast error and console

---

## Test 4: Form Validation (2 minutes)

**Goal**: Verify required field validation

### Steps:
1. [ ] Click "New Cartridge" button
2. [ ] Leave name field empty
3. [ ] Click "Save Cartridge"
4. [ ] Verify: Red alert appears: "Name is required"
5. [ ] Enter name: `Validation Test`
6. [ ] Click "Save Cartridge"
7. [ ] Verify: Saves successfully (toast appears)
8. [ ] Verify: "Validation Test" appears in list

**Expected**: Cannot save without name

---

## Test 5: Delete Cartridge (3 minutes)

**Goal**: Verify delete works and system cartridges are protected

### User Cartridge:
1. [ ] Find "Validation Test" cartridge in list
2. [ ] Click dropdown (⋮)
3. [ ] Click "Delete"
4. [ ] Verify: Browser confirmation dialog appears
5. [ ] Click "Cancel" → cartridge remains in list
6. [ ] Click dropdown → "Delete" again
7. [ ] Click "OK" on confirmation
8. [ ] Verify: Toast "Cartridge deleted successfully"
9. [ ] Verify: "Validation Test" removed from list

### System Cartridge Protection:
10. [ ] Find any cartridge with purple "system" badge (if exists)
11. [ ] Click dropdown (⋮)
12. [ ] Verify: "Delete" option is NOT in dropdown menu

**Expected**: User cartridges can be deleted, system cannot

---

## Test 6: Duplicate Cartridge (2 minutes)

**Goal**: Verify duplicate creates copy

### Steps:
1. [ ] Find "Test Voice Pro - Updated" in list
2. [ ] Click dropdown (⋮)
3. [ ] Click "Duplicate"
4. [ ] Verify: Toast "Cartridge duplicated successfully"
5. [ ] Verify: New cartridge appears with name "Test Voice Pro - Updated (Copy)"
6. [ ] Verify: Amber "user" badge
7. [ ] Click dropdown on original → "Edit Voice"
8. [ ] Note the voice parameters
9. [ ] Close modal
10. [ ] Click dropdown on duplicate → "Edit Voice"
11. [ ] Verify: Same voice parameters as original
12. [ ] Verify: Different cartridge (can edit independently)

**Expected**: Duplicate has same parameters but different ID

---

## Test 7: Live Preview (3 minutes)

**Goal**: Verify preview updates in real-time

### Steps:
1. [ ] Click "New Cartridge"
2. [ ] Enter name: `Preview Test`
3. [ ] Expand "Tone & Attitude"
4. [ ] Set enthusiasm to 3
5. [ ] Scroll to Live Preview
6. [ ] Click "Tone" tab in preview
7. [ ] Verify: Shows enthusiasm 3/10 with red progress bar
8. [ ] Scroll back up, change enthusiasm to 9
9. [ ] Scroll to preview
10. [ ] Verify: Shows enthusiasm 9/10 with green progress bar
11. [ ] Expand "Personality"
12. [ ] Add trait: `confident`
13. [ ] Scroll to preview → "Personality" tab
14. [ ] Verify: Shows "confident" badge
15. [ ] Cancel modal (don't save)

**Expected**: Preview updates immediately as you type/change

---

## Test 8: Progressive Disclosure (2 minutes)

**Goal**: Verify accordion sections work

### Steps:
1. [ ] Click "New Cartridge"
2. [ ] Verify: All 5 section headers visible
3. [ ] Verify: All sections collapsed by default (no controls visible)
4. [ ] Click "Tone & Attitude" header
5. [ ] Verify: Section expands, shows formality dropdown and sliders
6. [ ] Click "Tone & Attitude" header again
7. [ ] Verify: Section collapses
8. [ ] Expand "Writing Style"
9. [ ] Verify: Shows sentence length, paragraph structure, checkboxes
10. [ ] Expand all 5 sections
11. [ ] Verify: Can have multiple sections expanded at once
12. [ ] Cancel modal

**Expected**: Sections expand/collapse smoothly

---

## Test 9: Array Management (4 minutes)

**Goal**: Verify add/remove items in arrays

### Personality Traits:
1. [ ] Click "New Cartridge", enter name: `Array Test`
2. [ ] Expand "Personality"
3. [ ] Add trait: `confident` (press Enter)
4. [ ] Verify: Badge appears
5. [ ] Try typing `confident` again
6. [ ] Verify: Can add duplicate (or ideally, doesn't add duplicate)
7. [ ] Click × on one badge
8. [ ] Verify: Badge removed

### Industry Terms:
9. [ ] Expand "Vocabulary & Language"
10. [ ] Add term: `blockchain` (Enter)
11. [ ] Add term: `AI` (Enter)
12. [ ] Add term: `crypto` (Enter)
13. [ ] Verify: 3 badges visible
14. [ ] Click × on middle badge
15. [ ] Verify: Correct badge removed

### Banned Words:
16. [ ] Add banned word: `unfortunately` (Enter)
17. [ ] Add banned word: `sorry` (Enter)
18. [ ] Verify: Red badges appear
19. [ ] Click × to remove one
20. [ ] Verify: Removed

### Preferred Phrases:
21. [ ] Add phrase: `let me know` (Enter)
22. [ ] Verify: Shows in blue box with quotes
23. [ ] Click trash icon
24. [ ] Verify: Phrase removed
25. [ ] Cancel modal

**Expected**: All array inputs work with Enter key, remove with button

---

## Test 10: Slider Controls (2 minutes)

**Goal**: Verify sliders work smoothly

### Steps:
1. [ ] Click "New Cartridge", enter name: `Slider Test`
2. [ ] Expand "Tone & Attitude"
3. [ ] Drag enthusiasm slider to 0
4. [ ] Verify: Label shows "0/10"
5. [ ] Verify: Progress bar empty or red
6. [ ] Drag to 5
7. [ ] Verify: Label shows "5/10"
8. [ ] Verify: Progress bar yellow/orange (50%)
9. [ ] Drag to 10
10. [ ] Verify: Label shows "10/10"
11. [ ] Verify: Progress bar green (100%)
12. [ ] Repeat for empathy slider
13. [ ] Cancel modal

**Expected**: Sliders work smoothly with visual feedback

---

## Test 11: Quick Guide Tab (2 minutes)

**Goal**: Verify guide content displays

### Steps:
1. [ ] Click "Quick Guide" tab
2. [ ] Verify: 4 colored cards display:
   - Blue card: "What is a Voice Cartridge?"
   - Purple card: "Hierarchical Inheritance" (4 tiers listed)
   - Green card: "Quick Start" (numbered list 1-6)
   - Amber card: "Progressive Disclosure"
3. [ ] Verify: All text readable
4. [ ] Scroll through guide
5. [ ] Click "All Cartridges" tab
6. [ ] Verify: Returns to cartridge list

**Expected**: Guide is helpful and well-formatted

---

## Test 12: Hierarchy Visualization (2 minutes)

**Goal**: Verify tier grouping

### Steps:
1. [ ] View "All Cartridges" tab
2. [ ] Verify: Cartridges grouped by tier badges:
   - Purple = system
   - Blue = agency
   - Green = client
   - Amber = user
3. [ ] Verify: System cartridges (if any) appear first
4. [ ] Verify: User cartridges appear last
5. [ ] If parent-child relationships exist:
   - [ ] Verify: Expandable arrow (▶) appears for parent
   - [ ] Click arrow → expands children with indentation
   - [ ] Click arrow again → collapses

**Expected**: Clear visual hierarchy with tier colors

---

## Test 13: Toast Notifications (2 minutes)

**Goal**: Verify all operations show feedback

### Test each toast:
1. [ ] Create cartridge → "Cartridge created successfully" (green)
2. [ ] Edit cartridge → "Cartridge updated successfully" (green)
3. [ ] Duplicate cartridge → "Cartridge duplicated successfully" (green)
4. [ ] Delete cartridge → "Cartridge deleted successfully" (green)
5. [ ] Click "Auto-Generate" in dropdown → "Auto-generate feature coming soon..." (blue info)

**Expected**: Every action gives user feedback

---

## Test 14: Error Handling (3 minutes)

**Goal**: Verify errors display properly

### Network Error:
1. [ ] Open DevTools (F12)
2. [ ] Go to Network tab
3. [ ] Set throttling to "Offline"
4. [ ] Try to create a cartridge
5. [ ] Verify: Error toast appears
6. [ ] Set throttling back to "No throttling"

### Validation Error:
7. [ ] Create cartridge with empty name
8. [ ] Verify: Red alert "Name is required"

### API Error (if possible):
9. [ ] Try to edit a cartridge that doesn't exist (manually change URL)
10. [ ] Verify: Appropriate error message

**Expected**: All errors show user-friendly messages

---

## Test 15: Responsive Design (3 minutes)

**Goal**: Verify mobile/tablet views work

### Desktop (1920px):
1. [ ] Full screen browser
2. [ ] Verify: Table fits without horizontal scroll
3. [ ] Verify: All columns visible

### Tablet (768px):
4. [ ] Resize browser to ~768px width (or use DevTools device emulation)
5. [ ] Verify: Table still usable
6. [ ] Open edit modal
7. [ ] Verify: Modal readable

### Mobile (375px):
8. [ ] Resize to ~375px width
9. [ ] Verify: Page doesn't break
10. [ ] Open edit modal
11. [ ] Verify: Modal scrollable
12. [ ] Verify: All controls accessible

**Expected**: UI adapts to different screen sizes

---

## Cleanup (1 minute)

Delete test cartridges:
- [ ] Delete "Test Voice Pro - Updated"
- [ ] Delete "Test Voice Pro - Updated (Copy)"
- [ ] Delete any other test cartridges created

---

## Results Summary

**Total Tests**: 15
**Passed**: _____ / 15
**Failed**: _____ / 15

### Bugs Found:
(List any issues discovered)

1.
2.
3.

### Overall Assessment:
- [ ] All critical tests passed (Tests 1-5)
- [ ] All important tests passed (Tests 6-10)
- [ ] Nice-to-have tests passed (Tests 11-15)
- [ ] No major bugs found
- [ ] Ready for production

### Confidence Level:
- [ ] 95%+ - All tests passed, ready for production
- [ ] 85-95% - Minor issues, ready with fixes
- [ ] 70-85% - Some issues, needs work
- [ ] <70% - Major issues, not ready

---

## Next Steps

### If All Tests Pass ✅:
1. Mark B-04 task as "review" in Archon
2. Document any minor issues for future improvements
3. Proceed to C-01 (LinkedIn Voice Generator)

### If Tests Fail ❌:
1. Document bug reproduction steps
2. Create GitHub issues for each bug
3. Fix bugs before proceeding
4. Re-run affected tests

---

**Testing Complete!**

Report results to: B-04 Validation Report
