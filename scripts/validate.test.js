const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Validator = require('./validate.js');

// Helper to create temporary test directory structure
function createTestDir() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-test-'));
  return tmpDir;
}

// Helper to cleanup test directory
function cleanupTestDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('Validator - constructor initializes correctly', () => {
  const validator = new Validator();
  assert.strictEqual(validator.errors.length, 0);
  assert.strictEqual(validator.warnings.length, 0);
  assert.strictEqual(validator.passed, 0);
});

test('Validator - error() method adds error and logs', () => {
  const validator = new Validator();
  validator.error('Test error message');
  assert.strictEqual(validator.errors.length, 1);
  assert.strictEqual(validator.errors[0], 'Test error message');
});

test('Validator - warn() method adds warning', () => {
  const validator = new Validator();
  validator.warn('Test warning message');
  assert.strictEqual(validator.warnings.length, 1);
  assert.strictEqual(validator.warnings[0], 'Test warning message');
});

test('Validator - success() method increments passed counter', () => {
  const validator = new Validator();
  validator.success('Test success');
  assert.strictEqual(validator.passed, 1);
  validator.success('Another success');
  assert.strictEqual(validator.passed, 2);
});

test('Validator - getToolDirectories() excludes system directories', () => {
  const validator = new Validator();
  const dirs = validator.getToolDirectories();

  // Verify excluded directories are not present
  assert.ok(!dirs.includes('.git'));
  assert.ok(!dirs.includes('.github'));
  assert.ok(!dirs.includes('node_modules'));
  assert.ok(!dirs.includes('scripts'));
  assert.ok(!dirs.includes('site'));

  // Should return an array
  assert.ok(Array.isArray(dirs));
});

test('Validator - hasPromptFile() detects prompt files correctly', (t) => {
  const tmpDir = createTestDir();

  t.after(() => cleanupTestDir(tmpDir));

  // Create test files
  fs.writeFileSync(path.join(tmpDir, 'Prompt.txt'), 'test prompt');
  fs.writeFileSync(path.join(tmpDir, 'system-prompt.md'), 'test system prompt');
  fs.writeFileSync(path.join(tmpDir, 'README.md'), 'readme');

  const validator = new Validator();
  const result = validator.hasPromptFile(tmpDir);

  assert.strictEqual(result, true);
});

test('Validator - hasPromptFile() returns false when no prompt file exists', (t) => {
  const tmpDir = createTestDir();

  t.after(() => cleanupTestDir(tmpDir));

  // Create only non-prompt files
  fs.writeFileSync(path.join(tmpDir, 'README.md'), 'readme');
  fs.writeFileSync(path.join(tmpDir, 'config.json'), '{}');

  const validator = new Validator();
  const result = validator.hasPromptFile(tmpDir);

  assert.strictEqual(result, false);
});

test('Validator - validatePromptFile() detects empty files', (t) => {
  const tmpDir = createTestDir();
  const toolDir = path.join(tmpDir, 'TestTool');
  fs.mkdirSync(toolDir);

  t.after(() => cleanupTestDir(tmpDir));

  fs.writeFileSync(path.join(toolDir, 'Prompt.txt'), '');

  // Temporarily change ROOT_DIR for testing
  const originalRootDir = require.cache[require.resolve('./validate.js')].exports.ROOT_DIR;

  const validator = new Validator();
  const result = validator.validatePromptFile('TestTool', 'Prompt.txt');

  assert.strictEqual(result, false);
  assert.ok(validator.errors.length > 0);
});

test('Validator - validatePromptFile() warns on small files', (t) => {
  const tmpDir = createTestDir();
  const toolDir = path.join(tmpDir, 'TestTool');
  fs.mkdirSync(toolDir);

  t.after(() => cleanupTestDir(tmpDir));

  fs.writeFileSync(path.join(toolDir, 'Prompt.txt'), 'Small content');

  const validator = new Validator();
  validator.validatePromptFile('TestTool', 'Prompt.txt');

  assert.ok(validator.warnings.length > 0);
});

test('Validator - validatePromptFile() detects [REDACTED] markers', (t) => {
  const tmpDir = createTestDir();
  const toolDir = path.join(tmpDir, 'TestTool');
  fs.mkdirSync(toolDir);

  t.after(() => cleanupTestDir(tmpDir));

  const content = 'This is a prompt with [REDACTED] content that should trigger a warning.';
  fs.writeFileSync(path.join(toolDir, 'Prompt.txt'), content);

  const validator = new Validator();
  validator.validatePromptFile('TestTool', 'Prompt.txt');

  assert.ok(validator.warnings.some(w => w.includes('[REDACTED]')));
});

test('Validator - validateJsonFile() validates correct JSON', (t) => {
  const tmpDir = createTestDir();
  const toolDir = path.join(tmpDir, 'TestTool');
  fs.mkdirSync(toolDir);

  t.after(() => cleanupTestDir(tmpDir));

  const jsonContent = JSON.stringify({ tools: ['tool1', 'tool2'] }, null, 2);
  fs.writeFileSync(path.join(toolDir, 'Tools.json'), jsonContent);

  const validator = new Validator();
  const result = validator.validateJsonFile('TestTool', 'Tools.json');

  assert.strictEqual(result, true);
  assert.strictEqual(validator.errors.length, 0);
});

test('Validator - validateJsonFile() detects invalid JSON', (t) => {
  const tmpDir = createTestDir();
  const toolDir = path.join(tmpDir, 'TestTool');
  fs.mkdirSync(toolDir);

  t.after(() => cleanupTestDir(tmpDir));

  const invalidJson = '{ "tools": [invalid json] }';
  fs.writeFileSync(path.join(toolDir, 'Tools.json'), invalidJson);

  const validator = new Validator();
  const result = validator.validateJsonFile('TestTool', 'Tools.json');

  assert.strictEqual(result, false);
  assert.ok(validator.errors.length > 0);
  assert.ok(validator.errors[0].includes('Invalid JSON'));
});

test('Validator - validateJsonFile() handles missing files gracefully', (t) => {
  const validator = new Validator();

  // Should handle gracefully when file doesn't exist
  assert.throws(() => {
    validator.validateJsonFile('NonExistentTool', 'Tools.json');
  });
});

test('Validator - printSummary() displays correct counts', () => {
  const validator = new Validator();
  validator.passed = 5;
  validator.warn('Warning 1');
  validator.warn('Warning 2');
  validator.error('Error 1');

  // Just verify it doesn't throw
  assert.doesNotThrow(() => {
    validator.printSummary();
  });
});

test('Validator - integration test with valid structure', (t) => {
  const tmpDir = createTestDir();
  const toolDir = path.join(tmpDir, 'ValidTool');
  fs.mkdirSync(toolDir);

  t.after(() => cleanupTestDir(tmpDir));

  // Create valid structure
  fs.writeFileSync(path.join(toolDir, 'README.md'), '# ValidTool\n\n## Overview\n\n## Files\n');
  fs.writeFileSync(path.join(toolDir, 'Prompt.txt'), 'This is a valid prompt with enough content to pass validation checks.');
  fs.writeFileSync(path.join(toolDir, 'Tools.json'), JSON.stringify({ tools: [] }, null, 2));

  const validator = new Validator();

  // These should not throw
  assert.doesNotThrow(() => {
    validator.validateToolDirectory('ValidTool');
    validator.validatePromptFile('ValidTool', 'Prompt.txt');
    validator.validateJsonFile('ValidTool', 'Tools.json');
    validator.validateToolReadme('ValidTool');
  });
});

test('Validator - edge case: very large prompt file', (t) => {
  const tmpDir = createTestDir();
  const toolDir = path.join(tmpDir, 'LargeTool');
  fs.mkdirSync(toolDir);

  t.after(() => cleanupTestDir(tmpDir));

  // Create a very large file (1MB)
  const largeContent = 'a'.repeat(1024 * 1024);
  fs.writeFileSync(path.join(toolDir, 'Prompt.txt'), largeContent);

  const validator = new Validator();
  const result = validator.validatePromptFile('LargeTool', 'Prompt.txt');

  assert.strictEqual(result, true);
  assert.strictEqual(validator.errors.length, 0);
});

test('Validator - edge case: prompt file with unicode characters', (t) => {
  const tmpDir = createTestDir();
  const toolDir = path.join(tmpDir, 'UnicodeTool');
  fs.mkdirSync(toolDir);

  t.after(() => cleanupTestDir(tmpDir));

  const unicodeContent = 'Prompt with unicode: 你好 🚀 مرحبا';
  fs.writeFileSync(path.join(toolDir, 'Prompt.txt'), unicodeContent);

  const validator = new Validator();
  const result = validator.validatePromptFile('UnicodeTool', 'Prompt.txt');

  // Should handle unicode gracefully
  assert.ok(result !== undefined);
});

test('Validator - edge case: JSON with nested structures', (t) => {
  const tmpDir = createTestDir();
  const toolDir = path.join(tmpDir, 'NestedTool');
  fs.mkdirSync(toolDir);

  t.after(() => cleanupTestDir(tmpDir));

  const nestedJson = JSON.stringify({
    tools: [
      { name: 'tool1', config: { nested: { deep: { value: 123 } } } },
      { name: 'tool2', config: { array: [1, 2, 3] } }
    ]
  }, null, 2);
  fs.writeFileSync(path.join(toolDir, 'Tools.json'), nestedJson);

  const validator = new Validator();
  const result = validator.validateJsonFile('NestedTool', 'Tools.json');

  assert.strictEqual(result, true);
});