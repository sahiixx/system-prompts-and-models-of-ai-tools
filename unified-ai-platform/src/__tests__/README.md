# Unified AI Platform - Test Suite

This directory contains comprehensive unit tests for the Unified AI Platform.

## Test Files

### `index.test.js`
Tests for the Express-based `UnifiedAIPlatform` class (src/index.js):
- Constructor and initialization
- Middleware configuration (security, CORS, body parsing)
- Health check endpoint
- Tools API
- Memory management API (GET/POST)
- Plans API (GET/POST)
- Capabilities endpoint
- Demo endpoint
- Error handling (404s, malformed requests)
- Server lifecycle (start/stop)
- Edge cases (concurrent requests, large payloads, special characters)

**Total: 679 lines, 60+ test cases**

### `simple-server.test.js`
Tests for the vanilla HTTP `SimpleUnifiedAIPlatform` class (src/simple-server.js):
- Constructor and initialization
- HTTP server creation
- CORS header configuration
- Route handling (health, tools, memory, plans, capabilities, demo)
- Request body parsing
- Error handling
- Server lifecycle
- Edge cases and concurrent request handling

**Total: 737 lines, 40+ test cases**

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Verbose Output
```bash
npm run test:verbose
```

## Test Coverage

The test suite aims for:
- **70%+ code coverage** across all metrics
- **100% API endpoint coverage**
- **Comprehensive edge case testing**

Coverage includes:
- Happy path scenarios
- Error conditions
- Boundary cases
- Concurrent operations
- Input validation
- Security headers

## Test Structure

Each test file follows the pattern:
```javascript
describe('ClassName', () => {
  describe('Feature/Method', () => {
    test('specific behavior', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Mocking

- Configuration files are mocked to avoid file system dependencies
- Console output is mocked to keep test output clean
- Server instances are properly cleaned up after each test

## Key Testing Patterns

1. **Server Lifecycle Management**: Proper setup/teardown with `beforeEach`/`afterEach`
2. **Async Testing**: Promise-based tests with `async/await`
3. **HTTP Testing**: Using `supertest` for Express app and native `http` module for simple server
4. **Isolation**: Each test runs independently with fresh instances
5. **Comprehensive Assertions**: Multiple assertions per test for thorough validation

## Test Categories

### Functional Tests
- API endpoint behavior
- Data persistence
- Route handling
- Request/response processing

### Integration Tests
- Middleware interaction
- Full request lifecycle
- Multi-step operations (store then retrieve)

### Edge Case Tests
- Large payloads
- Special characters
- Concurrent requests
- Malformed input
- Empty requests

### Security Tests
- CORS configuration
- Security headers
- Input validation
- Error message safety

## Continuous Integration

Tests can be integrated into CI/CD pipelines:
```yaml
- name: Run tests
  run: npm test
```

## Contributing

When adding new features:
1. Add corresponding tests
2. Ensure tests pass locally
3. Maintain coverage thresholds
4. Follow existing test patterns