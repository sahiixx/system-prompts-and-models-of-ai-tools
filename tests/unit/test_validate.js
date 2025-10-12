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

// Additional comprehensive edge case tests for Validator

test('validate tool directory with missing README but has prompt', () => {
  const Validator = require('../../scripts/validate.js');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-validator-'));
  const toolDir = path.join(tempDir, 'Test-Tool');
  fs.mkdirSync(toolDir, { recursive: true });
  fs.writeFileSync(path.join(toolDir, 'Prompt.txt'), 'Test prompt');
  
  const validator = new Validator();
  validator.validateToolDirectory('Test-Tool');
  
  // Should have warning about missing README
  assert.ok(validator.warnings.length > 0);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('validate multiple tool directories in batch', () => {
  const Validator = require('../../scripts/validate.js');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-validator-'));
  
  // Create multiple valid tools
  for (let i = 1; i <= 5; i++) {
    const toolDir = path.join(tempDir, `Tool-${i}`);
    fs.mkdirSync(toolDir, { recursive: true });
    fs.writeFileSync(path.join(toolDir, 'README.md'), `# Tool ${i}`);
    fs.writeFileSync(path.join(toolDir, 'Prompt.txt'), `Prompt ${i}`);
  }
  
  const validator = new Validator();
  
  // Validate all tools
  for (let i = 1; i <= 5; i++) {
    validator.validateToolDirectory(`Tool-${i}`);
  }
  
  // Should have 5 successful validations
  assert.strictEqual(validator.passed, 5);
  assert.strictEqual(validator.errors.length, 0);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('validate tool with multiple prompt versions', () => {
  const Validator = require('../../scripts/validate.js');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-validator-'));
  const toolDir = path.join(tempDir, 'Versioned-Tool');
  fs.mkdirSync(toolDir, { recursive: true });
  fs.writeFileSync(path.join(toolDir, 'README.md'), '# Versioned Tool');
  fs.writeFileSync(path.join(toolDir, 'Prompt v1.0.txt'), 'Version 1');
  fs.writeFileSync(path.join(toolDir, 'Prompt v2.0.txt'), 'Version 2');
  fs.writeFileSync(path.join(toolDir, 'Agent Prompt.txt'), 'Agent version');
  
  const validator = new Validator();
  validator.validateToolDirectory('Versioned-Tool');
  
  // Should pass - has multiple prompts
  assert.strictEqual(validator.errors.length, 0);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('validate tool with special characters in name', () => {
  const Validator = require('../../scripts/validate.js');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-validator-'));
  const toolDir = path.join(tempDir, 'Tool-Name (Beta)');
  fs.mkdirSync(toolDir, { recursive: true });
  fs.writeFileSync(path.join(toolDir, 'README.md'), '# Tool');
  fs.writeFileSync(path.join(toolDir, 'Prompt.txt'), 'Test');
  
  const validator = new Validator();
  validator.validateToolDirectory('Tool-Name (Beta)');
  
  // Should handle special characters
  assert.strictEqual(validator.errors.length, 0);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('validate tool with tools.json file', () => {
  const Validator = require('../../scripts/validate.js');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-validator-'));
  const toolDir = path.join(tempDir, 'Tool-With-Tools');
  fs.mkdirSync(toolDir, { recursive: true });
  fs.writeFileSync(path.join(toolDir, 'README.md'), '# Tool');
  fs.writeFileSync(path.join(toolDir, 'Prompt.txt'), 'Test');
  fs.writeFileSync(path.join(toolDir, 'Tools.json'), '[]');
  
  const validator = new Validator();
  validator.validateToolDirectory('Tool-With-Tools');
  
  // Should pass with tools file
  assert.strictEqual(validator.errors.length, 0);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('error and warning counters work correctly', () => {
  const Validator = require('../../scripts/validate.js');
  const validator = new Validator();
  
  // Add various errors and warnings
  validator.error('Error 1');
  validator.error('Error 2');
  validator.warn('Warning 1');
  validator.warn('Warning 2');
  validator.warn('Warning 3');
  validator.success('Success 1');
  
  assert.strictEqual(validator.errors.length, 2);
  assert.strictEqual(validator.warnings.length, 3);
  assert.strictEqual(validator.passed, 1);
});

test('validate tool with markdown prompt file', () => {
  const Validator = require('../../scripts/validate.js');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-validator-'));
  const toolDir = path.join(tempDir, 'Markdown-Tool');
  fs.mkdirSync(toolDir, { recursive: true });
  fs.writeFileSync(path.join(toolDir, 'README.md'), '# Tool');
  fs.writeFileSync(path.join(toolDir, 'System Prompt.md'), '# System Prompt');
  
  const validator = new Validator();
  validator.validateToolDirectory('Markdown-Tool');
  
  // Should accept .md prompt files
  assert.strictEqual(validator.errors.length, 0);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('validate empty tool directory', () => {
  const Validator = require('../../scripts/validate.js');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-validator-'));
  const toolDir = path.join(tempDir, 'Empty-Tool');
  fs.mkdirSync(toolDir, { recursive: true });
  
  const validator = new Validator();
  validator.validateToolDirectory('Empty-Tool');
  
  // Should have errors for missing files
  assert.ok(validator.errors.length > 0 || validator.warnings.length > 0);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('case insensitive prompt file detection', () => {
  const Validator = require('../../scripts/validate.js');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-validator-'));
  
  // Test with uppercase PROMPT
  const toolDir1 = path.join(tempDir, 'Tool-Upper');
  fs.mkdirSync(toolDir1, { recursive: true });
  fs.writeFileSync(path.join(toolDir1, 'README.md'), '# Tool');
  fs.writeFileSync(path.join(toolDir1, 'PROMPT.TXT'), 'Test');
  
  const validator = new Validator();
  validator.validateToolDirectory('Tool-Upper');
  
  // Should detect uppercase PROMPT
  assert.strictEqual(validator.errors.length, 0);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});

test('validate tool with subdirectories', () => {
  const Validator = require('../../scripts/validate.js');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { mkdtempSync, rmSync } = require('fs');
  
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-validator-'));
  const toolDir = path.join(tempDir, 'Tool-With-Subdirs');
  fs.mkdirSync(toolDir, { recursive: true });
  fs.writeFileSync(path.join(toolDir, 'README.md'), '# Tool');
  fs.writeFileSync(path.join(toolDir, 'Prompt.txt'), 'Test');
  
  // Create subdirectory
  const subDir = path.join(toolDir, 'examples');
  fs.mkdirSync(subDir);
  fs.writeFileSync(path.join(subDir, 'example.txt'), 'Example');
  
  const validator = new Validator();
  validator.validateToolDirectory('Tool-With-Subdirs');
  
  // Should validate successfully
  assert.strictEqual(validator.errors.length, 0);
  
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
});