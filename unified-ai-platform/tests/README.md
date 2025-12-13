# Unified AI Platform - Test Suite

Comprehensive unit tests for the Unified AI Platform.

## Test Coverage

### `index.test.js` - Main Express Server Tests
- **Constructor Tests**: Initialization, environment variables, default values
- **Health Check Endpoint**: Status reporting, feature flags, metrics
- **Tools API**: Tool listing and descriptions
- **Memory API**: GET/POST operations, edge cases, validation
- **Plans API**: Plan creation, retrieval, unique ID generation
- **Capabilities Endpoint**: Configuration exposure
- **Demo Endpoint**: Feature showcase
- **Error Handling**: 404s, malformed requests, validation errors
- **CORS**: Headers, preflight requests
- **Security**: Helmet middleware, body size limits
- **Concurrency**: Parallel requests, state management
- **Edge Cases**: Unicode, large payloads, complex objects

### `simple-server.test.js` - Simple HTTP Server Tests
- **Constructor Tests**: Initialization and configuration
- **Server Creation**: HTTP server instantiation
- **CORS Headers**: Cross-origin support
- **All Endpoints**: Health, tools, memory, plans, capabilities, demo
- **Request Handling**: POST/GET operations
- **Error Handling**: Malformed JSON, unknown routes
- **Server Lifecycle**: Start/stop operations

## Running Tests

```bash
# Install dependencies first
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test suite
npm run test:unit

# Generate coverage report
npm run test:coverage
```

## Test Statistics

- **Total Test Suites**: 2
- **Total Tests**: 150+
- **Coverage Target**: 80% (lines, functions, statements), 70% (branches)

## Dependencies

- **jest**: Test framework
- **supertest**: HTTP assertions for Express
- Built-in Node.js `http` module for simple server tests