#!/bin/bash
# shellcheck shell=bash

# Test runner script for all tests

echo "==================================="
echo "Running Test Suite"
echo "==================================="
echo

# Run Python tests
echo "📊 Running Python tests..."
python3 -m pytest tests/unit/test_*.py -v --tb=short

PYTHON_EXIT=$?

# Run JavaScript tests
echo
echo "📊 Running JavaScript tests..."
node --test tests/unit/test_*.js

JS_EXIT=$?

echo
echo "==================================="
echo "Test Results Summary"
echo "==================================="
echo "Python tests: $([ $PYTHON_EXIT -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo "JavaScript tests: $([ $JS_EXIT -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo

# Exit with failure if any tests failed
if [ $PYTHON_EXIT -ne 0 ] || [ $JS_EXIT -ne 0 ]; then
  exit 1
fi

exit 0