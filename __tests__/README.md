# C-02 Comment Polling System - Test Suite

This directory contains the comprehensive test suite for the C-02 Comment Polling System.

## Overview

The test suite validates:
- Bot detection and filtering
- Generic comment detection
- Trigger word matching (case-insensitive, whole-word)
- Comment processing pipeline
- Queue infrastructure
- API endpoints
- Unipile client integration

## Test Files

### `comment-processor.test.ts` (54 tests)
Tests the core comment processing logic:
- `detectBot()` - Bot detection with cumulative scoring
- `isGenericComment()` - Generic comment filtering
- `detectTriggerWords()` - Trigger word matching
- `processComment()` - Single comment processing
- `processComments()` - Batch processing
- `filterNewComments()` - Deduplication

**Coverage**: 100% - All functions, branches, and lines

### `unipile-client.test.ts` (18 tests)
Tests the Unipile API client:
- Mock mode functionality
- Production mode API calls
- Error handling
- Edge cases (long text, emojis, special characters)

**Coverage**: 29.23% - Focused on comment fetching only

### `comment-polling-queue.test.ts` (11 tests)
Tests the BullMQ queue infrastructure:
- Job creation and scheduling
- Queue management (start/stop)
- Randomization logic
- Working hours check
- Error handling

**Note**: Uses mocks for BullMQ and Redis

### `comment-polling-api.test.ts` (16 tests)
Tests the API endpoints:
- POST /api/comment-polling (start/stop actions)
- GET /api/comment-polling (status)
- Input validation
- Error responses

**Coverage**: 100% - All endpoints and error paths

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test comment-processor.test.ts
```

### Run in Watch Mode
```bash
npm run test:watch
```

### Run with Coverage Report
```bash
npm run test:coverage
```

### TypeScript Type Check
```bash
npm run typecheck
```

## Test Environment

Tests run with:
- **Mock Mode**: `UNIPILE_MOCK_MODE=true` (set in `jest.setup.js`)
- **Redis URL**: `redis://localhost:6379` (mocked in queue tests)
- **Node Environment**: `node` (configured in `jest.config.js`)

## Coverage Goals

| Component | Target | Actual | Status |
|-----------|--------|--------|--------|
| Comment Processor | 100% | 100% | ✅ |
| API Route | 100% | 100% | ✅ |
| Unipile Client | 80% | 29.23% | ⚠️ (Mock mode only) |
| Queue Infrastructure | N/A | Mocked | ⚠️ (Requires integration) |

## Edge Cases Tested

### Bot Detection
- Missing headline field
- Missing connections_count field
- Multiple bot signals (cumulative scoring)
- Emoji-only comments
- Very short comments

### Trigger Word Matching
- Case-insensitive matching
- Whole-word matching (prevents "escalate" matching "SCALE")
- Punctuation handling
- Empty arrays
- Multiple trigger words

### API Validation
- Missing required fields
- Empty trigger words array
- Invalid actions
- Queue errors

### Unipile Client
- Very long text (10,000+ characters)
- Emojis and special characters
- Network failures
- API errors (401, etc.)

## Known Limitations

1. **Redis Integration**: Queue tests use mocks; live Redis not tested
2. **Unipile API**: Production mode uses fetch mocks; live API not tested
3. **Worker Jobs**: BullMQ worker behavior not observed
4. **Timing**: Schedule randomization validated mathematically only

## Adding New Tests

### Test Structure
```typescript
describe('Component Name', () => {
  describe('functionName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = ...;

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Best Practices
1. Use descriptive test names ("should X when Y")
2. Follow Arrange-Act-Assert pattern
3. Test one thing per test
4. Include edge cases
5. Mock external dependencies
6. Keep tests simple and readable

## Troubleshooting

### Tests Failing Locally
1. Check Node version (requires Node 18+)
2. Run `npm install` to ensure dependencies are up-to-date
3. Check environment variables in `jest.setup.js`

### Coverage Not Generating
1. Ensure `jest.config.js` has correct paths
2. Check `collectCoverageFrom` configuration
3. Run `npm run test:coverage` (not just `npm test`)

### TypeScript Errors
1. Run `npm run typecheck` to see all errors
2. Ensure types are imported correctly
3. Check `tsconfig.json` configuration

## Integration Testing

For full system validation, additional integration tests are needed:

1. **Redis Integration**: Test with live Redis instance
2. **Unipile API**: Test with real Unipile API credentials
3. **Worker Jobs**: Observe BullMQ worker over time
4. **End-to-End**: Full flow from comment detection to DM queue

See `docs/validation/C02_COMMENT_POLLING_VALIDATION_REPORT.md` for details.

## Resources

- [Jest Documentation](https://jestjs.io/)
- [TypeScript Testing](https://jestjs.io/docs/getting-started#via-ts-jest)
- [BullMQ Testing](https://docs.bullmq.io/guide/testing)
- [Next.js API Testing](https://nextjs.org/docs/app/building-your-application/testing)

---

**Last Updated**: 2025-11-05
**Test Suite Version**: 1.0.0
**Maintainer**: Claude Code
