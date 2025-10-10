/**
 * Unit tests for validate.js
 * Tests repository structure validation
 */
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { mkdtempSync, rmSync } = require('fs');
const os = require('os');

// Import the Validator class
const Validator = require('../../scripts/validate.js');

describe('Validator', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-validator-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('Validator initialization', () => {
    const validator = new Validator();
    
    assert.ok(validator);
    assert.ok(Array.isArray(validator.errors));
    assert.ok(Array.isArray(validator.warnings));
    assert.strictEqual(validator.passed, 0);
  });

  test('error method adds to errors array', () => {
    const validator = new Validator();
    
    validator.error('Test error message');
    
    assert.strictEqual(validator.errors.length, 1);
    assert.strictEqual(validator.errors[0], 'Test error message');
  });

  test('warn method adds to warnings array', () => {
    const validator = new Validator();
    
    validator.warn('Test warning message');
    
    assert.strictEqual(validator.warnings.length, 1);
    assert.strictEqual(validator.warnings[0], 'Test warning message');
  });

  test('success method increments passed counter', () => {
    const validator = new Validator();
    
    validator.success('Test passed');
    
    assert.strictEqual(validator.passed, 1);
  });

  test('multiple successes increment correctly', () => {
    const validator = new Validator();
    
    validator.success('Test 1');
    validator.success('Test 2');
    validator.success('Test 3');
    
    assert.strictEqual(validator.passed, 3);
  });

  test('hasPromptFile detects prompt files', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(path.join(toolDir, 'prompt.txt'), 'Prompt content');
    fs.writeFileSync(path.join(toolDir, 'other.txt'), 'Other content');
    
    const result = validator.hasPromptFile(toolDir);
    
    assert.strictEqual(result, true);
  });

  test('hasPromptFile returns false when no prompt files', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(path.join(toolDir, 'readme.txt'), 'Not a prompt');
    
    const result = validator.hasPromptFile(toolDir);
    
    assert.strictEqual(result, false);
  });

  test('hasPromptFile detects markdown prompt files', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(path.join(toolDir, 'system-prompt.md'), 'Prompt');
    
    const result = validator.hasPromptFile(toolDir);
    
    assert.strictEqual(result, true);
  });

  test('validatePromptFile validates non-empty file', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(
      path.join(toolDir, 'prompt.txt'),
      'This is a valid prompt with sufficient content to pass validation checks.'
    );
    
    const result = validator.validatePromptFile('TestTool', 'prompt.txt');
    
    assert.strictEqual(result, true);
  });

  test('validatePromptFile detects empty file', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(path.join(toolDir, 'prompt.txt'), '');
    
    const result = validator.validatePromptFile('TestTool', 'prompt.txt');
    
    assert.strictEqual(result, false);
    assert.ok(validator.errors.some(e => e.includes('empty')));
  });

  test('validatePromptFile detects whitespace-only file', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(path.join(toolDir, 'prompt.txt'), '   \n\n   ');
    
    const result = validator.validatePromptFile('TestTool', 'prompt.txt');
    
    assert.strictEqual(result, false);
  });

  test('validatePromptFile warns about suspiciously small files', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(path.join(toolDir, 'prompt.txt'), 'Short');
    
    validator.validatePromptFile('TestTool', 'prompt.txt');
    
    assert.ok(validator.warnings.some(w => w.includes('Suspiciously small')));
  });

  test('validateJsonFile validates valid JSON', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(
      path.join(toolDir, 'tools.json'),
      JSON.stringify({ tools: ['tool1', 'tool2'] })
    );
    
    const result = validator.validateJsonFile('TestTool', 'tools.json');
    
    assert.strictEqual(result, true);
    assert.strictEqual(validator.passed, 1);
  });

  test('validateJsonFile detects invalid JSON', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(path.join(toolDir, 'tools.json'), '{ invalid json }');
    
    const result = validator.validateJsonFile('TestTool', 'tools.json');
    
    assert.strictEqual(result, false);
    assert.ok(validator.errors.some(e => e.includes('Invalid JSON')));
  });

  test('validateJsonFile handles empty JSON objects', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(path.join(toolDir, 'tools.json'), '{}');
    
    const result = validator.validateJsonFile('TestTool', 'tools.json');
    
    assert.strictEqual(result, true);
  });

  test('validateJsonFile handles JSON arrays', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(path.join(toolDir, 'tools.json'), '[]');
    
    const result = validator.validateJsonFile('TestTool', 'tools.json');
    
    assert.strictEqual(result, true);
  });
});

describe('Validator README checks', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-validator-readme-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('validateToolReadme detects missing sections', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(path.join(toolDir, 'README.md'), '# TestTool\n\nBasic readme');
    
    validator.validateToolReadme('TestTool');
    
    // Should warn about missing sections
    assert.ok(validator.warnings.some(w => w.includes('Missing sections')));
  });

  test('validateToolReadme passes with all sections', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(
      path.join(toolDir, 'README.md'),
      '# TestTool\n\n## Overview\n\nDescription\n\n## Files\n\nList of files'
    );
    
    const result = validator.validateToolReadme('TestTool');
    
    assert.strictEqual(result, true);
  });

  test('validateToolReadme handles case-insensitive section names', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(
      path.join(toolDir, 'README.md'),
      '# TestTool\n\n## OVERVIEW\n\nDesc\n\n## files\n\nList'
    );
    
    validator.validateToolReadme('TestTool');
    
    // Should not warn if sections present (case-insensitive)
    const missingSectionWarnings = validator.warnings.filter(w => 
      w.includes('Missing sections')
    );
    assert.strictEqual(missingSectionWarnings.length, 0);
  });
});

describe('Validator edge cases', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-validator-edge-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('handles Unicode content in prompt files', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(
      path.join(toolDir, 'prompt.txt'),
      '你好世界 🚀 This is a prompt with Unicode characters and emojis 🎉'
    );
    
    const result = validator.validatePromptFile('TestTool', 'prompt.txt');
    
    assert.strictEqual(result, true);
  });

  test('handles very long file content', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    const longContent = 'x'.repeat(100000);
    fs.writeFileSync(path.join(toolDir, 'prompt.txt'), longContent);
    
    const result = validator.validatePromptFile('TestTool', 'prompt.txt');
    
    assert.strictEqual(result, true);
  });

  test('handles files with only newlines', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    fs.writeFileSync(path.join(toolDir, 'prompt.txt'), '\n\n\n\n');
    
    const result = validator.validatePromptFile('TestTool', 'prompt.txt');
    
    assert.strictEqual(result, false); // Should fail as empty
  });

  test('handles deeply nested JSON', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    const deepJson = JSON.stringify({
      level1: {
        level2: {
          level3: {
            level4: {
              data: 'value'
            }
          }
        }
      }
    });
    fs.writeFileSync(path.join(toolDir, 'tools.json'), deepJson);
    
    const result = validator.validateJsonFile('TestTool', 'tools.json');
    
    assert.strictEqual(result, true);
  });

  test('handles JSON with special characters', () => {
    const validator = new Validator();
    
    const toolDir = path.join(tempDir, 'TestTool');
    fs.mkdirSync(toolDir);
    const jsonWithSpecialChars = JSON.stringify({
      name: 'Tool\n\twith\r\nspecial\bchars',
      emoji: '🚀🎉',
      unicode: '你好'
    });
    fs.writeFileSync(path.join(toolDir, 'tools.json'), jsonWithSpecialChars);
    
    const result = validator.validateJsonFile('TestTool', 'tools.json');
    
    assert.strictEqual(result, true);
  });
});