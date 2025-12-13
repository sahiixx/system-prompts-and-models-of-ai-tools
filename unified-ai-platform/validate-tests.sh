#!/bin/bash

echo "=========================================="
echo "Test Suite Validation"
echo "=========================================="
echo ""

echo "1. Checking Node.js installation..."
if command -v node &> /dev/null; then
    echo "   ✓ Node.js version: $(node --version)"
else
    echo "   ✗ Node.js not found"
    exit 1
fi

echo ""
echo "2. Checking npm installation..."
if command -v npm &> /dev/null; then
    echo "   ✓ npm version: $(npm --version)"
else
    echo "   ✗ npm not found"
    exit 1
fi

echo ""
echo "3. Checking package.json..."
if [ -f "package.json" ]; then
    echo "   ✓ package.json found"
else
    echo "   ✗ package.json not found"
    exit 1
fi

echo ""
echo "4. Checking Jest configuration..."
if [ -f "jest.config.js" ]; then
    echo "   ✓ jest.config.js found"
else
    echo "   ✗ jest.config.js not found"
    exit 1
fi

echo ""
echo "5. Listing test files..."
TEST_FILES=$(find tests -name "*.test.js" -type f | wc -l)
echo "   ✓ Found $TEST_FILES test files"
find tests -name "*.test.js" -type f | sed 's/^/     - /'

echo ""
echo "6. Counting test cases..."
TOTAL_TESTS=$(grep -r "test(" tests/unit/*.test.js | wc -l)
echo "   ✓ Total test cases: $TOTAL_TESTS"

echo ""
echo "7. Test file breakdown:"
for file in tests/unit/*.test.js; do
    count=$(grep -c "test(" "$file" 2>/dev/null || echo "0")
    echo "     - $(basename $file): $count tests"
done

echo ""
echo "8. Checking for required dependencies..."
REQUIRED_DEPS=("jest" "supertest" "express")
for dep in "${REQUIRED_DEPS[@]}"; do
    if grep -q "\"$dep\"" package.json; then
        echo "   ✓ $dep found in package.json"
    else
        echo "   ⚠ $dep not found in package.json"
    fi
done

echo ""
echo "=========================================="
echo "Validation Complete"
echo "=========================================="
echo ""
echo "To run tests:"
echo "  npm test                    # Run all tests"
echo "  npm test -- --coverage      # Run with coverage"
echo "  npm run test:unit           # Run unit tests only"
echo "  npm run test:watch          # Run in watch mode"
echo "  npm run test:verbose        # Run with verbose output"