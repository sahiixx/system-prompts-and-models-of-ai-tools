#!/bin/bash

# Test Validation Script for Unified AI Platform
# This script validates that all test files are properly structured

echo "================================================"
echo "  Unified AI Platform - Test Validation"
echo "================================================"
echo ""

cd "$(dirname "$0")"

echo "📁 Checking test directory structure..."
if [ -d "tests/unit" ]; then
    echo "✅ tests/unit directory exists"
else
    echo "❌ tests/unit directory not found"
    exit 1
fi

echo ""
echo "📝 Counting test files..."
TEST_COUNT=$(find tests/unit -name "*.test.js" -type f | wc -l)
echo "Found $TEST_COUNT test files"

echo ""
echo "📋 Test files:"
find tests/unit -name "*.test.js" -type f -exec basename {} \; | sort

echo ""
echo "📊 Test file statistics:"
find tests/unit -name "*.test.js" -type f -exec wc -l {} \; | sort -n

echo ""
echo "🔍 Checking for syntax errors in test files..."
SYNTAX_ERRORS=0
for file in tests/unit/*.test.js; do
    if [ -f "$file" ]; then
        node -c "$file" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ $(basename $file) - syntax OK"
        else
            echo "❌ $(basename $file) - syntax error"
            SYNTAX_ERRORS=$((SYNTAX_ERRORS + 1))
        fi
    fi
done

echo ""
if [ $SYNTAX_ERRORS -eq 0 ]; then
    echo "✅ All test files have valid syntax"
else
    echo "❌ Found $SYNTAX_ERRORS file(s) with syntax errors"
    exit 1
fi

echo ""
echo "📦 Checking for Jest configuration..."
if [ -f "jest.config.js" ]; then
    echo "✅ jest.config.js exists"
else
    echo "❌ jest.config.js not found"
    exit 1
fi

echo ""
echo "📚 Checking for package.json..."
if [ -f "package.json" ]; then
    echo "✅ package.json exists"
    
    echo ""
    echo "🧪 Checking test scripts..."
    if grep -q '"test"' package.json; then
        echo "✅ Test script configured"
        echo "   Available test commands:"
        grep '"test' package.json | sed 's/^/   /'
    else
        echo "❌ No test script found in package.json"
    fi
else
    echo "❌ package.json not found"
    exit 1
fi

echo ""
echo "✨ Validation Summary"
echo "===================="
echo "Total test files: $TEST_COUNT"
echo "Syntax errors: $SYNTAX_ERRORS"
echo ""

if [ $SYNTAX_ERRORS -eq 0 ]; then
    echo "🎉 All validations passed!"
    echo ""
    echo "To run the tests, use:"
    echo "  npm test                  # Run all tests"
    echo "  npm run test:watch       # Run in watch mode"
    echo "  npm run test:verbose     # Run with verbose output"
    echo "  npm test -- --coverage   # Run with coverage report"
    exit 0
else
    echo "❌ Validation failed. Please fix the errors above."
    exit 1
fi