# Quick Start - Testing Guide

## Run All Tests
```bash
npm test
```

## Run Specific Tests
```bash
# Configuration tests
npm test -- config

# Server tests
npm test -- index simple-server

# New tests only
npm test -- system-config tools main-prompt config-integration
```

## View Coverage
```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

## Test Files Overview

| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| config.test.js | 258 | ~30 | Config validation |
| index.test.js | 646 | ~80 | Express server |
| simple-server.test.js | 706 | ~77 | HTTP server |
| system-config.test.js | 121 | ~15 | Enhanced config |
| tools.test.js | 212 | ~20 | Tool validation |
| main-prompt.test.js | 161 | ~15 | Prompt validation |
| config-integration.test.js | 200 | ~15 | Integration |

**Total**: 2,304 lines, ~187 tests

## Documentation

- **TEST_COVERAGE.md** - Detailed coverage info
- **RUNNING_TESTS.md** - Complete testing guide
- **NEW_TESTS_SUMMARY.md** - New tests overview
- **FINAL_TEST_REPORT.md** - Final report

## Quick Checks

```bash
# Verify syntax
node -c tests/unit/*.test.js

# Count tests
grep -r "test(" tests/unit | wc -l

# Run in watch mode
npm run test:watch
```

## Status
✅ All tests ready to run
✅ Zero setup required
✅ Comprehensive coverage