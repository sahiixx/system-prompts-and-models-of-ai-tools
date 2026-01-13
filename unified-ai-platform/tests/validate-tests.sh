#!/bin/bash

echo "=== Validating Test Files ==="
echo ""

cd "$(dirname "$0")/.."
test_dir="tests/unit"
all_valid=true

for test_file in "$test_dir"/*.test.js; do
    filename=$(basename "$test_file")
    printf "Checking %-40s ... " "$filename"
    
    if node -c "$test_file" 2>/dev/null; then
        echo "✓ PASS"
    else
        echo "✗ FAIL"
        all_valid=false
        node -c "$test_file"
    fi
done

echo ""
if [ "$all_valid" = true ]; then
    echo "✅ All test files are syntactically valid!"
    exit 0
else
    echo "❌ Some test files have syntax errors!"
    exit 1
fi