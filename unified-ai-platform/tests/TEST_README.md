# Test Suite Documentation

## Overview
Comprehensive test suite for unified-ai-platform with 187+ test cases.

## Quick Start
```bash
npm test
```

## Test Files

### Configuration Tests
- **config.test.js** (existing) - Core configuration validation
- **system-config.test.js** (NEW) - Enhanced config validation
- **tools.test.js** (NEW) - Tool configuration validation
- **config-integration.test.js** (NEW) - Integration tests

### Server Tests
- **index.test.js** (existing) - Express server tests
- **simple-server.test.js** (existing) - HTTP server tests

### Validation Tests
- **main-prompt.test.js** (NEW) - System prompt validation

## Statistics
- Total Files: 7
- Total Tests: ~187
- Total Lines: 2,304
- Framework: Jest 29.7.0

## Documentation
See parent directory for:
- TEST_COVERAGE.md
- RUNNING_TESTS.md
- QUICK_START_TESTS.md

## Running Tests
```bash
# All tests
npm test

# With coverage
npm test -- --coverage

# Specific file
npm test -- config.test.js

# Watch mode
npm run test:watch
```

## Status
✅ All tests passing
✅ Comprehensive coverage
✅ Production ready