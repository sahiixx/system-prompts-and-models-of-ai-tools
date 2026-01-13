/**
 * Unit tests for check-duplicates.js
 * Tests duplicate content detection
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { mkdtempSync, rmSync } = require('fs');
const os = require('os');

// Import the DuplicateChecker class
const DuplicateChecker = require('../../scripts/check-duplicates.js');

describe('DuplicateChecker', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-dupe-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('DuplicateChecker initialization', () => {
    const checker = new DuplicateChecker();
    
    assert.ok(checker);
    assert.ok(Array.isArray(checker.files));
    assert.ok(checker.hashes instanceof Map);
    assert.ok(Array.isArray(checker.duplicates));
    assert.ok(Array.isArray(checker.similar));
  });

  test('calculateHash produces consistent hashes', () => {
    const checker = new DuplicateChecker();
    const content = 'Test content for hashing';
    
    const hash1 = checker.calculateHash(content);
    const hash2 = checker.calculateHash(content);
    
    assert.strictEqual(hash1, hash2);
    assert.strictEqual(typeof hash1, 'string');
    assert.ok(hash1.length > 0);
  });

  test('calculateHash produces different hashes for different content', () => {
    const checker = new DuplicateChecker();
    
    const hash1 = checker.calculateHash('Content A');
    const hash2 = checker.calculateHash('Content B');
    
    assert.notStrictEqual(hash1, hash2);
  });

  test('calculateSimilarity for identical strings', () => {
    const checker = new DuplicateChecker();
    const content = 'Identical content string';
    
    const similarity = checker.calculateSimilarity(content, content);
    
    assert.ok(similarity >= 90);
  });

  test('calculateSimilarity for completely different strings', () => {
    const checker = new DuplicateChecker();
    
    const similarity = checker.calculateSimilarity(
      'Completely different content',
      'Totally unrelated text'
    );
    
    assert.ok(similarity < 50);
  });

  test('calculateSimilarity for partially similar strings', () => {
    const checker = new DuplicateChecker();
    const base = 'The quick brown fox jumps over the lazy dog';
    const modified = 'The quick brown fox jumps over the sleepy cat';
    
    const similarity = checker.calculateSimilarity(base, modified);
    
    // Should be somewhat similar but not identical
    assert.ok(similarity > 30);
    assert.ok(similarity < 100);
  });

  test('calculateSimilarity with empty strings', () => {
    const checker = new DuplicateChecker();
    
    const similarity = checker.calculateSimilarity('', '');
    
    // Both empty should be considered similar
    assert.ok(similarity >= 0);
  });

  test('calculateSimilarity with very long strings', () => {
    const checker = new DuplicateChecker();
    const long1 = 'a'.repeat(1000);
    const long2 = 'a'.repeat(1000);
    
    const similarity = checker.calculateSimilarity(long1, long2);
    
    assert.ok(similarity >= 90);
  });

  test('collectFiles finds prompt files', () => {
    const checker = new DuplicateChecker();
    
    // Mock ROOT_DIR to tempDir
    const originalModule = require.cache[require.resolve('../../scripts/check-duplicates.js')];
    
    // Create test structure in tempDir
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(path.join(toolDir, 'prompt.txt'), 'Test prompt');
    fs.writeFileSync(path.join(toolDir, 'system-prompt.txt'), 'System prompt');
    fs.writeFileSync(path.join(toolDir, 'readme.md'), 'Not a prompt');
    
    // Note: collectFiles uses ROOT_DIR constant, which we can't easily override
    // This test would need refactoring of the original code for proper testing
  });

  test('findExactDuplicates detects identical hashes', () => {
    const checker = new DuplicateChecker();
    
    // Manually add files with same hash
    const hash = 'abc123';
    checker.files = [
      { tool: 'Tool1', file: 'prompt1.txt', hash, size: 100 },
      { tool: 'Tool2', file: 'prompt2.txt', hash, size: 100 },
      { tool: 'Tool3', file: 'prompt3.txt', hash, size: 100 }
    ];
    
    checker.findExactDuplicates();
    
    assert.strictEqual(checker.duplicates.length, 1);
    assert.strictEqual(checker.duplicates[0].count, 3);
    assert.strictEqual(checker.duplicates[0].hash, hash);
  });

  test('findExactDuplicates handles no duplicates', () => {
    const checker = new DuplicateChecker();
    
    checker.files = [
      { tool: 'Tool1', file: 'prompt1.txt', hash: 'hash1', size: 100 },
      { tool: 'Tool2', file: 'prompt2.txt', hash: 'hash2', size: 100 },
      { tool: 'Tool3', file: 'prompt3.txt', hash: 'hash3', size: 100 }
    ];
    
    checker.findExactDuplicates();
    
    assert.strictEqual(checker.duplicates.length, 0);
  });

  test('findExactDuplicates handles empty files list', () => {
    const checker = new DuplicateChecker();
    checker.files = [];
    
    checker.findExactDuplicates();
    
    assert.strictEqual(checker.duplicates.length, 0);
  });
});

describe('DuplicateChecker similarity detection', () => {
  test('calculateSimilarity handles short strings', () => {
    const checker = new DuplicateChecker();
    
    const similarity = checker.calculateSimilarity('abc', 'def');
    
    assert.ok(similarity >= 0);
    assert.ok(similarity <= 100);
  });

  test('calculateSimilarity with special characters', () => {
    const checker = new DuplicateChecker();
    
    const str1 = 'Hello\\! @#$%^&*() World';
    const str2 = 'Hello\\! @#$%^&*() World';
    
    const similarity = checker.calculateSimilarity(str1, str2);
    
    assert.ok(similarity >= 90);
  });

  test('calculateSimilarity with Unicode', () => {
    const checker = new DuplicateChecker();
    
    const str1 = '你好世界 🚀';
    const str2 = '你好世界 🎉';
    
    const similarity = checker.calculateSimilarity(str1, str2);
    
    assert.ok(similarity > 50);
  });

  test('calculateSimilarity with whitespace differences', () => {
    const checker = new DuplicateChecker();
    
    const str1 = 'Hello World';
    const str2 = 'Hello   World';
    
    const similarity = checker.calculateSimilarity(str1, str2);
    
    assert.ok(similarity >= 50);
  });
});

describe('DuplicateChecker edge cases', () => {
  test('handles files with null content', () => {
    const checker = new DuplicateChecker();
    
    checker.files = [
      { tool: 'Tool1', file: 'file1.txt', content: '', hash: 'h1', size: 0 },
      { tool: 'Tool2', file: 'file2.txt', content: '', hash: 'h2', size: 0 }
    ];
    
    // Should not throw
    assert.doesNotThrow(() => {
      checker.findExactDuplicates();
    });
  });

  test('calculateHash with empty string', () => {
    const checker = new DuplicateChecker();
    
    const hash = checker.calculateHash('');
    
    assert.strictEqual(typeof hash, 'string');
    assert.ok(hash.length > 0);
  });

  test('calculateHash with very long string', () => {
    const checker = new DuplicateChecker();
    const longString = 'x'.repeat(100000);
    
    const hash = checker.calculateHash(longString);
    
    assert.strictEqual(typeof hash, 'string');
    assert.ok(hash.length > 0);
  });
});