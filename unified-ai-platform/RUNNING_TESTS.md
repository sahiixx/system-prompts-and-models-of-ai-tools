# Running Tests Guide

## Overview
This guide explains how to run the comprehensive test suite for the unified-ai-platform.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run only unit tests
npm run test:unit

# Run with verbose output
npm run test:verbose
```

## Test Categories

### Configuration Tests
```bash
npm test -- --testPathPattern=config
```

### Server Tests
```bash
npm test -- --testPathPattern="index|simple-server"
```

### Prompt Tests
```bash
npm test -- --testPathPattern=prompt
```

## Coverage Reports

```bash
# Generate coverage report
npm test

# View HTML coverage report
open coverage/lcov-report/index.html
```

## Debugging

```bash
# Run specific test file
npm test -- config.test.js

# Run with verbose output
npm test -- --verbose

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Test Statistics

- Total test files: 7
- Total test cases: ~187
- Lines of test code: 2,304
- Average execution time: < 30 seconds

## Documentation

- [TEST_COVERAGE.md](./TEST_COVERAGE.md) - Coverage details
- [NEW_TESTS_SUMMARY.md](./NEW_TESTS_SUMMARY.md) - New tests overview
- [TESTING.md](./TESTING.md) - Testing guidelines