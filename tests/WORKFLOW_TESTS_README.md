# GitHub Actions Workflow Tests Documentation

## Overview
Comprehensive unit tests for `.github/workflows/manual.yml`

## Test File
- **Location**: `tests/unit/test_github_workflows.py`
- **Target**: `.github/workflows/manual.yml`
- **Framework**: pytest (Python 3)
- **Total Tests**: 23 (all passing)

## Quick Start

```bash
# Run all workflow tests
python3 -m pytest tests/unit/test_github_workflows.py -v

# Run specific test category
python3 -m pytest tests/unit/test_github_workflows.py::TestWorkflowStructure -v
```

## Test Categories

### 1. TestWorkflowStructure (8 tests)
- File existence and validity
- Name, permissions, triggers
- Input/output configuration
- Jobs and steps structure

### 2. TestWorkflowBestPractices (5 tests)  
- Comment quality
- Naming conventions
- Input type validation
- Command safety
- Runner configuration

### 3. TestWorkflowSecurity (5 tests)
- Explicit permissions
- Least privilege principle
- No dangerous triggers
- Input validation
- Secret detection

### 4. TestWorkflowEdgeCases (5 tests)
- Special character handling
- Default values
- YAML formatting
- Whitespace handling
- File ending

## Key Features

- Handles YAML 'on' keyword (parsed as True)
- Descriptive error messages
- pytest fixtures for efficiency
- Comprehensive coverage

## Integration

Tests integrated into `tests/run_all_tests.sh`

## Test Results
All 23 tests passing ✅