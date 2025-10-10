# Test Suite Documentation

This directory contains comprehensive unit tests for the AI Coding Tools repository automation scripts.

## Test Files Created

### Python Tests (pytest)
- `tests/unit/test_generate_api.py` - 50+ test cases for generate-api.py
- `tests/unit/test_compare_versions.py` - 45+ test cases for compare-versions.py
- `tests/unit/test_generate_metadata.py` - 60+ test cases for generate-metadata.py

### Configuration
- `pytest.ini` - Pytest configuration file

## Running Tests

### Install Dependencies
```bash
pip install pytest
```

### Run Tests
```bash
# All tests
pytest

# Verbose output
pytest -v

# With coverage
pytest --cov=scripts

# Specific file
pytest tests/unit/test_generate_api.py
```

## Test Coverage

Total test cases: 155+

Each test file includes:
- Initialization tests
- Happy path scenarios
- Edge case handling
- Error handling
- Unicode support
- Large dataset tests
- Integration scenarios

## Documentation

See TEST_SUMMARY.md for detailed test statistics and coverage information.