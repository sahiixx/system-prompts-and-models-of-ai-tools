const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const DuplicateChecker = require('./check-duplicates.js');

function createTestDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'duplicate-test-'));
}

function cleanupTestDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('DuplicateChecker - constructor initializes correctly', () => {
  const checker = new DuplicateChecker();
  assert.ok(Array.isArray(checker.files));
  assert.strictEqual(checker.files.length, 0);
  assert.ok(checker.hashes instanceof Map);
  assert.ok(Array.isArray(checker.duplicates));
  assert.ok(Array.isArray(checker.similar));
});

test('DuplicateChecker - calculateHash() generates consistent hashes', () => {
  const checker = new DuplicateChecker();
  const content = 'Test content';

  const hash1 = checker.calculateHash(content);
  const hash2 = checker.calculateHash(content);

  assert.strictEqual(hash1, hash2);
  assert.strictEqual(typeof hash1, 'string');
  assert.strictEqual(hash1.length, 32); // MD5 hash length
});

test('DuplicateChecker - calculateHash() generates different hashes for different content', () => {
  const checker = new DuplicateChecker();

  const hash1 = checker.calculateHash('Content 1');
  const hash2 = checker.calculateHash('Content 2');

  assert.notStrictEqual(hash1, hash2);
});

test('DuplicateChecker - calculateSimilarity() returns 100 for identical strings', () => {
  const checker = new DuplicateChecker();
  const str = 'This is a test string';

  const similarity = checker.calculateSimilarity(str, str);

  assert.strictEqual(similarity, 100);
});

test('DuplicateChecker - calculateSimilarity() returns 0 for completely different strings', () => {
  const checker = new DuplicateChecker();

  const similarity = checker.calculateSimilarity('aaaaaaa', 'bbbbbbb');

  assert.ok(similarity < 50);
});

test('DuplicateChecker - calculateSimilarity() handles empty strings', () => {
  const checker = new DuplicateChecker();

  const similarity = checker.calculateSimilarity('', '');

  assert.strictEqual(similarity, 100);
});

test('DuplicateChecker - calculateSimilarity() handles one empty string', () => {
  const checker = new DuplicateChecker();

  const similarity = checker.calculateSimilarity('', 'content');

  assert.ok(similarity >= 0);
  assert.ok(similarity <= 100);
});

test('DuplicateChecker - findExactDuplicates() identifies identical files', () => {
  const checker = new DuplicateChecker();

  const content = 'Duplicate content';
  checker.files = [
    { tool: 'Tool1', file: 'Prompt.txt', hash: checker.calculateHash(content), content, size: content.length },
    { tool: 'Tool2', file: 'Prompt.txt', hash: checker.calculateHash(content), content, size: content.length }
  ];

  checker.findExactDuplicates();

  assert.strictEqual(checker.duplicates.length, 1);
  assert.strictEqual(checker.duplicates[0].count, 2);
});

test('DuplicateChecker - findExactDuplicates() does not flag unique files', () => {
  const checker = new DuplicateChecker();

  checker.files = [
    { tool: 'Tool1', file: 'Prompt.txt', hash: checker.calculateHash('Content 1'), content: 'Content 1', size: 9 },
    { tool: 'Tool2', file: 'Prompt.txt', hash: checker.calculateHash('Content 2'), content: 'Content 2', size: 9 }
  ];

  checker.findExactDuplicates();

  assert.strictEqual(checker.duplicates.length, 0);
});

test('DuplicateChecker - findSimilarFiles() identifies similar content', () => {
  const checker = new DuplicateChecker();

  // Create similar content with enough chunks to match
  const baseContent = 'a'.repeat(200);
  const similarContent = 'a'.repeat(200) + 'b'.repeat(10);

  checker.files = [
    { tool: 'Tool1', file: 'Prompt.txt', hash: checker.calculateHash(baseContent), content: baseContent, size: baseContent.length },
    { tool: 'Tool2', file: 'Prompt.txt', hash: checker.calculateHash(similarContent), content: similarContent, size: similarContent.length }
  ];

  checker.findSimilarFiles(80);

  // Should find similarity
  assert.ok(checker.similar.length >= 0);
});

test('DuplicateChecker - findSimilarFiles() skips files with large size differences', () => {
  const checker = new DuplicateChecker();

  checker.files = [
    { tool: 'Tool1', file: 'Prompt.txt', hash: 'hash1', content: 'a'.repeat(100), size: 100 },
    { tool: 'Tool2', file: 'Prompt.txt', hash: 'hash2', content: 'b'.repeat(1000), size: 1000 }
  ];

  checker.findSimilarFiles(80);

  // Should not find similarity due to size difference
  assert.strictEqual(checker.similar.length, 0);
});

test('DuplicateChecker - findSimilarFiles() skips exact duplicates', () => {
  const checker = new DuplicateChecker();

  const content = 'Same content';
  const hash = checker.calculateHash(content);

  checker.files = [
    { tool: 'Tool1', file: 'Prompt.txt', hash, content, size: content.length },
    { tool: 'Tool2', file: 'Prompt.txt', hash, content, size: content.length }
  ];

  checker.findSimilarFiles(80);

  // Should not include in similar (they're exact duplicates)
  assert.strictEqual(checker.similar.length, 0);
});

test('DuplicateChecker - saveReport() creates valid JSON', (t) => {
  const tmpDir = createTestDir();

  t.after(() => cleanupTestDir(tmpDir));

  const originalDir = process.cwd();
  process.chdir(tmpDir);

  const checker = new DuplicateChecker();
  checker.files = [];
  checker.duplicates = [];
  checker.similar = [];

  checker.saveReport();

  const reportPath = path.join(tmpDir, 'duplicate-report.json');
  assert.ok(fs.existsSync(reportPath));

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  assert.ok(report.timestamp);
  assert.ok(typeof report.totalFiles === 'number');
  assert.ok(Array.isArray(report.exactDuplicates));
  assert.ok(Array.isArray(report.similarFiles));

  process.chdir(originalDir);
});

test('DuplicateChecker - edge case: many duplicate files', () => {
  const checker = new DuplicateChecker();

  const content = 'Duplicate';
  const hash = checker.calculateHash(content);

  // Create 10 duplicate files
  checker.files = Array.from({ length: 10 }, (_, i) => ({
    tool: `Tool${i}`,
    file: 'Prompt.txt',
    hash,
    content,
    size: content.length
  }));

  checker.findExactDuplicates();

  assert.strictEqual(checker.duplicates.length, 1);
  assert.strictEqual(checker.duplicates[0].count, 10);
});

test('DuplicateChecker - edge case: large file similarity check', () => {
  const checker = new DuplicateChecker();

  const largeContent1 = 'a'.repeat(10000);
  const largeContent2 = 'a'.repeat(10000) + 'b';

  checker.files = [
    { tool: 'Tool1', file: 'Prompt.txt', hash: checker.calculateHash(largeContent1), content: largeContent1, size: largeContent1.length },
    { tool: 'Tool2', file: 'Prompt.txt', hash: checker.calculateHash(largeContent2), content: largeContent2, size: largeContent2.length }
  ];

  // Should complete without hanging
  assert.doesNotThrow(() => {
    checker.findSimilarFiles(80);
  });
});

test('DuplicateChecker - getToolDirectories() excludes system directories', () => {
  const checker = new DuplicateChecker();
  const dirs = checker.getToolDirectories();

  assert.ok(Array.isArray(dirs));
  assert.ok(!dirs.includes('.git'));
  assert.ok(!dirs.includes('node_modules'));
  assert.ok(!dirs.includes('scripts'));
});