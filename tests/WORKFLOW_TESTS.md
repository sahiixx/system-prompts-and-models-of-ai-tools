# GitHub Actions Workflow Tests

This document describes the comprehensive test suite for validating GitHub Actions workflow files, specifically focused on the `manual.yml` workflow and its recent permissions security update.

## Overview

The test suite validates workflow files for:
- **Structure**: Correct YAML syntax and required keys
- **Security**: Proper permissions configuration
- **Best Practices**: Action versioning, documentation, and naming conventions
- **Functionality**: Input validation, job structure, and step configuration

## Test Files

### 1. `tests/workflow-validation.test.js` (Node.js)
Comprehensive JavaScript test suite using Node.js built-in test framework.

**Run with:**
```bash
node tests/workflow-validation.test.js
```

### 2. `tests/test_workflow_validation.py` (Python)
Python unittest suite with YAML parsing capabilities.

**Run with:**
```bash
python3 tests/test_workflow_validation.py
```

## Test Coverage

### Structure Tests
- ✓ Workflow file exists and is accessible
- ✓ Required top-level keys present (name, on)
- ✓ YAML syntax is valid
- ✓ Consistent indentation (no tabs)
- ✓ No trailing whitespace

### Permissions Tests (Critical)
- ✓ Permissions block is defined
- ✓ Permissions are explicitly set (not default)
- ✓ Contents permission is read-only
- ✓ No write-all permission used
- ✓ Permissions have consistent indentation

### Workflow Dispatch Tests
- ✓ workflow_dispatch trigger is configured
- ✓ Input parameters have required fields
- ✓ Input parameters have type definitions
- ✓ Input parameters have descriptions
- ✓ Input parameters are used in workflow

### Job Structure Tests
- ✓ At least one job is defined
- ✓ Jobs specify runs-on field
- ✓ Jobs define steps
- ✓ Steps have names
- ✓ Steps have either 'uses' or 'run'
- ✓ Valid GitHub-hosted runners specified

### Security Tests
- ✓ No hardcoded secrets
- ✓ No overly permissive settings
- ✓ Action versions properly pinned
- ✓ No security vulnerabilities

### Documentation Tests
- ✓ Workflow has descriptive name
- ✓ Comments and documentation present
- ✓ Input parameters documented

## Test Examples

### Testing Permissions Configuration
```javascript
test_permissions_read_only() {
  const content = fs.readFileSync('manual.yml', 'utf8');
  const contentsReadRegex = /contents:\s*read/;
  assert(contentsReadRegex.test(content), 
         'Should have contents: read permission');
}
```

### Testing YAML Structure
```python
def test_yaml_loads(self):
    with open(self.manual_workflow) as f:
        data = yaml.safe_load(f)
    self.assertIsNotNone(data)
```

## Recent Changes Tested

The test suite specifically validates the addition of the `permissions` block to `manual.yml`:

```yaml
permissions:
  contents: read
```

This change:
- Follows GitHub Actions security best practices
- Implements principle of least privilege
- Prevents accidental write access to repository

## Running All Tests

### Run JavaScript tests:
```bash
cd /home/jailuser/git
node tests/workflow-validation.test.js
```

### Run Python tests:
```bash
cd /home/jailuser/git
python3 tests/test_workflow_validation.py
```

### Run all tests:
```bash
cd /home/jailuser/git
bash tests/run_all_tests.sh
```

## Expected Results

All tests should pass with the current workflow configuration. Expected output: