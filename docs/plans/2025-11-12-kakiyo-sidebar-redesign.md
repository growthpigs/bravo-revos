# Kakiyo Sidebar Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign dashboard sidebar to match Kakiyo aesthetic (compact menu items, user profile at bottom, cleaner spacing) while maintaining light mode.

**Architecture:** Refactor existing dashboard-sidebar.tsx to reduce padding, increase section spacing, move user profile to sticky bottom with "Book a Demo" button above it. Sign out moves to dropdown menu from three-dot icon.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui (DropdownMenu, Avatar), lucide-react icons

**Reference Screenshot:** `/Users/rodericandrews/Library/Containers/com.linebreak.CloudAppMacOSX/Data/Library/Caches/com.linebreak.CloudAppMacOSX/draggingCache/019a7690-c5ec-7342-b21d-498cba50c717/Zight 2025-11-12 at 6.36.30 AM.jpg`

---

## Design Analysis from Kakiyo Screenshot

**Key observations:**
- Menu items are much more compact (less vertical padding)
- Section titles are smaller and more subtle
- More vertical spacing between sections
- User profile is a card stuck to bottom with:
  - Avatar with initials
  - User name and email
  - Three-dot menu icon for actions
- "Book a Demo" button above user profile (blue, rounded)
- Overall feel: spacious, modern, clean

**Our adaptation (light mode):**
- Use same compact spacing
- Light gray backgrounds instead of dark
- Blue accent for active states and buttons
- Profile card with subtle border and background

---

## Task 1: Reduce Menu Item Padding and Section Spacing

**Files:**
- Modify: `components/dashboard/dashboard-sidebar.tsx`

**Step 1: Update menu item padding**

Find the menu item Link component (around line 135):

```typescript
className={cn(
  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
  isActive
    ? 'bg-gray-100 text-gray-900 font-semibold'
    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
)}
```

Change to more compact spacing:

```typescript
className={cn(
  'flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
  isActive
    ? 'bg-blue-50 text-blue-900 font-semibold'
    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
)}
```

**Step 2: Make icons smaller**

Find icon rendering (around line 142):

```typescript
<item.icon className="h-5 w-5 flex-shrink-0" />
```

Change to:

```typescript
<item.icon className="h-4 w-4 flex-shrink-0" />
```

**Step 3: Update section header styling**

Find section title (around line 123):

```typescript
<h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
  {section.title}
</h3>
```

Change to more subtle:

```typescript
<h3 className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
  {section.title}
</h3>
```

**Step 4: Increase section spacing**

Find outer nav container (around line 119):

```typescript
<nav className="space-y-6">
```

Change to:

```typescript
<nav className="space-y-7">
```

**Step 5: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | grep -A 5 'dashboard-sidebar' || echo "No errors in sidebar"
```

Expected: No TypeScript errors

**Step 6: Commit compact menu changes**

```bash
git add components/dashboard/dashboard-sidebar.tsx
git commit -m "refactor(sidebar): reduce menu item padding for Kakiyo compact design

- Change menu padding from py-2 to py-1.5
- Reduce icon size from h-5 to h-4
- Make section headers more subtle (text-[10px], text-gray-400)
- Increase section spacing from space-y-6 to space-y-7"
```

---

## Task 2: Create User Profile Card at Bottom

**Files:**
- Modify: `components/dashboard/dashboard-sidebar.tsx`

**Step 1: Add DropdownMenu import**

At top of file (around line 10), add:

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
```

**Step 2: Add MoreVertical icon import**

In lucide-react imports (around line 11), add:

```typescript
import {
  // ... existing icons
  MoreVertical,
} from 'lucide-react'
```

**Step 3: Remove old user profile section**

Find and DELETE the old user profile section (around lines 194-213):

```typescript
{/* User Profile Section */}
<div className="px-3 py-4 mt-12">
  <div className="flex flex-col gap-2 mb-3">
    <p className="text-xs font-medium text-gray-500 truncate">
      {user?.full_name || user?.email}
    </p>
    <p className="text-xs text-gray-400 capitalize">
      {user?.role?.replace('_', ' ')}
    </p>
  </div>
  <Button
    variant="ghost"
    size="sm"
    className="w-auto text-gray-500 hover:text-gray-600 hover:bg-gray-100 h-8 px-3"
    onClick={handleSignOut}
  >
    <LogOut className="h-3 w-3 mr-2" />
    Sign Out
  </Button>
</div>
```

**Step 4: Add new bottom section structure**

After the closing `</nav>` tag (around line 161), BEFORE the `</ScrollArea>`, add:

```typescript
      </nav>
    </ScrollArea>

    {/* Bottom Section - Book a Demo + User Profile */}
    <div className="mt-auto border-t border-gray-200 bg-white">
      {/* Book a Demo Button */}
      <div className="p-3">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-sm font-medium"
          disabled
        >
          <Calendar className="h-4 w-4 mr-2" />
          Book a Demo
        </Button>
      </div>

      {/* User Profile Card */}
      <div className="p-3 pt-0">
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
          {/* Avatar */}
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
              {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() ||
               user?.email?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.full_name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email}
            </p>
          </div>

          {/* Three-dot Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-200 rounded-md"
              >
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  </div>
)
```

**Step 5: Update main container to use flexbox**

Find the outer div (around line 116):

```typescript
<div className="flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0 pt-16">
```

Change to ensure bottom section sticks:

```typescript
<div className="flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0 pt-16">
```

**Step 6: Update ScrollArea to flex-1**

Find ScrollArea (around line 118):

```typescript
<ScrollArea className="flex-1 px-3 py-4">
```

Keep as-is (already flex-1)

**Step 7: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | grep -A 5 'dashboard-sidebar' || echo "No errors in sidebar"
```

Expected: No TypeScript errors

**Step 8: Commit user profile card**

```bash
git add components/dashboard/dashboard-sidebar.tsx
git commit -m "feat(sidebar): add Kakiyo-style user profile card at bottom

- Create sticky bottom section with Book a Demo button
- Add user profile card with avatar, name, email
- Move Sign Out to dropdown menu from three-dot icon
- Profile card has gray background and hover state
- Avatar shows user initials with blue background"
```

---

## Task 3: Adjust Badge Styling

**Files:**
- Modify: `components/dashboard/dashboard-sidebar.tsx`

**Step 1: Update badge styling**

Find badge rendering (around line 145):

```typescript
{item.badge && (
  <span className={cn(
    "text-xs px-2 py-0.5 rounded font-semibold",
    item.badge === "NEW"
      ? "bg-blue-100 text-blue-700"
      : "bg-gray-200 text-gray-600"
  )}>
    {item.badge}
  </span>
)}
```

Change to smaller, more subtle:

```typescript
{item.badge && (
  <span className={cn(
    "text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase",
    item.badge === "NEW"
      ? "bg-blue-100 text-blue-700"
      : "bg-gray-200 text-gray-500"
  )}>
    {item.badge}
  </span>
)}
```

**Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | grep -A 5 'dashboard-sidebar' || echo "No errors"
```

Expected: No TypeScript errors

**Step 3: Commit badge refinements**

```bash
git add components/dashboard/dashboard-sidebar.tsx
git commit -m "style(sidebar): refine badge styling for Kakiyo design

- Reduce badge text size to text-[10px]
- Reduce horizontal padding to px-1.5
- Add uppercase to badge text
- Lighten gray badge text color"
```

---

## Task 4: Manual Browser Testing with Playwright

**Files:**
- None (browser testing only)

**Step 1: Navigate to dashboard**

URL: `http://localhost:3000/dashboard`

**Step 2: Verify compact menu items**

Check:
- ✅ Menu items have less vertical space (should feel tighter)
- ✅ Icons are smaller (4x4 instead of 5x5)
- ✅ Gap between icon and text is smaller
- ✅ Section headers are more subtle and smaller

**Step 3: Verify section spacing**

Check:
- ✅ More space between sections (OUTREACH, AI TRAINING, etc.)
- ✅ Sections feel distinct from each other

**Step 4: Verify bottom section**

Check:
- ✅ "Book a Demo" button appears above user profile
- ✅ Book a Demo is blue with calendar icon
- ✅ Button is disabled (grayed out interaction)
- ✅ User profile card shows avatar with initials
- ✅ User name and email displayed correctly
- ✅ Three-dot menu icon visible on right
- ✅ Profile card has gray background
- ✅ Hover over profile card shows darker gray

**Step 5: Test dropdown menu**

Check:
- ✅ Click three-dot icon
- ✅ Dropdown appears with "Sign Out" option
- ✅ Click "Sign Out" triggers sign out
- ✅ Redirects to login page

**Step 6: Check active states**

Check:
- ✅ Active menu item has blue background
- ✅ Hover states work on all menu items
- ✅ Badge styling looks clean and subtle

**Step 7: Capture screenshots**

Take screenshots:
1. Full sidebar view showing compact menu and bottom section
2. Sidebar with dropdown menu open
3. Active menu item state

---

## Task 5: Final Verification

**Files:**
- None (verification only)

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: Existing errors only (not in sidebar files)

**Step 2: Check git status**

```bash
git status
```

Expected: Clean working directory (all changes committed)

**Step 3: Review all commits**

```bash
git log --oneline -5
```

Expected: See 3 commits:
1. "refactor(sidebar): reduce menu item padding for Kakiyo compact design"
2. "feat(sidebar): add Kakiyo-style user profile card at bottom"
3. "style(sidebar): refine badge styling for Kakiyo design"

**Step 4: Test sidebar on multiple pages**

Navigate to:
- `/dashboard` - verify sidebar looks correct
- `/dashboard/campaigns` - verify active state
- `/dashboard/offers` - verify consistency
- `/dashboard/leads` - verify all sections visible

Expected: Sidebar looks consistent across all pages with Kakiyo compact design

---

## Success Criteria

- ✅ Menu items are compact with reduced padding (py-1.5 instead of py-2)
- ✅ Icons are smaller (4x4 instead of 5x5)
- ✅ Section headers are subtle (10px, gray-400)
- ✅ More space between sections (space-y-7)
- ✅ User profile card at bottom with avatar, name, email
- ✅ "Book a Demo" button above profile (disabled)
- ✅ Sign Out moved to dropdown from three-dot icon
- ✅ Profile card has gray background and hover state
- ✅ Badge styling is smaller and more subtle
- ✅ Overall feel matches Kakiyo compact design
- ✅ All functionality works (navigation, sign out)
- ✅ Light mode maintained (not dark like Kakiyo)

---

## Notes for Engineer

**Design Philosophy:**
- Kakiyo uses dark mode, we're adapting to light mode
- Keep same spacing/sizing but use light colors
- Blue accents instead of dark backgrounds
- Focus on clean, spacious feel

**Key Changes:**
1. **Spacing**: Everything more compact vertically
2. **Bottom section**: Replaces inline user info
3. **Profile card**: New component with avatar and dropdown
4. **Visual hierarchy**: Subtle section headers, clear active states

**Future Enhancements:**
- Connect "Book a Demo" to Calendly/booking system
- Add profile settings to dropdown menu
- Add keyboard shortcuts for navigation
- Consider collapsible sections for long menus
