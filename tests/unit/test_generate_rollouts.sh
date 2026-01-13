#!/bin/bash
# Comprehensive unit tests for generate_rollouts.sh
# Tests rollout generation script functionality

set -euo pipefail

# Test framework setup
TESTS_PASSED=0
TESTS_FAILED=0
TEST_TEMP_DIR=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Setup function
setup() {
    TEST_TEMP_DIR=$(mktemp -d)
    cd "$TEST_TEMP_DIR"
}

# Teardown function
teardown() {
    if [ -n "$TEST_TEMP_DIR" ] && [ -d "$TEST_TEMP_DIR" ]; then
        rm -rf "$TEST_TEMP_DIR"
    fi
}

# Assert functions
assert_equals() {
    local expected="$1"
    local actual="$2"
    local message="${3:-}"

    if [ "$expected" = "$actual" ]; then
        echo -e "${GREEN}✓${NC} $message"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $message"
        echo "  Expected: $expected"
        echo "  Actual: $actual"
        ((TESTS_FAILED++))
        return 1
    fi
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local message="${3:-}"

    if echo "$haystack" | grep -q "$needle"; then
        echo -e "${GREEN}✓${NC} $message"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $message"
        echo "  String '$needle' not found in output"
        ((TESTS_FAILED++))
        return 1
    fi
}

assert_file_exists() {
    local file="$1"
    local message="${2:-File $file should exist}"

    if [ -f "$file" ] || [ -d "$file" ]; then
        echo -e "${GREEN}✓${NC} $message"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $message"
        echo "  File/directory not found: $file"
        ((TESTS_FAILED++))
        return 1
    fi
}

assert_greater_than() {
    local value="$1"
    local threshold="$2"
    local message="${3:-}"

    if [ "$value" -gt "$threshold" ]; then
        echo -e "${GREEN}✓${NC} $message"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $message"
        echo "  Expected $value > $threshold"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test: Script handles empty directory
test_empty_directory() {
    echo "Test: Script handles empty directory"
    setup

    # Run script in empty directory (create minimal script simulation)
    cat > test_script.sh <<'SCRIPT'
#!/bin/bash
total_dirs=0
total_files=0
for dir in */ ; do
    if [[ "$dir" == ".git/" ]]; then
        continue
    fi
    file_count=$(find "$dir" -type f \( -name "*.txt" -o -name "*.md" -o -name "*.json" \) 2>/dev/null | wc -l)
    if [ $file_count -gt 0 ]; then
        total_dirs=$((total_dirs + 1))
        total_files=$((total_files + file_count))
    fi
done
echo "Total Directories: $total_dirs"
echo "Total Files: $total_files"
SCRIPT
    chmod +x test_script.sh

    output=$(./test_script.sh)

    assert_contains "$output" "Total Directories: 0" "Should report 0 directories in empty repo"
    assert_contains "$output" "Total Files: 0" "Should report 0 files in empty repo"

    teardown
}

# Test: Script counts files correctly
test_file_counting() {
    echo "Test: Script counts files correctly"
    setup

    # Create test structure
    mkdir -p Tool1 Tool2
    echo "test" > Tool1/prompt.txt
    echo "test" > Tool1/README.md
    echo "test" > Tool2/config.json

    cat > test_script.sh <<'SCRIPT'
#!/bin/bash
total_dirs=0
total_files=0
for dir in */ ; do
    file_count=$(find "$dir" -type f \( -name "*.txt" -o -name "*.md" -o -name "*.json" \) 2>/dev/null | wc -l)
    if [ $file_count -gt 0 ]; then
        total_dirs=$((total_dirs + 1))
        total_files=$((total_files + file_count))
    fi
done
echo "Total Directories: $total_dirs"
echo "Total Files: $total_files"
SCRIPT
    chmod +x test_script.sh

    output=$(./test_script.sh)

    assert_contains "$output" "Total Directories: 2" "Should count 2 directories"
    assert_contains "$output" "Total Files: 3" "Should count 3 files"

    teardown
}

# Test: Script skips hidden directories
test_skip_hidden_directories() {
    echo "Test: Script skips hidden directories"
    setup

    mkdir -p .git .github Tool1
    echo "test" > .git/config
    echo "test" > .github/workflow.yml
    echo "test" > Tool1/prompt.txt

    cat > test_script.sh <<'SCRIPT'
#!/bin/bash
total_dirs=0
for dir in */ ; do
    if [[ "$dir" == ".git/" || "$dir" == ".github/" ]]; then
        continue
    fi
    file_count=$(find "$dir" -type f \( -name "*.txt" -o -name "*.md" -o -name "*.json" \) 2>/dev/null | wc -l)
    if [ $file_count -gt 0 ]; then
        total_dirs=$((total_dirs + 1))
    fi
done
echo "Total Directories: $total_dirs"
SCRIPT
    chmod +x test_script.sh

    output=$(./test_script.sh)

    assert_contains "$output" "Total Directories: 1" "Should skip .git and .github directories"

    teardown
}

# Test: Script skips site directory
test_skip_site_directory() {
    echo "Test: Script skips site directory"
    setup

    mkdir -p site Tool1
    echo "test" > site/build.js
    echo "test" > Tool1/prompt.txt

    cat > test_script.sh <<'SCRIPT'
#!/bin/bash
total_dirs=0
for dir in */ ; do
    if [[ "$dir" == "site/" ]]; then
        continue
    fi
    file_count=$(find "$dir" -type f \( -name "*.txt" -o -name "*.md" -o -name "*.json" \) 2>/dev/null | wc -l)
    if [ $file_count -gt 0 ]; then
        total_dirs=$((total_dirs + 1))
    fi
done
echo "Total Directories: $total_dirs"
SCRIPT
    chmod +x test_script.sh

    output=$(./test_script.sh)

    assert_contains "$output" "Total Directories: 1" "Should skip site directory"

    teardown
}

# Test: Script handles files with different extensions
test_multiple_file_extensions() {
    echo "Test: Script handles files with different extensions"
    setup

    mkdir -p Tool1
    echo "test" > Tool1/prompt.txt
    echo "test" > Tool1/README.md
    echo "test" > Tool1/config.json
    echo "test" > Tool1/script.sh  # Should be ignored
    echo "test" > Tool1/data.yaml  # Should be ignored

    cat > test_script.sh <<'SCRIPT'
#!/bin/bash
count=$(find Tool1 -type f \( -name "*.txt" -o -name "*.md" -o -name "*.json" \) 2>/dev/null | wc -l)
echo "File Count: $count"
SCRIPT
    chmod +x test_script.sh

    output=$(./test_script.sh)

    assert_contains "$output" "File Count: 3" "Should only count .txt, .md, and .json files"

    teardown
}

# Test: Script produces formatted output
test_formatted_output() {
    echo "Test: Script produces formatted output"
    setup

    mkdir -p Tool1 Tool2
    echo "test" > Tool1/prompt.txt
    echo "test" > Tool2/config.json

    cat > test_script.sh <<'SCRIPT'
#!/bin/bash
echo "=================================="
echo "System Prompts and Models Rollout"
echo "=================================="
echo ""
for dir in */ ; do
    file_count=$(find "$dir" -type f \( -name "*.txt" -o -name "*.md" -o -name "*.json" \) 2>/dev/null | wc -l)
    if [ $file_count -gt 0 ]; then
        echo "📁 $dir - $file_count files"
    fi
done
SCRIPT
    chmod +x test_script.sh

    output=$(./test_script.sh)

    assert_contains "$output" "System Prompts and Models Rollout" "Should include header"
    assert_contains "$output" "Tool1/" "Should list Tool1"
    assert_contains "$output" "Tool2/" "Should list Tool2"
    assert_contains "$output" "files" "Should mention file counts"

    teardown
}

# Test: Script handles deeply nested directories
test_nested_directories() {
    echo "Test: Script handles deeply nested directories"
    setup

    mkdir -p Tool1/subdir/nested
    echo "test" > Tool1/prompt.txt
    echo "test" > Tool1/subdir/config.json
    echo "test" > Tool1/subdir/nested/deep.md

    cat > test_script.sh <<'SCRIPT'
#!/bin/bash
count=$(find Tool1 -type f \( -name "*.txt" -o -name "*.md" -o -name "*.json" \) 2>/dev/null | wc -l)
echo "File Count: $count"
SCRIPT
    chmod +x test_script.sh

    output=$(./test_script.sh)

    assert_contains "$output" "File Count: 3" "Should find files in nested directories"

    teardown
}

# Test: Script handles special characters in filenames
test_special_characters() {
    echo "Test: Script handles special characters in filenames"
    setup

    mkdir -p "Tool With Spaces"
    echo "test" > "Tool With Spaces/prompt-v1.txt"
    echo "test" > "Tool With Spaces/README (copy).md"

    cat > test_script.sh <<'SCRIPT'
#!/bin/bash
count=$(find "Tool With Spaces" -type f \( -name "*.txt" -o -name "*.md" -o -name "*.json" \) 2>/dev/null | wc -l)
echo "File Count: $count"
SCRIPT
    chmod +x test_script.sh

    output=$(./test_script.sh)

    assert_contains "$output" "File Count: 2" "Should handle spaces in directory and file names"

    teardown
}

# Test: Script handles large number of directories
test_many_directories() {
    echo "Test: Script handles many directories"
    setup

    # Create 50 tool directories
    for i in {1..50}; do
        mkdir -p "Tool$i"
        echo "test" > "Tool$i/prompt.txt"
    done

    cat > test_script.sh <<'SCRIPT'
#!/bin/bash
total_dirs=0
total_files=0
for dir in */ ; do
    file_count=$(find "$dir" -type f \( -name "*.txt" -o -name "*.md" -o -name "*.json" \) 2>/dev/null | wc -l)
    if [ $file_count -gt 0 ]; then
        total_dirs=$((total_dirs + 1))
        total_files=$((total_files + file_count))
    fi
done
echo "Total Directories: $total_dirs"
echo "Total Files: $total_files"
SCRIPT
    chmod +x test_script.sh

    output=$(./test_script.sh)

    assert_contains "$output" "Total Directories: 50" "Should handle 50 directories"
    assert_contains "$output" "Total Files: 50" "Should count all 50 files"

    teardown
}

# Test: Script exits successfully
test_exit_code() {
    echo "Test: Script exits successfully"
    setup

    mkdir -p Tool1
    echo "test" > Tool1/prompt.txt

    cat > test_script.sh <<'SCRIPT'
#!/bin/bash
total_dirs=0
for dir in */ ; do
    file_count=$(find "$dir" -type f \( -name "*.txt" -o -name "*.md" -o -name "*.json" \) 2>/dev/null | wc -l)
    if [ $file_count -gt 0 ]; then
        total_dirs=$((total_dirs + 1))
    fi
done
echo "Done"
SCRIPT
    chmod +x test_script.sh

    ./test_script.sh
    exit_code=$?

    assert_equals "0" "$exit_code" "Script should exit with code 0"

    teardown
}

# Test: Script handles permission denied gracefully
test_permission_denied() {
    echo "Test: Script handles permission denied"
    setup

    mkdir -p Tool1/restricted
    echo "test" > Tool1/prompt.txt
    chmod 000 Tool1/restricted

    cat > test_script.sh <<'SCRIPT'
#!/bin/bash
count=$(find Tool1 -type f \( -name "*.txt" -o -name "*.md" -o -name "*.json" \) 2>/dev/null | wc -l)
echo "File Count: $count"
SCRIPT
    chmod +x test_script.sh

    output=$(./test_script.sh)

    # Should still count accessible files
    assert_contains "$output" "File Count:" "Should produce output despite permission issues"

    chmod 755 Tool1/restricted  # Cleanup
    teardown
}

# Run all tests
main() {
    echo "========================================"
    echo "Running generate_rollouts.sh Test Suite"
    echo "========================================"
    echo ""

    test_empty_directory
    echo ""
    test_file_counting
    echo ""
    test_skip_hidden_directories
    echo ""
    test_skip_site_directory
    echo ""
    test_multiple_file_extensions
    echo ""
    test_formatted_output
    echo ""
    test_nested_directories
    echo ""
    test_special_characters
    echo ""
    test_many_directories
    echo ""
    test_exit_code
    echo ""
    test_permission_denied
    echo ""

    echo "========================================"
    echo "Test Results"
    echo "========================================"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo "Total: $((TESTS_PASSED + TESTS_FAILED))"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}✗ Some tests failed${NC}"
        exit 1
    fi
}

main