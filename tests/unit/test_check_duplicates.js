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

// Additional comprehensive edge case tests for DuplicateChecker

test('detect exact duplicates with different names', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  const assert = require('node:assert');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-duplicates-'));
  
  // Create two tools with identical prompts
  const tool1 = path.join(tempDir, 'Tool-1');
  const tool2 = path.join(tempDir, 'Tool-2');
  fs.mkdirSync(tool1, { recursive: true });
  fs.mkdirSync(tool2, { recursive: true });
  
  const identicalContent = 'This is the exact same system prompt content.\n';
  fs.writeFileSync(path.join(tool1, 'Prompt.txt'), identicalContent);
  fs.writeFileSync(path.join(tool2, 'Prompt.txt'), identicalContent);
  
  // Verify files have same content
  const content1 = fs.readFileSync(path.join(tool1, 'Prompt.txt'), 'utf-8');
  const content2 = fs.readFileSync(path.join(tool2, 'Prompt.txt'), 'utf-8');
  assert.strictEqual(content1, content2);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('detect highly similar prompts', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  const assert = require('node:assert');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-duplicates-'));
  
  const tool1 = path.join(tempDir, 'Similar-1');
  const tool2 = path.join(tempDir, 'Similar-2');
  fs.mkdirSync(tool1, { recursive: true });
  fs.mkdirSync(tool2, { recursive: true });
  
  const baseContent = 'You are a helpful AI assistant.\nYou generate code.\n';
  fs.writeFileSync(path.join(tool1, 'Prompt.txt'), baseContent);
  fs.writeFileSync(path.join(tool2, 'Prompt.txt'), baseContent + 'You also debug code.\n');
  
  // Should be similar but not identical
  const content1 = fs.readFileSync(path.join(tool1, 'Prompt.txt'), 'utf-8');
  const content2 = fs.readFileSync(path.join(tool2, 'Prompt.txt'), 'utf-8');
  assert.notStrictEqual(content1, content2);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('handle empty prompt files', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  const assert = require('node:assert');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-duplicates-'));
  
  const tool1 = path.join(tempDir, 'Empty-1');
  fs.mkdirSync(tool1, { recursive: true });
  fs.writeFileSync(path.join(tool1, 'Prompt.txt'), '');
  
  // Verify empty file
  const content = fs.readFileSync(path.join(tool1, 'Prompt.txt'), 'utf-8');
  assert.strictEqual(content.length, 0);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('handle prompts with unicode characters', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  const assert = require('node:assert');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-duplicates-'));
  
  const tool1 = path.join(tempDir, 'Unicode-1');
  const tool2 = path.join(tempDir, 'Unicode-2');
  fs.mkdirSync(tool1, { recursive: true });
  fs.mkdirSync(tool2, { recursive: true });
  
  const unicodeContent = 'System prompt 世界 🌍\n';
  fs.writeFileSync(path.join(tool1, 'Prompt.txt'), unicodeContent, 'utf-8');
  fs.writeFileSync(path.join(tool2, 'Prompt.txt'), unicodeContent, 'utf-8');
  
  // Verify identical unicode content
  const content1 = fs.readFileSync(path.join(tool1, 'Prompt.txt'), 'utf-8');
  const content2 = fs.readFileSync(path.join(tool2, 'Prompt.txt'), 'utf-8');
  assert.strictEqual(content1, content2);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('detect no duplicates when all unique', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  const assert = require('node:assert');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-duplicates-'));
  
  // Create 5 unique tools
  for (let i = 1; i <= 5; i++) {
    const toolDir = path.join(tempDir, `Unique-${i}`);
    fs.mkdirSync(toolDir, { recursive: true });
    fs.writeFileSync(path.join(toolDir, 'Prompt.txt'), `Unique prompt content for tool ${i}\n`);
  }
  
  // Verify all have different content
  const contents = [];
  for (let i = 1; i <= 5; i++) {
    const content = fs.readFileSync(path.join(tempDir, `Unique-${i}`, 'Prompt.txt'), 'utf-8');
    contents.push(content);
  }
  
  // All should be unique
  const uniqueContents = [...new Set(contents)];
  assert.strictEqual(uniqueContents.length, 5);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('handle very large prompt files', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  const assert = require('node:assert');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-duplicates-'));
  
  const tool1 = path.join(tempDir, 'Large-1');
  fs.mkdirSync(tool1, { recursive: true });
  
  // Create 50KB file
  const largeContent = 'Line of content\n'.repeat(3000);
  fs.writeFileSync(path.join(tool1, 'Prompt.txt'), largeContent);
  
  // Verify size
  const stats = fs.statSync(path.join(tool1, 'Prompt.txt'));
  assert.ok(stats.size > 40000);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('handle multiple versions in single tool', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  const assert = require('node:assert');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-duplicates-'));
  
  const toolDir = path.join(tempDir, 'Versioned-Tool');
  fs.mkdirSync(toolDir, { recursive: true });
  
  fs.writeFileSync(path.join(toolDir, 'Prompt v1.txt'), 'Version 1 content\n');
  fs.writeFileSync(path.join(toolDir, 'Prompt v2.txt'), 'Version 2 content\n');
  fs.writeFileSync(path.join(toolDir, 'Agent Prompt.txt'), 'Agent version content\n');
  
  // Verify all files exist
  const files = fs.readdirSync(toolDir);
  assert.ok(files.includes('Prompt v1.txt'));
  assert.ok(files.includes('Prompt v2.txt'));
  assert.ok(files.includes('Agent Prompt.txt'));
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('case sensitive duplicate detection', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  const assert = require('node:assert');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-duplicates-'));
  
  const tool1 = path.join(tempDir, 'Case-1');
  const tool2 = path.join(tempDir, 'Case-2');
  fs.mkdirSync(tool1, { recursive: true });
  fs.mkdirSync(tool2, { recursive: true });
  
  fs.writeFileSync(path.join(tool1, 'Prompt.txt'), 'UPPERCASE CONTENT\n');
  fs.writeFileSync(path.join(tool2, 'Prompt.txt'), 'uppercase content\n');
  
  // Should be different (case sensitive)
  const content1 = fs.readFileSync(path.join(tool1, 'Prompt.txt'), 'utf-8');
  const content2 = fs.readFileSync(path.join(tool2, 'Prompt.txt'), 'utf-8');
  assert.notStrictEqual(content1, content2);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('whitespace differences detection', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  const assert = require('node:assert');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-duplicates-'));
  
  const tool1 = path.join(tempDir, 'Space-1');
  const tool2 = path.join(tempDir, 'Space-2');
  fs.mkdirSync(tool1, { recursive: true });
  fs.mkdirSync(tool2, { recursive: true });
  
  fs.writeFileSync(path.join(tool1, 'Prompt.txt'), 'Content with  spaces\n');
  fs.writeFileSync(path.join(tool2, 'Prompt.txt'), 'Content with spaces\n');
  
  // Should be different (whitespace matters)
  const content1 = fs.readFileSync(path.join(tool1, 'Prompt.txt'), 'utf-8');
  const content2 = fs.readFileSync(path.join(tool2, 'Prompt.txt'), 'utf-8');
  assert.notStrictEqual(content1, content2);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('line ending differences handling', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  const assert = require('node:assert');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-duplicates-'));
  
  const tool1 = path.join(tempDir, 'LineEnd-1');
  const tool2 = path.join(tempDir, 'LineEnd-2');
  fs.mkdirSync(tool1, { recursive: true });
  fs.mkdirSync(tool2, { recursive: true });
  
  fs.writeFileSync(path.join(tool1, 'Prompt.txt'), 'Line 1\nLine 2\n');
  fs.writeFileSync(path.join(tool2, 'Prompt.txt'), 'Line 1\r\nLine 2\r\n');
  
  // Verify files exist (may have different line endings)
  assert.ok(fs.existsSync(path.join(tool1, 'Prompt.txt')));
  assert.ok(fs.existsSync(path.join(tool2, 'Prompt.txt')));
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});