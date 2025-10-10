#!/bin/bash
# shellcheck shell=bash
set -e

echo "====================================="
echo "Running JavaScript Tests"
echo "====================================="
cd "$(dirname "$0")/.."
node --test scripts/*.test.js

echo ""
echo "====================================="
echo "Running Python Tests"
echo "====================================="
python3 -m unittest discover -s scripts -p 'test_*.py' -v

echo ""
echo "====================================="
echo "All Tests Completed Successfully\!"
echo "====================================="