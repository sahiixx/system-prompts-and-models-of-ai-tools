# Unified AI Platform - Test Suite

Comprehensive unit tests for the Unified AI Platform.

## Test Structure

- tests/unit/index.test.js - Express-based platform tests (647 lines)
- tests/unit/simple-server.test.js - HTTP-based platform tests (707 lines)
- tests/unit/config.test.js - Configuration validation tests (259 lines)

## Running Tests

```bash
npm install          # Install dependencies
npm test             # Run all tests with coverage
npm run test:watch   # Watch mode
npm run test:unit    # Unit tests only
npm run test:verbose # Verbose output
```

## Test Coverage

### src/index.js (UnifiedAIPlatform)
- Constructor, middleware, API endpoints
- Memory and plan management
- Error handling, server lifecycle
- CORS, concurrent operations

### src/simple-server.js (SimpleUnifiedAIPlatform)
- HTTP server creation and routing
- All API endpoints
- CORS, error handling, edge cases

### Configuration Files
- system-config.json validation
- tools.json validation
- Schema and integration tests

## Coverage Goals

- Statements: 80%
- Branches: 70%
- Functions: 75%
- Lines: 80%

## Resources

- Jest: https://jestjs.io/
- Supertest: https://github.com/visionmedia/supertest

See TEST_SUMMARY.md and TESTING.md for more details.