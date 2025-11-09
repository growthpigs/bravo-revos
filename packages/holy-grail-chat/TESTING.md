# Holy Grail Chat Phase 2 - Testing Guide

## Overview

This document describes the comprehensive test suite for HGC Phase 2, which validates the integration of AgentKit + Mem0 + RevOS tools.

## Test Structure

```
packages/holy-grail-chat/
  tests/
    test_orchestrator.py    # Python orchestrator unit tests
    test_runner.py          # Python runner unit tests
    run_tests.sh            # Bash script to run Python tests

__tests__/
  api/
    hgc-phase2.test.ts      # TypeScript API integration tests
    hgc-e2e.test.ts         # End-to-end conversation tests
```

## Running Tests

### Python Unit Tests

```bash
# Run from project root
cd packages/holy-grail-chat/tests
./run_tests.sh

# Or run directly with Python
/opt/homebrew/bin/python3.11 -m unittest discover -s . -p "test_*.py" -v
```

**Tests covered:**
- ✅ Orchestrator initialization (8 tools: 2 memory + 6 RevOS)
- ✅ Memory key scoping (pod::user format)
- ✅ Conversation history passing
- ✅ Error handling
- ✅ Memory tool functionality (save/search)
- ✅ Memory isolation between users
- ✅ RevOS tools initialization
- ✅ Campaign tools (draft status safety)
- ✅ Post scheduling (queued status safety)

### TypeScript Integration Tests

```bash
# Run API integration tests
npm test -- hgc-phase2

# Or run all tests
npm test
```

**Tests covered:**
- ✅ Authentication (401 for unauthenticated)
- ✅ Session validation
- ✅ Request validation (messages required)
- ✅ User data lookup
- ✅ Python process spawning
- ✅ Context passing to Python
- ✅ Word-by-word streaming
- ✅ Error handling (Python errors)
- ✅ Stderr logging for debugging
- ✅ Default pod_id fallback
- ✅ Health check endpoint

### End-to-End Tests

**Note:** E2E tests require real API keys and are skipped by default.

```bash
# Set environment variables
export MEM0_API_KEY=m0-InfquYnYd7rl3YT2ytHXETxNLHxouLHZusRP1Wk6
export OPENAI_API_KEY=sk-proj-...

# Run E2E tests
npm test -- hgc-e2e
```

**Tests covered:**
- ✅ Single user message handling
- ✅ Conversation context maintenance
- ✅ Memory isolation between users
- ✅ Memory persistence across sessions
- ✅ Error handling (missing env vars)
- ✅ Invalid JSON handling

## Test Coverage

### Python Components

| Component | Coverage | Tests |
|-----------|----------|-------|
| HGCOrchestrator | ✅ | 4 unit tests |
| Memory Tools | ✅ | 3 unit tests |
| RevOS Tools | ✅ | 4 unit tests |
| Runner | ✅ | 5 unit tests |

**Total Python Tests:** 16

### TypeScript Components

| Component | Coverage | Tests |
|-----------|----------|-------|
| API Route (POST) | ✅ | 10 integration tests |
| API Route (GET) | ✅ | 1 test |
| E2E Flow | ✅ | 5 tests (require API keys) |

**Total TypeScript Tests:** 16

## Critical Test Scenarios

### 1. Memory Scoping
```python
# test_orchestrator.py::TestMemoryTools::test_memory_isolation
# Verifies: pod-123::user-1 ≠ pod-123::user-2
```

### 2. Conversation History
```typescript
// hgc-phase2.test.ts::Python Orchestrator Integration
// Verifies: Full message array passed to Python
```

### 3. Mem0 v2 API
```python
# test_orchestrator.py::TestMemoryTools::test_search_memory_tool
# Verifies: Uses filters parameter (not user_id)
```

### 4. Safety Controls
```python
# test_orchestrator.py::TestRevOSTools
# Verifies: create_campaign → draft, schedule_post → queued
```

### 5. Error Recovery
```typescript
// hgc-phase2.test.ts::Python Orchestrator Integration
// Verifies: Python errors logged, stream handles gracefully
```

## Test Execution Times

- **Python unit tests:** ~2 seconds
- **TypeScript integration tests:** ~5 seconds
- **E2E tests (with API calls):** ~30-60 seconds per test

## Debugging Tests

### Python Tests

Add print statements to see test execution:
```python
import sys
print(f"[TEST] Debug info", file=sys.stderr)
```

### TypeScript Tests

Enable verbose logging:
```bash
npm test -- --verbose
```

View test output:
```bash
npm test -- --no-coverage
```

## Test Data

### Mock Users
- `test-user-123`, `test-user-456`
- `test-pod-123`, `test-pod-456`

### Mock API Keys
- `test-mem0-key`
- `test-openai-key`
- `test-auth-token`

### Real Test Data (E2E)
- User IDs: `test-user-e2e-${timestamp}`
- Pod IDs: `test-pod-e2e-1`, `test-pod-context`, etc.

## Continuous Integration

To run in CI:

```yaml
# Example GitHub Actions workflow
- name: Install Python dependencies
  run: |
    python3.11 -m pip install mem0ai agents openai

- name: Run Python tests
  run: |
    cd packages/holy-grail-chat/tests
    python3.11 -m unittest discover -s . -p "test_*.py"

- name: Run TypeScript tests
  run: npm test
```

## Known Limitations

1. **E2E tests require API keys** - Skipped in CI unless secrets configured
2. **Python path hardcoded** - Uses `/opt/homebrew/bin/python3.11` for macOS
3. **Memory persistence tests** - Require 2-second delay for Mem0 sync
4. **Mock limitations** - Some agent behavior can't be tested without real LLM

## Troubleshooting

### Python import errors
```bash
# Ensure you're in the right directory
cd packages/holy-grail-chat/tests
# Check Python path
which python3.11
```

### Jest tests not finding modules
```bash
# Check Jest config
cat jest.config.js
# Verify moduleNameMapper includes @/ alias
```

### E2E tests timing out
```bash
# Increase timeout in test file
testOrSkip('test name', async () => {
  // ...
}, 60000) // 60 seconds
```

## Next Steps

Future test improvements:
1. Add performance benchmarks
2. Add load testing for concurrent conversations
3. Add memory consistency tests
4. Add RevOS API endpoint mocks
5. Add conversation quality metrics

## Test Checklist

Before marking phase complete:

- [x] All Python unit tests passing
- [x] All TypeScript integration tests passing
- [ ] E2E tests passing (require API keys)
- [x] Zero TypeScript errors
- [x] Test coverage documented
- [x] Test execution instructions clear
- [x] Debugging guide provided
