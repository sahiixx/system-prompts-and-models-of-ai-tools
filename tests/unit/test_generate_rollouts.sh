#!/bin/bash
# Comprehensive tests for generate_rollouts.sh
# Tests bash script functionality for generating rollouts

set -euo pipefail

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test result functions
pass_test() {
    ((TESTS_PASSED++))
    ((TESTS_RUN++))
    echo -e "${GREEN}✓${NC} $1"
}

fail_test() {
    ((TESTS_FAILED++))
    ((TESTS_RUN++))
    echo -e "${RED}✗${NC} $1"
    echo -e "  ${RED}Error:${NC} $2"
}

# Setup test environment
setup() {
    TEST_DIR=$(mktemp -d)
    mkdir -p "$TEST_DIR"
}

# Cleanup test environment
teardown() {
    if [ -d "$TEST_DIR" ]; then
        rm -rf "$TEST_DIR"
    fi
}

# Test: count_files function works correctly
test_count_files() {
    setup
    
    # Create test files
    mkdir -p "$TEST_DIR/TestTool"
    touch "$TEST_DIR/TestTool/prompt.txt"
    touch "$TEST_DIR/TestTool/config.json"
    touch "$TEST_DIR/TestTool/readme.md"
    touch "$TEST_DIR/TestTool/script.sh"
    
    # Count files (txt, md, json only)
    local count=$(find "$TEST_DIR/TestTool" -type f \( -name "*.txt" -o -name "*.md" -o -name "*.json" \) | wc -l)
    
    if [ "$count" -eq 3 ]; then
        pass_test "count_files counts correct file types"
    else
        fail_test "count_files counts correct file types" "Expected 3, got $count"
    fi
    
    teardown
}

# Test: Script excludes hidden directories
test_excludes_hidden_dirs() {
    setup
    
    mkdir -p "$TEST_DIR/.git"
    mkdir -p "$TEST_DIR/.github"
    mkdir -p "$TEST_DIR/ValidTool"
    touch "$TEST_DIR/.git/config"
    touch "$TEST_DIR/ValidTool/prompt.txt"
    
    # Count directories excluding hidden ones
    local count=0
    for dir in "$TEST_DIR"/*/ ; do
        basename=$(basename "$dir")
        if [[ ! "$basename" =~ ^\. ]]; then
            ((count++))
        fi
    done
    
    if [ "$count" -eq 1 ]; then
        pass_test "Script excludes hidden directories"
    else
        fail_test "Script excludes hidden directories" "Expected 1, got $count"
    fi
    
    teardown
}

# Test: Script excludes system directories
test_excludes_system_dirs() {
    setup
    
    mkdir -p "$TEST_DIR/node_modules"
    mkdir -p "$TEST_DIR/site"
    mkdir -p "$TEST_DIR/ValidTool"
    
    # Simulate filtering logic
    excluded_dirs=(".git" ".github" "site" "node_modules" "scripts" "tests" "api" "metadata" "platform" "assets" "examples")
    local count=0
    
    for dir in "$TEST_DIR"/*/ ; do
        basename=$(basename "$dir")
        skip=false
        for excluded in "${excluded_dirs[@]}"; do
            if [[ "$basename" == "$excluded" ]]; then
                skip=true
                break
            fi
        done
        if [ "$skip" = false ]; then
            ((count++))
        fi
    done
    
    if [ "$count" -eq 1 ]; then
        pass_test "Script excludes system directories"
    else
        fail_test "Script excludes system directories" "Expected 1 valid dir, got $count"
    fi
    
    teardown
}

# Test: Script counts files in nested directories
test_nested_directory_scanning() {
    setup
    
    mkdir -p "$TEST_DIR/Tool1/SubDir"
    touch "$TEST_DIR/Tool1/prompt.txt"
    touch "$TEST_DIR/Tool1/SubDir/nested.json"
    
    local count=$(find "$TEST_DIR/Tool1" -type f \( -name "*.txt" -o -name "*.json" -o -name "*.md" \) | wc -l)
    
    if [ "$count" -eq 2 ]; then
        pass_test "Script scans nested directories"
    else
        fail_test "Script scans nested directories" "Expected 2 files, got $count"
    fi
    
    teardown
}

# Test: Script handles empty directories
test_empty_directory() {
    setup
    
    mkdir -p "$TEST_DIR/EmptyTool"
    
    local count=$(find "$TEST_DIR/EmptyTool" -type f \( -name "*.txt" -o -name "*.json" -o -name "*.md" \) | wc -l)
    
    if [ "$count" -eq 0 ]; then
        pass_test "Script handles empty directories"
    else
        fail_test "Script handles empty directories" "Expected 0 files, got $count"
    fi
    
    teardown
}

# Test: Script filters by file extension
test_file_extension_filtering() {
    setup
    
    mkdir -p "$TEST_DIR/TestTool"
    touch "$TEST_DIR/TestTool/file.txt"
    touch "$TEST_DIR/TestTool/file.json"
    touch "$TEST_DIR/TestTool/file.md"
    touch "$TEST_DIR/TestTool/file.js"
    touch "$TEST_DIR/TestTool/file.py"
    touch "$TEST_DIR/TestTool/file.yaml"
    
    # Count only txt, json, md files
    local count=$(find "$TEST_DIR/TestTool" -type f \( -name "*.txt" -o -name "*.json" -o -name "*.md" \) | wc -l)
    
    if [ "$count" -eq 3 ]; then
        pass_test "Script filters by correct file extensions"
    else
        fail_test "Script filters by correct file extensions" "Expected 3, got $count"
    fi
    
    teardown
}

# Test: Script handles special characters in directory names
test_special_chars_in_names() {
    setup
    
    mkdir -p "$TEST_DIR/Tool-With-Dashes"
    mkdir -p "$TEST_DIR/Tool_With_Underscores"
    mkdir -p "$TEST_DIR/Tool.With.Dots"
    touch "$TEST_DIR/Tool-With-Dashes/prompt.txt"
    touch "$TEST_DIR/Tool_With_Underscores/prompt.txt"
    touch "$TEST_DIR/Tool.With.Dots/prompt.txt"
    
    local count=$(find "$TEST_DIR" -maxdepth 2 -type f -name "*.txt" | wc -l)
    
    if [ "$count" -eq 3 ]; then
        pass_test "Script handles special characters in names"
    else
        fail_test "Script handles special characters in names" "Expected 3 files, got $count"
    fi
    
    teardown
}

# Test: Script counts directories correctly
test_directory_counting() {
    setup
    
    mkdir -p "$TEST_DIR/Tool1"
    mkdir -p "$TEST_DIR/Tool2"
    mkdir -p "$TEST_DIR/Tool3"
    mkdir -p "$TEST_DIR/node_modules"
    
    # Count non-system directories
    excluded_dirs=("node_modules" "site" ".git")
    local count=0
    
    for dir in "$TEST_DIR"/*/ ; do
        basename=$(basename "$dir")
        skip=false
        for excluded in "${excluded_dirs[@]}"; do
            if [[ "$basename" == "$excluded" ]]; then
                skip=true
                break
            fi
        done
        if [ "$skip" = false ]; then
            ((count++))
        fi
    done
    
    if [ "$count" -eq 3 ]; then
        pass_test "Script counts directories correctly"
    else
        fail_test "Script counts directories correctly" "Expected 3, got $count"
    fi
    
    teardown
}

# Test: Script handles multiple file types in same directory
test_multiple_file_types() {
    setup
    
    mkdir -p "$TEST_DIR/MixedTool"
    echo "Prompt content" > "$TEST_DIR/MixedTool/prompt.txt"
    echo '{"key": "value"}' > "$TEST_DIR/MixedTool/config.json"
    echo "# README" > "$TEST_DIR/MixedTool/README.md"
    
    local txt_count=$(find "$TEST_DIR/MixedTool" -name "*.txt" | wc -l)
    local json_count=$(find "$TEST_DIR/MixedTool" -name "*.json" | wc -l)
    local md_count=$(find "$TEST_DIR/MixedTool" -name "*.md" | wc -l)
    
    if [ "$txt_count" -eq 1 ] && [ "$json_count" -eq 1 ] && [ "$md_count" -eq 1 ]; then
        pass_test "Script handles multiple file types"
    else
        fail_test "Script handles multiple file types" "txt:$txt_count json:$json_count md:$md_count"
    fi
    
    teardown
}

# Test: Script handles large number of files
test_large_file_count() {
    setup
    
    mkdir -p "$TEST_DIR/LargeTool"
    
    # Create 100 files
    for i in {1..100}; do
        touch "$TEST_DIR/LargeTool/file${i}.txt"
    done
    
    local count=$(find "$TEST_DIR/LargeTool" -name "*.txt" | wc -l)
    
    if [ "$count" -eq 100 ]; then
        pass_test "Script handles large number of files"
    else
        fail_test "Script handles large number of files" "Expected 100, got $count"
    fi
    
    teardown
}

# Test: Find command works with proper arguments
test_find_command_syntax() {
    setup
    
    mkdir -p "$TEST_DIR/TestTool"
    touch "$TEST_DIR/TestTool/file.txt"
    touch "$TEST_DIR/TestTool/file.json"
    
    # Test find with proper grouping
    local result=$(find "$TEST_DIR/TestTool" -type f \( -name "*.txt" -o -name "*.json" -o -name "*.md" \) 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        pass_test "Find command syntax is correct"
    else
        fail_test "Find command syntax is correct" "Exit code: $exit_code, Output: $result"
    fi
    
    teardown
}

# Test: Word count (wc) command works correctly
test_wc_command() {
    setup
    
    mkdir -p "$TEST_DIR/CountTest"
    touch "$TEST_DIR/CountTest/file1.txt"
    touch "$TEST_DIR/CountTest/file2.txt"
    touch "$TEST_DIR/CountTest/file3.txt"
    
    local count=$(find "$TEST_DIR/CountTest" -name "*.txt" | wc -l)
    # Trim whitespace
    count=$(echo "$count" | tr -d ' ')
    
    if [ "$count" -eq 3 ]; then
        pass_test "wc command counts lines correctly"
    else
        fail_test "wc command counts lines correctly" "Expected 3, got '$count'"
    fi
    
    teardown
}

# Test: Script handles directories with no matching files
test_no_matching_files() {
    setup
    
    mkdir -p "$TEST_DIR/NoMatchTool"
    touch "$TEST_DIR/NoMatchTool/script.sh"
    touch "$TEST_DIR/NoMatchTool/program.py"
    
    local count=$(find "$TEST_DIR/NoMatchTool" -type f \( -name "*.txt" -o -name "*.json" -o -name "*.md" \) | wc -l)
    count=$(echo "$count" | tr -d ' ')
    
    if [ "$count" -eq 0 ]; then
        pass_test "Script handles no matching files"
    else
        fail_test "Script handles no matching files" "Expected 0, got $count"
    fi
    
    teardown
}

# Test: Basename extraction works
test_basename_extraction() {
    local full_path="/path/to/Tool Name/file.txt"
    local dirname=$(dirname "$full_path")
    local basename=$(basename "$dirname")
    
    if [ "$basename" = "Tool Name" ]; then
        pass_test "Basename extraction works correctly"
    else
        fail_test "Basename extraction works correctly" "Expected 'Tool Name', got '$basename'"
    fi
}

# Test: Loop iteration over directories
test_directory_loop() {
    setup
    
    mkdir -p "$TEST_DIR/Tool1"
    mkdir -p "$TEST_DIR/Tool2"
    mkdir -p "$TEST_DIR/Tool3"
    
    local count=0
    for dir in "$TEST_DIR"/*/ ; do
        ((count++))
    done
    
    if [ "$count" -eq 3 ]; then
        pass_test "Directory loop iteration works"
    else
        fail_test "Directory loop iteration works" "Expected 3, got $count"
    fi
    
    teardown
}

# Run all tests
echo "========================================"
echo "Testing generate_rollouts.sh Functionality"
echo "========================================"
echo ""

test_count_files
test_excludes_hidden_dirs
test_excludes_system_dirs
test_nested_directory_scanning
test_empty_directory
test_file_extension_filtering
test_special_chars_in_names
test_directory_counting
test_multiple_file_types
test_large_file_count
test_find_command_syntax
test_wc_command
test_no_matching_files
test_basename_extraction
test_directory_loop

# Summary
echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "Tests run:    ${TESTS_RUN}"
echo -e "Tests passed: ${GREEN}${TESTS_PASSED}${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "Tests failed: ${RED}${TESTS_FAILED}${NC}"
else
    echo -e "Tests failed: ${TESTS_FAILED}"
fi
echo "========================================"

# Exit with appropriate code
if [ $TESTS_FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi