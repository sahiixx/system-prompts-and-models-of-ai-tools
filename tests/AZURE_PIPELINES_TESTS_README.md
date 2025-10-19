# Azure Pipelines Tests

## Quick Start

This directory contains comprehensive unit tests for the `azure-pipelines.yml` configuration file added to the repository.

### Run Tests

```bash
# Run all tests with unittest
python3 -m unittest tests/unit/test_azure_pipelines.py -v

# Run all tests with pytest (if available)
python3 -m pytest tests/unit/test_azure_pipelines.py -v

# Run specific test class
python3 -m unittest tests.unit.test_azure_pipelines.TestAzurePipelineNodeJsSetup -v

# Run from repository root
cd /home/jailuser/git
python3 tests/unit/test_azure_pipelines.py
```

## Test Files

- **`tests/unit/test_azure_pipelines.py`** - Main test file (816 lines, 51 tests)
- **`tests/AZURE_PIPELINES_TEST_SUMMARY.md`** - Detailed test documentation
- **`tests/AZURE_PIPELINES_TESTS_README.md`** - This file

## Test Statistics

- **Total Tests:** 51
- **Test Classes:** 13
- **Lines of Code:** 816
- **Test Framework:** Python unittest
- **YAML Parser:** PyYAML

## Test Coverage Areas

1. **Structure & Validity** (3 tests) - YAML syntax, file existence
2. **Trigger Configuration** (3 tests) - CI/CD triggers on main branch
3. **Pool Configuration** (4 tests) - VM images and agent setup
4. **Steps Configuration** (5 tests) - Step structure and organization
5. **Node.js Setup** (7 tests) - NodeTool task configuration
6. **Build Process** (6 tests) - npm install and build commands
7. **Documentation** (3 tests) - Comments and inline docs
8. **Best Practices** (4 tests) - Industry standards compliance
9. **Schema Compliance** (3 tests) - Azure Pipelines YAML schema
10. **Edge Cases** (4 tests) - Error conditions and boundaries
11. **Security** (3 tests) - Secret detection, safe commands
12. **React Build** (3 tests) - React-specific configurations
13. **Integration** (3 tests) - Workflow orchestration

## Prerequisites

```bash
# Install PyYAML if not already installed
pip install pyyaml

# Or with pip3
pip3 install pyyaml
```

## Example Output