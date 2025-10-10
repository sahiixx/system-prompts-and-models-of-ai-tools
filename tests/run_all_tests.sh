#!/usr/bin/env bash
# Comprehensive test runner for all test suites

set -e

cd "$(dirname "$0")/.."

echo "============================================================"
echo "Running All Test Suites"
echo "============================================================"
echo ""

TOTAL_PASSED=0
TOTAL_FAILED=0
FAILED_SUITES=()

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo "------------------------------------------------------------"
    echo "Running: $test_name"
    echo "------------------------------------------------------------"
    
    if $test_command; then
        echo "✅ $test_name PASSED"
        TOTAL_PASSED=$((TOTAL_PASSED + 1))
    else
        echo "❌ $test_name FAILED"
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
        FAILED_SUITES+=("$test_name")
    fi
    echo ""
}

# Run JavaScript tests
run_test "Validator Tests" "node tests/validate.test.js"
run_test "Analyzer Tests" "node tests/analyze.test.js"
run_test "DuplicateChecker Tests" "node tests/check-duplicates.test.js"

# Run Python tests
run_test "API Generator Tests" "python3 tests/test_generate_api.py"

echo "============================================================"
echo "Test Summary"
echo "============================================================"
echo "Total Test Suites Run: $((TOTAL_PASSED + TOTAL_FAILED))"
echo "Passed: $TOTAL_PASSED"
echo "Failed: $TOTAL_FAILED"

if [ $TOTAL_FAILED -gt 0 ]; then
    echo ""
    echo "Failed Suites:"
    for suite in "${FAILED_SUITES[@]}"; do
        echo "  - $suite"
    done
    echo ""
    exit 1
else
    echo ""
    echo "🎉 All tests passed successfully!"
    echo ""
    exit 0
fi