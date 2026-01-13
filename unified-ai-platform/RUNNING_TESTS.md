# Running Tests - Quick Reference Guide

## Prerequisites

```bash
cd unified-ai-platform
npm install
```

## Running All Tests

```bash
# Run all tests (original + enhanced)
npm test

# Run with coverage report
npm test -- --coverage

# Run in watch mode (auto-rerun on file changes)
npm test -- --watch

# Run with verbose output
npm run test:verbose
```

## Running Specific Test Suites

```bash
# Run only the enhanced tests
npm test tests/unit/index.enhanced.test.js
npm test tests/unit/simple-server.enhanced.test.js
npm test tests/unit/config.enhanced.test.js

# Run only original tests
npm test tests/unit/index.test.js
npm test tests/unit/simple-server.test.js
npm test tests/unit/config.test.js

# Run all unit tests
npm run test:unit
```

## Running Specific Test Categories

```bash
# Run tests matching a pattern
npm test -- --testNamePattern="Security"
npm test -- --testNamePattern="Performance"
npm test -- --testNamePattern="Concurrent"

# Run tests in a specific file matching a pattern
npm test tests/unit/index.enhanced.test.js -- --testNamePattern="Input Validation"
```

## Coverage Options

```bash
# Generate HTML coverage report
npm test -- --coverage --coverageReporters=html

# View coverage in terminal
npm test -- --coverage --coverageReporters=text

# Generate LCOV report for CI/CD
npm test -- --coverage --coverageReporters=lcov
```

## Debugging Tests

```bash
# Run tests with Node debugger
node --inspect-brk node_modules/.bin/jest tests/unit/index.enhanced.test.js

# Run a single test
npm test -- --testNamePattern="should handle SQL injection"

# Show test execution time
npm test -- --verbose
```

## CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: |
    cd unified-ai-platform
    npm ci
    npm test -- --coverage
    
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./unified-ai-platform/coverage/lcov.info
```

## Test Structure