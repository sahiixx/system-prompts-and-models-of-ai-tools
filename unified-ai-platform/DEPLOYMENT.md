# Test Deployment Guide

## What Was Generated

This document describes the comprehensive unit test suite that was generated for the modified files in your Git branch.

### Test Files Created (7 files, ~2,340 lines)

1. **lovable.test.js** - Tests for Lovable AI tool
2. **orchids.test.js** - Tests for Orchids.app
3. **same-dev.test.js** - Tests for Same.dev
4. **spawn.test.js** - Tests for Spawn tool
5. **modified-files-integration.test.js** - Integration tests
6. **comprehensive-validation.test.js** - Advanced validation
7. **readme.test.js** - README validation

### Documentation Created (3 files)

1. **TEST_GENERATION_REPORT.md** - Detailed test generation report
2. **TEST_SUMMARY.md** - Quick summary of tests
3. **TESTING.md** - Complete testing guide

### Utility Scripts (1 file)

1. **tests/validate-tests.sh** - Test validation script

## Quick Start

```bash
# Navigate to the platform directory
cd unified-ai-platform

# Install dependencies (if not already installed)
npm install

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test suite
npm test -- lovable.test.js
```

## What the Tests Cover

### Modified Files Tested

- ✅ Lovable/Agent Prompt.txt
- ✅ Lovable/Agent Tools.json
- ✅ Lovable/Prompt.txt
- ✅ Orchids.app/Decision-making prompt.txt
- ✅ Orchids.app/System Prompt.txt
- ✅ Same.dev/Prompt.txt
- ✅ -Spawn/Prompt.txt
- ✅ README.md

### Test Categories (145+ tests)

1. **Structural Validation** (25%)
   - File existence
   - Directory structure
   - File sizes
   - Schema structure

2. **Content Validation** (30%)
   - JSON schema validation
   - Prompt quality checks
   - Required fields verification
   - Content completeness

3. **Security Validation** (20%)
   - API key detection
   - Secret scanning
   - Token pattern matching
   - Private URL detection

4. **Format Validation** (15%)
   - UTF-8 encoding
   - Line endings
   - Indentation
   - JSON formatting

5. **Quality Assurance** (10%)
   - Typo detection
   - Placeholder removal
   - TODO markers
   - Best practices

## Integration with CI/CD

### GitHub Actions

Add to `.github/workflows/test.yml`:

```yaml
name: Run Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: unified-ai-platform/package-lock.json
    
    - name: Install dependencies
      working-directory: unified-ai-platform
      run: npm ci
    
    - name: Run tests
      working-directory: unified-ai-platform
      run: npm test -- --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        directory: unified-ai-platform/coverage
```

### GitLab CI

Add to `.gitlab-ci.yml`:

```yaml
test:
  image: node:18
  stage: test
  before_script:
    - cd unified-ai-platform
    - npm ci
  script:
    - npm test -- --coverage
  artifacts:
    reports:
      junit: unified-ai-platform/junit.xml
      coverage_report:
        coverage_format: cobertura
        path: unified-ai-platform/coverage/cobertura-coverage.xml
```

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/sh

echo "Running tests..."
cd unified-ai-platform
npm test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Commit aborted."
    echo "Fix the failing tests or use 'git commit --no-verify' to skip."
    exit 1
fi

echo "✅ Tests passed!"
exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Maintenance

### Adding Tests for New Files

When you add new AI tool configurations:

1. Create a new test file:
```bash
cp unified-ai-platform/tests/unit/lovable.test.js \
   unified-ai-platform/tests/unit/newtool.test.js
```

2. Update the test file to point to your new files

3. Run validation:
```bash
cd unified-ai-platform/tests
./validate-tests.sh
```

4. Run the new tests:
```bash
npm test -- newtool.test.js
```

### Updating Existing Tests

When modifying tool configurations:

1. Update corresponding test expectations
2. Run affected tests:
```bash
npm test -- lovable.test.js
```
3. Verify all tests pass:
```bash
npm test
```

### Test Coverage Goals

Maintain these coverage metrics:
- **Overall:** > 80%
- **JSON Files:** 100%
- **Security Tests:** 100%
- **Format Tests:** > 90%

Check coverage:
```bash
npm test -- --coverage
```

## Troubleshooting

### Common Issues

**Issue:** Tests fail with "Cannot find module"
```bash
cd unified-ai-platform
rm -rf node_modules package-lock.json
npm install
```

**Issue:** Path-related failures
- Tests use absolute paths constructed from `__dirname`
- Ensure you're running tests from unified-ai-platform directory
- Check that modified files exist in expected locations

**Issue:** Encoding errors on Windows
```bash
git config core.autocrlf false
git rm --cached -r .
git reset --hard
```

**Issue:** Tests timeout
Increase timeout in jest.config.js:
```javascript
module.exports = {
  testTimeout: 10000,
};
```

### Getting Help

1. Check TESTING.md for detailed testing guide
2. Review TEST_GENERATION_REPORT.md for test descriptions
3. Run with verbose output:
```bash
npm test -- --verbose
```
4. Check specific test file syntax:
```bash
node -c tests/unit/lovable.test.js
```

## Verification Checklist

Before committing:

- [ ] All tests pass: `npm test`
- [ ] No syntax errors: `./tests/validate-tests.sh`
- [ ] Coverage meets goals: `npm test -- --coverage`
- [ ] No security issues detected
- [ ] Documentation updated if needed
- [ ] New files added to git
- [ ] Commit message describes changes

## Performance

Expected test execution times:
- **Full suite:** < 2 minutes
- **Single test file:** < 10 seconds
- **With coverage:** < 3 minutes

If tests are slower:
1. Check for unnecessary file I/O
2. Use beforeAll for expensive setup
3. Consider test.concurrent for parallel execution

## Security Notes

These tests actively scan for:
- API keys and tokens
- Hardcoded secrets
- Private URLs and IPs
- Sensitive file paths
- Exposed credentials

Any security issues will cause tests to fail immediately.

## Next Steps

1. **Run the tests:**
```bash
cd unified-ai-platform
npm test
```

2. **Review the output:**
   - All tests should pass ✓
   - Check coverage report
   - Review any warnings

3. **Integrate with CI/CD:**
   - Add GitHub Actions workflow
   - Set up pre-commit hooks
   - Configure coverage reporting

4. **Maintain the tests:**
   - Update tests when adding files
   - Keep coverage above 80%
   - Review test output regularly

## Success Criteria

✅ All 145+ tests passing
✅ No security vulnerabilities detected
✅ Coverage > 80%
✅ Tests run in < 2 minutes
✅ No syntax errors
✅ All modified files validated

---

**Generated:** 2025-12-13
**Framework:** Jest  
**Node Version:** 14+
**Total Tests:** 145+
**Total Lines:** ~2,340