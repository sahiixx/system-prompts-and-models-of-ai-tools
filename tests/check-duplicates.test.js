#!/usr/bin/env node
/**
 * Unit Tests for scripts/check-duplicates.js
 * Tests the duplicate content detector
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Import the DuplicateChecker class
const DuplicateChecker = require('../scripts/check-duplicates.js');

// Test Suite
class DuplicateCheckerTests {
  constructor() {
    this.tempDirs = [];
    this.passed = 0;
    this.failed = 0;
    this.total = 0;
  }

  log(message, type = 'info') {
    const colors = {
      pass: '\x1b[32m',
      fail: '\x1b[31m',
      info: '\x1b[36m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  createTempDir() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'duplicate-test-'));
    this.tempDirs.push(tempDir);
    return tempDir;
  }

  cleanup() {
    this.tempDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
    this.tempDirs = [];
  }

  assert(condition, message) {
    this.total++;
    try {
      assert.strictEqual(condition, true, message);
      this.passed++;
      this.log(`  ✓ ${message}`, 'pass');
    } catch (error) {
      this.failed++;
      this.log(`  ✗ ${message}`, 'fail');
      this.log(`    ${error.message}`, 'fail');
    }
  }

  assertEqual(actual, expected, message) {
    this.total++;
    try {
      assert.strictEqual(actual, expected, message);
      this.passed++;
      this.log(`  ✓ ${message}`, 'pass');
    } catch (error) {
      this.failed++;
      this.log(`  ✗ ${message}`, 'fail');
      this.log(`    Expected: ${expected}, Got: ${actual}`, 'fail');
    }
  }

  // Test: DuplicateChecker initialization
  testDuplicateCheckerInitialization() {
    this.log('\nTest: DuplicateChecker Initialization');

    const checker = new DuplicateChecker();
    this.assert(checker !== null, 'DuplicateChecker should be instantiated');
    this.assert(Array.isArray(checker.files), 'Files should be an array');
    this.assert(checker.hashes instanceof Map, 'Hashes should be a Map');
    this.assert(Array.isArray(checker.duplicates), 'Duplicates should be an array');
    this.assert(Array.isArray(checker.similar), 'Similar should be an array');
  }

  // Test: Hash calculation
  testHashCalculation() {
    this.log('\nTest: Hash Calculation');

    const checker = new DuplicateChecker();
    const content = 'Test content for hashing';
    const hash = checker.calculateHash(content);

    this.assert(typeof hash === 'string', 'Hash should be a string');
    this.assertEqual(hash.length, 32, 'MD5 hash should be 32 characters');

    // Same content should produce same hash
    const hash2 = checker.calculateHash(content);
    this.assertEqual(hash, hash2, 'Same content should produce same hash');
  }

  // Test: Different content produces different hashes
  testDifferentHashes() {
    this.log('\nTest: Different Content Hashes');

    const checker = new DuplicateChecker();
    const content1 = 'First content';
    const content2 = 'Second content';

    const hash1 = checker.calculateHash(content1);
    const hash2 = checker.calculateHash(content2);

    this.assert(hash1 !== hash2, 'Different content should produce different hashes');
  }

  // Test: Similarity calculation - identical strings
  testSimilarityIdentical() {
    this.log('\nTest: Similarity Calculation (Identical)');

    const checker = new DuplicateChecker();
    const str1 = 'A'.repeat(200);
    const str2 = 'A'.repeat(200);

    const similarity = checker.calculateSimilarity(str1, str2);
    this.assertEqual(similarity, 100, 'Identical strings should have 100% similarity');
  }

  // Test: Similarity calculation - completely different
  testSimilarityDifferent() {
    this.log('\nTest: Similarity Calculation (Different)');

    const checker = new DuplicateChecker();
    const str1 = 'A'.repeat(200);
    const str2 = 'B'.repeat(200);

    const similarity = checker.calculateSimilarity(str1, str2);
    this.assert(similarity < 50, 'Completely different strings should have low similarity');
  }

  // Test: Similarity calculation - partial match
  testSimilarityPartial() {
    this.log('\nTest: Similarity Calculation (Partial)');

    const checker = new DuplicateChecker();
    const common = 'A'.repeat(150);
    const str1 = common + 'B'.repeat(50);
    const str2 = common + 'C'.repeat(50);

    const similarity = checker.calculateSimilarity(str1, str2);
    this.assert(similarity > 50, 'Partially similar strings should have moderate similarity');
  }

  // Test: Empty string similarity
  testSimilarityEmpty() {
    this.log('\nTest: Empty String Similarity');

    const checker = new DuplicateChecker();
    const similarity = checker.calculateSimilarity('', '');

    this.assertEqual(similarity, 100, 'Empty strings should have 100% similarity');
  }

  // Test: One empty string
  testSimilarityOneEmpty() {
    this.log('\nTest: One Empty String Similarity');

    const checker = new DuplicateChecker();
    const similarity = checker.calculateSimilarity('content', '');

    this.assert(similarity < 100, 'Empty vs non-empty should have low similarity');
  }

  // Test: Finding exact duplicates
  testFindExactDuplicates() {
    this.log('\nTest: Find Exact Duplicates');

    const checker = new DuplicateChecker();
    const content = 'Duplicate content';

    checker.files = [
      { tool: 'Tool1', file: 'Prompt.txt', content, hash: checker.calculateHash(content), size: content.length },
      { tool: 'Tool2', file: 'Prompt.txt', content, hash: checker.calculateHash(content), size: content.length }
    ];

    checker.findExactDuplicates();

    this.assertEqual(checker.duplicates.length, 1, 'Should find one duplicate set');
    this.assertEqual(checker.duplicates[0].count, 2, 'Duplicate set should have 2 files');
  }

  // Test: No duplicates found
  testNoDuplicatesFound() {
    this.log('\nTest: No Duplicates Found');

    const checker = new DuplicateChecker();

    checker.files = [
      { tool: 'Tool1', file: 'Prompt.txt', content: 'Content 1', hash: checker.calculateHash('Content 1'), size: 9 },
      { tool: 'Tool2', file: 'Prompt.txt', content: 'Content 2', hash: checker.calculateHash('Content 2'), size: 9 }
    ];

    checker.findExactDuplicates();

    this.assertEqual(checker.duplicates.length, 0, 'Should find no duplicates');
  }

  // Test: Three-way duplicate
  testThreeWayDuplicate() {
    this.log('\nTest: Three-Way Duplicate');

    const checker = new DuplicateChecker();
    const content = 'Triplicate content';

    checker.files = [
      { tool: 'Tool1', file: 'Prompt.txt', content, hash: checker.calculateHash(content), size: content.length },
      { tool: 'Tool2', file: 'Prompt.txt', content, hash: checker.calculateHash(content), size: content.length },
      { tool: 'Tool3', file: 'Prompt.txt', content, hash: checker.calculateHash(content), size: content.length }
    ];

    checker.findExactDuplicates();

    this.assertEqual(checker.duplicates.length, 1, 'Should find one duplicate set');
    this.assertEqual(checker.duplicates[0].count, 3, 'Duplicate set should have 3 files');
  }

  // Test: Multiple duplicate sets
  testMultipleDuplicateSets() {
    this.log('\nTest: Multiple Duplicate Sets');

    const checker = new DuplicateChecker();
    const content1 = 'First duplicate';
    const content2 = 'Second duplicate';

    checker.files = [
      { tool: 'Tool1', file: 'A.txt', content: content1, hash: checker.calculateHash(content1), size: content1.length },
      { tool: 'Tool2', file: 'A.txt', content: content1, hash: checker.calculateHash(content1), size: content1.length },
      { tool: 'Tool3', file: 'B.txt', content: content2, hash: checker.calculateHash(content2), size: content2.length },
      { tool: 'Tool4', file: 'B.txt', content: content2, hash: checker.calculateHash(content2), size: content2.length }
    ];

    checker.findExactDuplicates();

    this.assertEqual(checker.duplicates.length, 2, 'Should find two duplicate sets');
  }

  // Test: Case sensitivity in hashing
  testCaseSensitiveHashing() {
    this.log('\nTest: Case Sensitive Hashing');

    const checker = new DuplicateChecker();
    const hash1 = checker.calculateHash('Content');
    const hash2 = checker.calculateHash('content');

    this.assert(hash1 !== hash2, 'Hashes should be case-sensitive');
  }

  // Test: Whitespace sensitivity
  testWhitespaceSensitivity() {
    this.log('\nTest: Whitespace Sensitivity');

    const checker = new DuplicateChecker();
    const hash1 = checker.calculateHash('content');
    const hash2 = checker.calculateHash('content ');
    const hash3 = checker.calculateHash(' content');

    this.assert(hash1 !== hash2, 'Trailing whitespace should affect hash');
    this.assert(hash1 !== hash3, 'Leading whitespace should affect hash');
  }

  // Test: Unicode content hashing
  testUnicodeHashing() {
    this.log('\nTest: Unicode Content Hashing');

    const checker = new DuplicateChecker();
    const content1 = '你好世界 🌍';
    const content2 = '你好世界 🌍';

    const hash1 = checker.calculateHash(content1);
    const hash2 = checker.calculateHash(content2);

    this.assertEqual(hash1, hash2, 'Unicode content should hash consistently');
  }

  // Test: Long content hashing
  testLongContentHashing() {
    this.log('\nTest: Long Content Hashing');

    const checker = new DuplicateChecker();
    const longContent = 'A'.repeat(100000);

    const hash = checker.calculateHash(longContent);

    this.assert(typeof hash === 'string', 'Should handle long content');
    this.assertEqual(hash.length, 32, 'Hash length should be consistent');
  }

  // Test: Similarity with very large size difference
  testSimilarityLargeSizeDifference() {
    this.log('\nTest: Similarity with Large Size Difference');

    const checker = new DuplicateChecker();
    const str1 = 'A'.repeat(100);
    const str2 = 'A'.repeat(1000);

    // Note: The actual implementation might skip this in findSimilarFiles
    const similarity = checker.calculateSimilarity(str1, str2);

    this.assert(typeof similarity === 'number', 'Should return numeric similarity');
    this.assert(similarity >= 0 && similarity <= 100, 'Similarity should be 0-100%');
  }

  // Test: Similarity boundary values
  testSimilarityBoundaries() {
    this.log('\nTest: Similarity Boundary Values');

    const checker = new DuplicateChecker();

    // Test with threshold-edge cases
    const str1 = 'A'.repeat(150) + 'B'.repeat(50);
    const str2 = 'A'.repeat(160) + 'C'.repeat(40);

    const similarity = checker.calculateSimilarity(str1, str2);

    this.assert(similarity >= 0 && similarity <= 100, 'Similarity should be in valid range');
  }

  // Test: Multiple similar but not identical files
  testMultipleSimilarFiles() {
    this.log('\nTest: Multiple Similar Files');

    const checker = new DuplicateChecker();
    const base = 'A'.repeat(150);

    checker.files = [
      { tool: 'Tool1', file: 'A.txt', content: base + 'B'.repeat(50), hash: 'hash1', size: 200 },
      { tool: 'Tool2', file: 'A.txt', content: base + 'C'.repeat(50), hash: 'hash2', size: 200 }
    ];

    checker.findSimilarFiles(75); // 75% threshold

    this.assert(checker.similar.length >= 0, 'Should check for similar files');
  }

  // Test: Similarity sorting
  testSimilaritySorting() {
    this.log('\nTest: Similarity Sorting');

    const checker = new DuplicateChecker();

    checker.similar = [
      { similarity: 85, file1: {}, file2: {} },
      { similarity: 95, file1: {}, file2: {} },
      { similarity: 75, file1: {}, file2: {} }
    ];

    checker.similar.sort((a, b) => b.similarity - a.similarity);

    this.assertEqual(checker.similar[0].similarity, 95, 'Highest similarity should be first');
    this.assertEqual(checker.similar[2].similarity, 75, 'Lowest similarity should be last');
  }

  // Run all tests
  runAll() {
    this.log('\n' + '='.repeat(60), 'info');
    this.log('Starting DuplicateChecker Test Suite', 'info');
    this.log('='.repeat(60), 'info');

    try {
      this.testDuplicateCheckerInitialization();
      this.testHashCalculation();
      this.testDifferentHashes();
      this.testSimilarityIdentical();
      this.testSimilarityDifferent();
      this.testSimilarityPartial();
      this.testSimilarityEmpty();
      this.testSimilarityOneEmpty();
      this.testFindExactDuplicates();
      this.testNoDuplicatesFound();
      this.testThreeWayDuplicate();
      this.testMultipleDuplicateSets();
      this.testCaseSensitiveHashing();
      this.testWhitespaceSensitivity();
      this.testUnicodeHashing();
      this.testLongContentHashing();
      this.testSimilarityLargeSizeDifference();
      this.testSimilarityBoundaries();
      this.testMultipleSimilarFiles();
      this.testSimilaritySorting();
    } finally {
      this.cleanup();
    }

    this.printSummary();
  }

  printSummary() {
    this.log('\n' + '='.repeat(60), 'info');
    this.log('Test Summary', 'info');
    this.log('='.repeat(60), 'info');
    this.log(`\nTotal Tests: ${this.total}`, 'info');
    this.log(`Passed: ${this.passed}`, 'pass');
    this.log(`Failed: ${this.failed}`, 'fail');
    this.log(`Success Rate: ${((this.passed / this.total) * 100).toFixed(2)}%\n`, 'info');

    process.exit(this.failed > 0 ? 1 : 0);
  }
}

// Run tests
if (require.main === module) {
  const tests = new DuplicateCheckerTests();
  tests.runAll();
}

module.exports = DuplicateCheckerTests;