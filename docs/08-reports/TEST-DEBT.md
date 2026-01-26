# Test Debt Tracker

**Last Updated:** 2026-01-22
**Status:** 48 test files temporarily skipped in jest.config.js

---

## Summary

48 test suites are temporarily skipped due to outdated Supabase mocks. These tests use the `mockReturnThis()` pattern which doesn't work correctly for chainable query builders.

## Root Cause

The tests use:
```javascript
mockSupabase = {
  from: jest.fn().mockReturnThis(),  // ❌ Returns wrong `this`
  select: jest.fn().mockReturnThis(),
  ...
};
```

Should be:
```javascript
const queryBuilder = { select: jest.fn(), limit: jest.fn(), ... };
queryBuilder.select.mockReturnValue(queryBuilder);
mockSupabase = {
  from: jest.fn().mockReturnValue(queryBuilder),  // ✅ Returns queryBuilder
  ...
};
```

## Fix Strategy

1. **Use shared mock helper** - Created `__tests__/helpers/supabase-mock.ts`
2. **Update tests incrementally** - Fix one suite at a time
3. **Remove from ignore list** - As each suite is fixed

## Skipped Test Categories

### Admin Tests (3 files)
- `__tests__/admin-unipile-config.test.tsx`
- `__tests__/admin/users.test.tsx`
- `__tests__/app/admin/users-page.test.tsx`

### API Tests (14 files)
- `__tests__/api/admin/create-user-direct.test.ts`
- `__tests__/api/cartridges-style-upload.test.ts`
- `__tests__/api/conversation-intelligence.test.ts`
- `__tests__/api/dm-sequences.test.ts`
- `__tests__/api/gemini/*` (3 files)
- `__tests__/api/hgc-e2e.test.ts`
- `__tests__/api/hgc-phase2.test.ts`
- `__tests__/api/hgc-typescript-integration.test.ts`
- `__tests__/api/hgc-v2/session-*.test.ts` (3 files)
- `__tests__/api/linkedin-*.test.ts` (3 files)
- `__tests__/api/mem0.integration.test.ts`

### Component Tests (6 files)
- `__tests__/components/cartridge-list.test.tsx`
- `__tests__/components/chat-message.test.tsx`
- `__tests__/components/floating-chat-bar*.test.tsx` (2 files)
- `__tests__/components/linkedin-connection-checker.test.tsx`
- `__tests__/components/pod-activity.test.tsx`
- `__tests__/components/slash-command-autocomplete.test.tsx`

### Integration Tests (25 files)
- Various integration, e2e, and lib tests
- See `jest.config.js` for full list

## Progress Tracking

| Date | Suites Fixed | Remaining |
|------|--------------|-----------|
| 2026-01-22 | 1 (api-health) | 48 |

## How to Fix a Test

1. Open the failing test file
2. Replace `mockReturnThis()` with `mockReturnValue(queryBuilder)`
3. Create a proper chainable `queryBuilder` object
4. Run the specific test: `npm test -- --testPathPattern="<filename>"`
5. Remove from `testPathIgnorePatterns` in `jest.config.js`
6. Update this doc

## Related Files

- `jest.config.js` - Contains `testPathIgnorePatterns`
- `__tests__/helpers/supabase-mock.ts` - Shared mock helper
- `__tests__/health/api-health.test.ts` - Example of fixed test
