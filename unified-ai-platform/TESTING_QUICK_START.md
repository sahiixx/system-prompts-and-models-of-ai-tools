# Testing Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies
```bash
cd unified-ai-platform
npm install
```

### Step 2: Run Tests
```bash
npm test
```

### Step 3: View Coverage
```bash
npm run test:coverage
open coverage/index.html  # or browse to coverage/index.html
```

---

## 📋 Common Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests with coverage |
| `npm run test:watch` | Run tests in watch mode (auto-rerun on changes) |
| `npm run test:unit` | Run only unit tests |
| `npm run test:coverage` | Generate detailed HTML coverage report |
| `npx jest tests/__tests__/index.test.js` | Run specific test file |
| `npx jest --verbose` | Run with verbose output |

---

## 📊 What Gets Tested

### API Endpoints
- ✅ `GET /health` - Health check and status
- ✅ `GET /api/v1/tools` - List available tools
- ✅ `GET /api/v1/memory` - Retrieve memories
- ✅ `POST /api/v1/memory` - Store new memory
- ✅ `GET /api/v1/plans` - Retrieve plans
- ✅ `POST /api/v1/plans` - Create new plan
- ✅ `GET /api/v1/capabilities` - Platform capabilities
- ✅ `GET /api/v1/demo` - Demo information

### Test Categories
- ✅ Happy paths (valid inputs)
- ✅ Error conditions (invalid inputs)
- ✅ Edge cases (empty, null, large values)
- ✅ Security (CORS, middleware)
- ✅ Concurrency (parallel requests)

---

## 📈 Coverage Targets

| Metric | Target | Status |
|--------|--------|--------|
| Lines | 80% | ✅ Configured |
| Functions | 80% | ✅ Configured |
| Statements | 80% | ✅ Configured |
| Branches | 70% | ✅ Configured |

---

## 🐛 Troubleshooting

### Tests won't run?
```bash
# Check Node version (needs >= 18)
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Port conflicts?
Tests use random ports, but if you see "EADDRINUSE":
```bash
# Kill any Node processes
pkill -9 node
npm test
```

### Coverage too low?
```bash
# See which files need more tests
npm run test:coverage
# Open coverage/index.html to see details
```

---

## 📚 More Information

- **Full Documentation**: See `TESTS_GENERATED.md`
- **Test Details**: See `tests/README.md`
- **Coverage Summary**: See `TEST_SUMMARY.md`

---

## ✅ Verification Checklist

Before committing:
- [ ] All tests pass (`npm test`)
- [ ] Coverage meets thresholds (80%/70%)
- [ ] No console errors or warnings
- [ ] Tests run quickly (< 10 seconds)

---

**Need Help?** Check the test output for specific error messages or review the documentation files listed above.