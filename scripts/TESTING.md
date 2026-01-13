# Testing Documentation

This directory contains comprehensive unit tests for all executable scripts in the repository.

## Test Structure

### JavaScript Tests
- `validate.test.js` - Tests for validate.js
- `analyze.test.js` - Tests for analyze.js  
- `check-duplicates.test.js` - Tests for check-duplicates.js

### Python Tests
- `test_generate_metadata.py` - Tests for generate-metadata.py
- `test_generate_api.py` - Tests for generate-api.py
- `test_compare_versions.py` - Tests for compare-versions.py

## Running Tests

### Run all tests:
```bash
./scripts/run-tests.sh
```

### Run JavaScript tests only:
```bash
npm test
```

### Run Python tests only:
```bash
npm run test:python
```

### Run individual test files:
```bash
# JavaScript
node --test scripts/validate.test.js

# Python
python3 -m unittest scripts.test_generate_metadata
```

## Test Coverage

The test suite covers:
- **Happy path scenarios** - Normal, expected usage
- **Edge cases** - Boundary conditions, empty inputs, large files
- **Error handling** - Invalid inputs, missing files, malformed data
- **Integration tests** - End-to-end workflows
- **Unicode support** - International characters and emojis
- **Performance** - Large file handling without hangs

## Writing New Tests

Follow these conventions:
- Use descriptive test names that explain what is being tested
- Include setup and teardown for test fixtures
- Test both positive and negative cases
- Clean up temporary files and resources
- Use assertions that provide clear failure messages