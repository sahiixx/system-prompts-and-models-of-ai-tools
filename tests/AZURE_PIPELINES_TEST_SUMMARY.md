# Azure Pipelines Configuration Test Suite

## Overview
This document describes the comprehensive test suite created for `azure-pipelines.yml`, which validates the Azure Pipelines CI/CD configuration for a Node.js with React project.

## Test File Location
- **File**: `tests/test_azure_pipelines.py`
- **Total Tests**: 43 unit tests
- **Lines of Code**: 728
- **Framework**: Python `unittest` with `pytest` compatibility

## Test Categories

### 1. File Existence and Basic Validation (4 tests)
- `test_azure_pipelines_file_exists` - Verifies the configuration file exists
- `test_azure_pipelines_is_file` - Ensures it's a regular file, not a directory
- `test_yaml_loads_successfully` - Validates YAML parses without errors
- `test_yaml_not_empty` - Confirms the file contains configuration data

### 2. Trigger Configuration (3 tests)
- `test_trigger_exists` - Verifies trigger configuration is present
- `test_trigger_includes_main_branch` - Ensures pipeline triggers on main branch
- `test_trigger_type_is_valid` - Validates trigger uses proper data type

### 3. Pool Configuration (5 tests)
- `test_pool_exists` - Verifies pool configuration is defined
- `test_pool_has_vm_image` - Ensures VM image is specified
- `test_pool_uses_ubuntu_latest` - Validates use of ubuntu-latest
- `test_pool_vm_image_not_empty` - Checks VM image value is not empty
- `test_pool_not_none` - Ensures pool configuration is not null

### 4. Steps Configuration (4 tests)
- `test_steps_exists` - Verifies steps are defined
- `test_steps_is_list` - Ensures steps is a list/array
- `test_steps_not_empty` - Confirms at least one step exists
- `test_minimum_required_steps_count` - Validates minimum 2 steps (setup + build)

### 5. Node.js Setup Task Tests (9 tests)
- `test_first_step_is_node_tool_task` - Verifies first step is NodeTool@0
- `test_node_tool_has_inputs` - Ensures inputs configuration exists
- `test_node_version_specified` - Validates version specification is present
- `test_node_version_is_20_x` - Confirms Node.js version 20.x
- `test_node_version_format_valid` - Checks version format validity
- `test_node_tool_has_display_name` - Verifies display name exists
- `test_node_tool_display_name_not_empty` - Ensures display name has content
- `test_node_tool_display_name_mentions_node` - Validates display name mentions Node.js
- `test_uses_supported_node_version` - Confirms Node.js version is 18+

### 6. Build Script Step Tests (8 tests)
- `test_second_step_is_script` - Verifies second step is a script
- `test_build_script_not_empty` - Ensures script has content
- `test_build_script_has_npm_install` - Validates npm install command
- `test_build_script_has_npm_run_build` - Confirms npm run build command
- `test_build_script_commands_order` - Ensures proper command ordering
- `test_build_step_has_display_name` - Verifies display name exists
- `test_build_display_name_not_empty` - Ensures display name has content
- `test_build_display_name_mentions_npm` - Validates display name mentions npm

### 7. Structure and Best Practices (6 tests)
- `test_all_steps_have_display_names` - Ensures all steps have descriptive names
- `test_no_hardcoded_secrets` - Checks for potential hardcoded secrets
- `test_pipeline_structure_completeness` - Validates essential top-level keys
- `test_script_uses_proper_multiline_syntax` - Verifies proper YAML multiline syntax
- `test_no_unnecessary_whitespace_in_commands` - Checks for excessive whitespace
- `test_task_versions_specified` - Ensures tasks have explicit version numbers

### 8. Edge Cases and Error Conditions (4 tests)
- `test_yaml_no_tabs` - Verifies no tab characters (invalid in YAML)
- `test_yaml_proper_indentation` - Validates consistent 2-space indentation
- `test_no_duplicate_keys` - Checks for duplicate keys at same level
- `test_steps_contain_valid_step_types` - Ensures steps have task or script

## Running the Tests

### Using pytest (recommended)
```bash
# Run all Azure Pipelines tests
python3 -m pytest tests/test_azure_pipelines.py -v

# Run with detailed output
python3 -m pytest tests/test_azure_pipelines.py -vv

# Run specific test
python3 -m pytest tests/test_azure_pipelines.py::TestAzurePipelinesValidation::test_yaml_loads_successfully
```

### Using unittest
```bash
# Run all tests in the module
python3 -m unittest tests.test_azure_pipelines -v

# Run the test class
python3 -m unittest tests.test_azure_pipelines.TestAzurePipelinesValidation -v

# Run directly
python3 tests/test_azure_pipelines.py
```

### Using the project's test runner
```bash
# From repository root
./tests/run_tests.sh
```

## Key Features

### Comprehensive Coverage
- Tests cover all major aspects of the Azure Pipelines configuration
- Validates syntax, structure, semantics, and best practices
- Includes edge case and error condition testing

### Well-Documented
- Each test has a detailed docstring explaining its purpose
- Test names clearly communicate what is being validated
- Follows existing project conventions

### Maintainable
- Uses helper methods to reduce code duplication
- Leverages subtests for iterative validation
- Clear assertion messages for debugging

### PyYAML Compatibility
The test file uses a special import mechanism to utilize the system PyYAML library instead of the repository's custom minimal YAML module. This is necessary because Azure Pipelines YAML uses features (like multiline string syntax with `|`) not supported by the custom module.

## Test Configuration

### Dependencies
- Python 3.10+
- PyYAML (system-installed)
- unittest (standard library)
- pytest (optional but recommended)

### Special Notes
- The test suite modifies `sys.path` temporarily to import the system PyYAML instead of the repository's custom yaml module
- Tests are designed to be idempotent and can run in any order
- No external dependencies or network calls are made

## Coverage Analysis

The test suite validates:
- ✅ File existence and accessibility
- ✅ YAML syntax correctness
- ✅ Complete pipeline structure
- ✅ Trigger configuration
- ✅ Agent pool setup
- ✅ Node.js tooling installation
- ✅ Build script commands
- ✅ Display names for visibility
- ✅ Best practices adherence
- ✅ Security considerations (no hardcoded secrets)
- ✅ Version specifications
- ✅ Proper indentation and formatting

## Future Enhancements

Potential additions to the test suite:
1. Schema validation against Azure Pipelines JSON schema
2. Integration tests that verify pipeline execution
3. Tests for additional steps (testing, deployment, artifacts)
4. Variable and parameter validation
5. Conditional execution testing
6. Matrix build configuration testing

## Related Files
- **Source**: `azure-pipelines.yml` (repository root)
- **Tests**: `tests/test_azure_pipelines.py`
- **Similar Test**: `tests/test_workflow_validation.py` (GitHub Actions)

---
*Generated as part of comprehensive unit test generation for Azure Pipelines configuration*