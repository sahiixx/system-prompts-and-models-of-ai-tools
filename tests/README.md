# Test Suite for AI Coding Tools Repository Scripts

This directory contains comprehensive unit tests for the Python and JavaScript scripts in the `scripts/` directory.

## 📁 Structure
tests/
├── unit/
│   ├── test_generate_api.py          # Tests for API generation
│   ├── test_generate_metadata.py     # Tests for metadata generation
│   ├── test_compare_versions.py      # Tests for version comparison
│   ├── test_analyze.js               # Tests for repository analysis
│   ├── test_check_duplicates.js      # Tests for duplicate detection
│   └── test_validate.js              # Tests for structure validation
├── fixtures/                         # Test fixtures (if needed)
├── run_tests.sh                      # Test runner script
└── README.md                         # This file
## Recently Added Tests

### New Test Files (Latest Commit)

#### tests/unit/test_api_usage_py.py
Comprehensive unit tests for `examples/api-usage.py`. Tests all methods of the AIToolsAPI class including:
- Initialization and configuration
- Data loading and file operations
- Search functionality
- Error handling
- Edge cases

Run with: `pytest tests/unit/test_api_usage_py.py -v`

#### tests/unit/test_generate_rollouts.sh
Comprehensive tests for `generate_rollouts.sh`. Tests bash script operations including:
- File counting and filtering
- Directory traversal
- System directory exclusion
- Command syntax validation
- Edge case handling

Run with: `bash tests/unit/test_generate_rollouts.sh`

See [TEST_ADDITIONS_SUMMARY.md](../TEST_ADDITIONS_SUMMARY.md) for complete details on the new tests.