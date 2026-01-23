# App Switcher Fix - Implementation Plan

**Created:** 2026-01-23
**Status:** READY FOR IMPLEMENTATION
**Priority:** HIGH

---

## Problem Summary

The app switcher dropdown is:
1. **Over-engineered** - Shows both apps with checkmarks when it should only show the OTHER app
2. **Wrong routing** - AudienceOS store uses `/dashboard` instead of `/revos`
3. **Redundant UI** - Showing current app with checkmark is obvious and unnecessary

---

## User's Vision

**Simple dropdown behavior:**
- When on RevOS → Click dropdown → See only `audienceOS` logo → Click to switch
- When on AudienceOS → Click dropdown → See only `revOS` logo → Click to switch

**Logo format (Poppins font):**
- `rev` (semibold) + `OS` (light, gradient) = `revOS`
- `audience` (semibold) + `OS` (light, gradient) = `audienceOS`

---

## Files to Modify

### 1. `stores/audienceos/app-store.ts`

**Change:** Line 44, `basePath: '/dashboard'` → `basePath: '/revos'`

```typescript
// BEFORE:
revos: {
  ...
  basePath: '/dashboard', // WRONG
  isNative: false,
},

// AFTER:
revos: {
  ...
  basePath: '/revos', // CORRECT
  isNative: false,
},
```

### 2. `components/app-switcher.tsx` (RevOS version)

**Change:** Simplify dropdown to show ONLY the other app

```typescript
// BEFORE: Maps over ALL apps, shows checkmark for current

// AFTER: Only shows the OTHER app (audienceos when on revos)
const otherConfig = APP_CONFIGS['audienceos'] // Hardcode - this is RevOS deployment

<DropdownMenuContent>
  <DropdownMenuItem onClick={() => handleAppSwitch('audienceos')}>
    <span style={{ fontFamily: 'var(--font-poppins)' }}>
      <span className="font-semibold">audience</span>
      <span className="font-light" style={{ backgroundImage: otherConfig.gradient }}>OS</span>
    </span>
    <ArrowUpRight className="w-3 h-3 text-gray-400" />
  </DropdownMenuItem>
</DropdownMenuContent>
```

### 3. `components/audienceos/app-switcher.tsx` (AudienceOS version)

**Change:** Same simplification - show ONLY `revOS`

```typescript
// Only shows revOS (the other app from AudienceOS perspective)
const otherConfig = APP_CONFIGS['revos']

<DropdownMenuContent>
  <DropdownMenuItem onClick={() => handleAppSwitch('revos')}>
    <span style={{ fontFamily: 'var(--font-poppins)' }}>
      <span className="font-semibold">rev</span>
      <span className="font-light" style={{ backgroundImage: otherConfig.gradient }}>OS</span>
    </span>
    <ArrowUpRight className="w-3 h-3 text-gray-400" />
  </DropdownMenuItem>
</DropdownMenuContent>
```

---

## Implementation Checklist

- [ ] Update `stores/audienceos/app-store.ts` - Fix basePath to `/revos`
- [ ] Simplify `components/app-switcher.tsx` - Show only audienceOS
- [ ] Simplify `components/audienceos/app-switcher.tsx` - Show only revOS
- [ ] Test: RevOS → Click → AudienceOS (verify URL is `/audienceos`)
- [ ] Test: AudienceOS → Click → RevOS (verify URL is `/revos`)
- [ ] Verify Poppins font renders correctly
- [ ] Commit with message: `fix: Simplify app switcher - show only other app, fix routing paths`

---

## Routing Architecture Confirmation

**Correct paths (already in RevOS store):**
- `/revos` - RevOS dashboard
- `/audienceos` - AudienceOS dashboard

**Both stores should have these same basePaths:**
- RevOS store: ✅ Already correct
- AudienceOS store: ❌ Needs `/dashboard` → `/revos` fix

---

## Testing

After implementation, test on `ra-diiiploy.vercel.app`:

1. Go to RevOS dashboard
2. Click app switcher dropdown
3. Should see ONLY "audienceOS" with arrow icon
4. Click → Should navigate to `/audienceos`
5. Click app switcher dropdown
6. Should see ONLY "revOS" with arrow icon
7. Click → Should navigate to `/revos`

---

## Notes

- No need for `getOtherConfig()` computed property - each switcher knows its other app
- Removed: Checkmarks, emojis, descriptions in dropdown
- Kept: Poppins font, gradient on "OS" suffix, ArrowUpRight icon
