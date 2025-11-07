# Campaign Creation UX Feedback & Improvements

**Date:** 2025-11-07
**User Walk-Through:** Campaign Creation Flow
**Reference:** Wallaxy-style improvements

---

## 🔴 CRITICAL BUGS

### 1. Campaign Creation Fails with RLS Error
**Error:** `error creating campaign: failed to fetch user data. Infinite recursion detected in policy for relation users`

**Impact:** Users cannot launch campaigns at all
**Root Cause:** RLS policy circular reference (likely in campaign creation)
**Fix Required:** Debug and fix RLS policies to prevent infinite recursion
**Severity:** BLOCKER - Must fix before any testing

---

## 🟠 HIGH PRIORITY UX IMPROVEMENTS

### 2. Enter Key Should Auto-Continue (Keyboard Navigation)
**Current:** Must click "Continue" button with mouse
**Expected:** Pressing Enter should trigger Continue action
**Fields Affected:**
- Campaign name field
- Lead magnet title field
- Any text input followed by Continue button

**Implementation:** Add `onKeyDown` handlers to submit forms with Enter key

---

### 3. File Upload Click Area Too Small
**Current:** Must click on exact text "Click to Upload"
**Expected:** Entire upload container/div should be clickable
**Reason:** Better UX, matches modern upload patterns (Dropzone.js style)

**Implementation:** Make entire upload box a clickable/draggable zone

---

### 4. Breadcrumb Responsive Design (< 900px)
**Current:** Full breadcrumb text breaks layout on mobile/responsive
**Expected:** Show only numbers in circles, hide text labels

**Breakpoint:** < 900px viewport width
**Elements:** Hide breadcrumb text, keep circle numbers visible

---

### 5. DM Message Configuration - Redesign Needed
**Current Issue:** Three separate input fields, unclear structure
**Expected:**
- Message 1: Immediate (ask for email)
- Message 2: 24 hours later (optional follow-up)
- Message 3: 48+ hours later (alternate if no response)

**UI Changes:**
- Message 1 and Message 2 should be stacked immediately
- Message 3 (backup sequence) should be separate below with toggle
- Message 2 label: "Optional follow-up message" (directly under Message 1)

---

### 6. Email Collection - Add Preset Options
**Current:** Free text input for email request message
**Expected:** Three preset pill buttons for different tones:

```
Casual:      "What's your email?"
Professional: "Please share your email address"
Formal:      "May I have your email?"
```

Allow users to **click** pills to select, or keep as dropdown if preferred

---

### 7. Merge Tags/Variables - Add Helper UI
**Current:** Users must manually type merge tags
**Expected:** Clickable merge tag buttons in text input area

**Available Tags:**
- `{first_name}` - User's first name
- `{email}` - User's email
- `{lead_magnet_title}` - Current lead magnet title
- `{campaign_name}` - Campaign name

**Implementation:** Add small button/icon next to text inputs to insert tags

---

## 🟡 MEDIUM PRIORITY IMPROVEMENTS

### 8. Remove "Integromat" from Webhook Options
**Current:** Zapier, Make, Integromat, ConvertKit, Custom
**Action:** Remove Integromat (deprecated name for Make)

---

### 9. Content Generation - Not Actually AI
**Current:** "Generate with AI" completes instantly (hardcoded)
**Note:** This may be intentional for demo, but should be documented

---

### 10. Toast Notifications Missing
**Current:** No error messages shown to user when campaign creation fails
**Expected:** Toast notifications for:
- Campaign creation errors
- Validation errors
- Success messages

---

## 📊 UX PATTERN RESEARCH NEEDED

### Research Task: Wallaxy Campaign Creation Flow
- Document their DM message configuration UI
- Study their email/merge tag implementation
- Note their keyboard navigation patterns
- Screenshot their responsive design approach

**User Request:** "Log in to Wallaxy and show me what they do"

---

## 📝 IMPLEMENTATION PRIORITY

| Priority | Issue | Component | Est. Time |
|----------|-------|-----------|-----------|
| 🔴 P0 | RLS Infinite Recursion | API/Database | 30 min |
| 🟠 P1 | Enter Key Auto-Continue | Campaign Form | 15 min |
| 🟠 P1 | Upload Click Area | File Upload | 10 min |
| 🟠 P1 | DM Message Redesign | DM Config | 45 min |
| 🟠 P1 | Email Presets | DM Config | 15 min |
| 🟡 P2 | Breadcrumb Responsive | Layout | 10 min |
| 🟡 P2 | Merge Tags Helper | DM Config | 20 min |
| 🟡 P2 | Toast Notifications | Global | 15 min |
| 🟡 P3 | Remove Integromat | Webhook Select | 2 min |

---

## 🎯 NEXT STEPS

1. **Fix RLS recursion error** (BLOCKER)
2. **Research Wallaxy's UX patterns**
3. **Redesign DM message configuration**
4. **Implement keyboard navigation**
5. **Add toast notifications**
