#!/usr/bin/env node
/**
 * Unit Tests for scripts/validate.js
 * Tests the repository structure validator
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import the Validator class
const Validator = require('../scripts/validate.js');

// Test utilities
class TestHelper {
  constructor() {
    this.tempDirs = [];
  }

  createTempDir() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-test-'));
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

  createToolDir(baseDir, toolName, files = {}) {
    const toolDir = path.join(baseDir, toolName);
    fs.mkdirSync(toolDir, { recursive: true });
    
    Object.entries(files).forEach(([filename, content]) => {
      fs.writeFileSync(path.join(toolDir, filename), content);
    });
    
    return toolDir;
  }
}

// Test Suite
class ValidatorTests {
  constructor() {
    this.helper = new TestHelper();
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

  // Test: Validator initialization
  testValidatorInitialization() {
    this.log('\nTest: Validator Initialization');
    
    const validator = new Validator();
    this.assert(validator !== null, 'Validator should be instantiated');
    this.assert(Array.isArray(validator.errors), 'Errors should be an array');
    this.assert(Array.isArray(validator.warnings), 'Warnings should be an array');
    this.assertEqual(validator.passed, 0, 'Passed count should start at 0');
    this.assertEqual(validator.errors.length, 0, 'Errors array should start empty');
  }

  // Test: Error logging
  testErrorLogging() {
    this.log('\nTest: Error Logging');
    
    const validator = new Validator();
    validator.error('Test error');
    
    this.assertEqual(validator.errors.length, 1, 'Should have one error');
    this.assertEqual(validator.errors[0], 'Test error', 'Error message should match');
  }

  // Test: Warning logging
  testWarningLogging() {
    this.log('\nTest: Warning Logging');
    
    const validator = new Validator();
    validator.warn('Test warning');
    
    this.assertEqual(validator.warnings.length, 1, 'Should have one warning');
    this.assertEqual(validator.warnings[0], 'Test warning', 'Warning message should match');
  }

  // Test: Success logging
  testSuccessLogging() {
    this.log('\nTest: Success Logging');
    
    const validator = new Validator();
    const initialPassed = validator.passed;
    validator.success('Test success');
    
    this.assertEqual(validator.passed, initialPassed + 1, 'Passed count should increment');
  }

  // Test: Prompt file detection
  testPromptFileDetection() {
    this.log('\nTest: Prompt File Detection');
    
    const tempDir = this.helper.createTempDir();
    const toolDir = this.helper.createToolDir(tempDir, 'TestTool', {
      'Prompt.txt': 'Test prompt content',
      'README.md': '# Test Tool'
    });
    
    const validator = new Validator();
    const hasPrompt = validator.hasPromptFile(toolDir);
    
    this.assert(hasPrompt, 'Should detect prompt file');
  }

  // Test: Prompt file detection with variations
  testPromptFileDetectionVariations() {
    this.log('\nTest: Prompt File Detection (Variations)');
    
    const tempDir = this.helper.createTempDir();
    
    // Test with different prompt file names
    const variations = [
      'Agent Prompt.txt',
      'system-prompt.md',
      'PROMPT.txt',
      'System Prompt v1.0.txt'
    ];
    
    variations.forEach(filename => {
      const toolDir = this.helper.createToolDir(tempDir, `Tool-${filename}`, {
        [filename]: 'Test content',
        'README.md': '# Test'
      });
      
      const validator = new Validator();
      const hasPrompt = validator.hasPromptFile(toolDir);
      this.assert(hasPrompt, `Should detect prompt file: ${filename}`);
    });
  }

  // Test: Empty prompt file validation
  testEmptyPromptFile() {
    this.log('\nTest: Empty Prompt File Validation');
    
    const tempDir = this.helper.createTempDir();
    const toolDir = this.helper.createToolDir(tempDir, 'EmptyPromptTool', {
      'Prompt.txt': '',
      'README.md': '# Test'
    });
    
    const validator = new Validator();
    const isValid = validator.validatePromptFile('EmptyPromptTool', 'Prompt.txt');
    
    this.assert(!isValid, 'Empty prompt file should be invalid');
    this.assert(validator.errors.length > 0, 'Should have errors for empty file');
  }

  // Test: Small prompt file warning
  testSmallPromptFileWarning() {
    this.log('\nTest: Small Prompt File Warning');
    
    const tempDir = this.helper.createTempDir();
    const toolDir = this.helper.createToolDir(tempDir, 'SmallPromptTool', {
      'Prompt.txt': 'Very short content',
      'README.md': '# Test'
    });
    
    const validator = new Validator();
    validator.validatePromptFile('SmallPromptTool', 'Prompt.txt');
    
    this.assert(validator.warnings.length > 0, 'Should have warning for small file');
  }

  // Test: Large prompt file validation
  testLargePromptFile() {
    this.log('\nTest: Large Prompt File Validation');
    
    const tempDir = this.helper.createTempDir();
    const largeContent = 'A'.repeat(1000) + '\n' + 'B'.repeat(1000);
    const toolDir = this.helper.createToolDir(tempDir, 'LargePromptTool', {
      'Prompt.txt': largeContent,
      'README.md': '# Test'
    });
    
    const validator = new Validator();
    const isValid = validator.validatePromptFile('LargePromptTool', 'Prompt.txt');
    
    this.assert(isValid, 'Large prompt file should be valid');
  }

  // Test: JSON validation - valid JSON
  testValidJsonFile() {
    this.log('\nTest: Valid JSON File Validation');
    
    const tempDir = this.helper.createTempDir();
    const validJson = JSON.stringify({ tools: ['tool1', 'tool2'] }, null, 2);
    const toolDir = this.helper.createToolDir(tempDir, 'JsonTool', {
      'Tools.json': validJson,
      'README.md': '# Test'
    });
    
    const validator = new Validator();
    const isValid = validator.validateJsonFile('JsonTool', 'Tools.json');
    
    this.assert(isValid, 'Valid JSON should pass validation');
    this.assertEqual(validator.errors.length, 0, 'Should have no errors for valid JSON');
  }

  // Test: JSON validation - invalid JSON
  testInvalidJsonFile() {
    this.log('\nTest: Invalid JSON File Validation');
    
    const tempDir = this.helper.createTempDir();
    const invalidJson = '{ "tools": [invalid json}';
    const toolDir = this.helper.createToolDir(tempDir, 'InvalidJsonTool', {
      'Tools.json': invalidJson,
      'README.md': '# Test'
    });
    
    const validator = new Validator();
    const isValid = validator.validateJsonFile('InvalidJsonTool', 'Tools.json');
    
    this.assert(!isValid, 'Invalid JSON should fail validation');
    this.assert(validator.errors.length > 0, 'Should have errors for invalid JSON');
  }

  // Test: README validation - with required sections
  testReadmeWithRequiredSections() {
    this.log('\nTest: README with Required Sections');
    
    const tempDir = this.helper.createTempDir();
    const readme = `# Test Tool

## Overview

This is a test.

## Files

- Prompt.txt`;
    const toolDir = this.helper.createToolDir(tempDir, 'GoodReadmeTool', {
      'README.md': readme,
      'Prompt.txt': 'Test prompt'
    });
    
    const validator = new Validator();
    const isValid = validator.validateToolReadme('GoodReadmeTool');
    
    this.assert(isValid, 'README with required sections should be valid');
  }

  // Test: README validation - missing sections
  testReadmeMissingSections() {
    this.log('\nTest: README Missing Sections');
    
    const tempDir = this.helper.createTempDir();
    const readme = `# Test Tool

Just a title.`;
    const toolDir = this.helper.createToolDir(tempDir, 'BadReadmeTool', {
      'README.md': readme,
      'Prompt.txt': 'Test prompt'
    });
    
    const validator = new Validator();
    validator.validateToolReadme('BadReadmeTool');
    
    this.assert(validator.warnings.length > 0, 'Should warn about missing sections');
  }

  // Test: Redacted content detection
  testRedactedContentDetection() {
    this.log('\nTest: Redacted Content Detection');
    
    const tempDir = this.helper.createTempDir();
    const content = 'This contains [REDACTED] content without mentioning redaction process';
    const toolDir = this.helper.createToolDir(tempDir, 'RedactedTool', {
      'Prompt.txt': content,
      'README.md': '# Test'
    });
    
    const validator = new Validator();
    validator.validatePromptFile('RedactedTool', 'Prompt.txt');
    
    this.assert(validator.warnings.length > 0, 'Should warn about redacted content');
  }

  // Test: Special characters in file content
  testSpecialCharactersInContent() {
    this.log('\nTest: Special Characters in Content');
    
    const tempDir = this.helper.createTempDir();
    const content = 'Unicode test: 你好世界 🌍 emoji test\n' + 'Special chars: <>&"\'\n' + 'A'.repeat(600);
    const toolDir = this.helper.createToolDir(tempDir, 'UnicodeTool', {
      'Prompt.txt': content,
      'README.md': '# Test'
    });
    
    const validator = new Validator();
    const isValid = validator.validatePromptFile('UnicodeTool', 'Prompt.txt');
    
    this.assert(isValid, 'Should handle special characters');
  }

  // Test: Multiple prompt files
  testMultiplePromptFiles() {
    this.log('\nTest: Multiple Prompt Files');
    
    const tempDir = this.helper.createTempDir();
    const toolDir = this.helper.createToolDir(tempDir, 'MultiPromptTool', {
      'Prompt v1.txt': 'Version 1 content with more than 500 characters. ' + 'A'.repeat(500),
      'Prompt v2.txt': 'Version 2 content with more than 500 characters. ' + 'B'.repeat(500),
      'README.md': '# Test'
    });
    
    const validator = new Validator();
    const hasPrompt = validator.hasPromptFile(toolDir);
    
    this.assert(hasPrompt, 'Should detect multiple prompt files');
  }

  // Test: Case-insensitive prompt detection
  testCaseInsensitivePromptDetection() {
    this.log('\nTest: Case-Insensitive Prompt Detection');
    
    const tempDir = this.helper.createTempDir();
    const variations = [
      'PROMPT.TXT',
      'prompt.txt',
      'PrOmPt.TxT',
      'System-PROMPT.md'
    ];
    
    variations.forEach(filename => {
      const toolDir = this.helper.createToolDir(tempDir, `Tool-${filename}`, {
        [filename]: 'Test content with enough characters to avoid warnings. ' + 'A'.repeat(500),
        'README.md': '# Test'
      });
      
      const validator = new Validator();
      const hasPrompt = validator.hasPromptFile(toolDir);
      this.assert(hasPrompt, `Should detect case variation: ${filename}`);
    });
  }

  // Test: Tool directory without README
  testToolDirectoryWithoutReadme() {
    this.log('\nTest: Tool Directory Without README');
    
    const tempDir = this.helper.createTempDir();
    const toolDir = this.helper.createToolDir(tempDir, 'NoReadmeTool', {
      'Prompt.txt': 'Test prompt with sufficient content. ' + 'A'.repeat(500)
    });
    
    const validator = new Validator();
    validator.validateToolDirectory('NoReadmeTool');
    
    this.assert(validator.warnings.length > 0, 'Should warn about missing README');
  }

  // Test: Tool directory without prompt
  testToolDirectoryWithoutPrompt() {
    this.log('\nTest: Tool Directory Without Prompt');
    
    const tempDir = this.helper.createTempDir();
    const toolDir = this.helper.createToolDir(tempDir, 'NoPromptTool', {
      'README.md': '# Test Tool'
    });
    
    const validator = new Validator();
    validator.validateToolDirectory('NoPromptTool');
    
    this.assert(validator.errors.length > 0, 'Should error on missing prompt');
  }

  // Test: Edge case - empty directory
  testEmptyDirectory() {
    this.log('\nTest: Empty Directory');
    
    const tempDir = this.helper.createTempDir();
    fs.mkdirSync(path.join(tempDir, 'EmptyTool'));
    
    const validator = new Validator();
    const hasPrompt = validator.hasPromptFile(path.join(tempDir, 'EmptyTool'));
    
    this.assert(!hasPrompt, 'Empty directory should not have prompt file');
  }

  // Test: JSON array format
  testJsonArrayFormat() {
    this.log('\nTest: JSON Array Format');
    
    const tempDir = this.helper.createTempDir();
    const jsonArray = JSON.stringify([
      { name: 'tool1', type: 'function' },
      { name: 'tool2', type: 'function' }
    ], null, 2);
    const toolDir = this.helper.createToolDir(tempDir, 'ArrayJsonTool', {
      'Tools.json': jsonArray,
      'Prompt.txt': 'Test prompt. ' + 'A'.repeat(500),
      'README.md': '# Test'
    });
    
    const validator = new Validator();
    const isValid = validator.validateJsonFile('ArrayJsonTool', 'Tools.json');
    
    this.assert(isValid, 'JSON array should be valid');
  }

  // Test: JSON nested structure
  testJsonNestedStructure() {
    this.log('\nTest: JSON Nested Structure');
    
    const tempDir = this.helper.createTempDir();
    const nestedJson = JSON.stringify({
      metadata: {
        version: '1.0',
        tools: {
          list: ['tool1', 'tool2']
        }
      }
    }, null, 2);
    const toolDir = this.helper.createToolDir(tempDir, 'NestedJsonTool', {
      'Tools.json': nestedJson,
      'Prompt.txt': 'Test prompt. ' + 'A'.repeat(500),
      'README.md': '# Test'
    });
    
    const validator = new Validator();
    const isValid = validator.validateJsonFile('NestedJsonTool', 'Tools.json');
    
    this.assert(isValid, 'Nested JSON should be valid');
  }

  // Test: Whitespace-only content
  testWhitespaceOnlyContent() {
    this.log('\nTest: Whitespace-Only Content');
    
    const tempDir = this.helper.createTempDir();
    const toolDir = this.helper.createToolDir(tempDir, 'WhitespaceTool', {
      'Prompt.txt': '   \n  \t  \n   ',
      'README.md': '# Test'
    });
    
    const validator = new Validator();
    const isValid = validator.validatePromptFile('WhitespaceTool', 'Prompt.txt');
    
    this.assert(!isValid, 'Whitespace-only content should be invalid');
  }

  // Test: Long lines in prompt
  testLongLinesInPrompt() {
    this.log('\nTest: Long Lines in Prompt');
    
    const tempDir = this.helper.createTempDir();
    const longLine = 'A'.repeat(2000);
    const toolDir = this.helper.createToolDir(tempDir, 'LongLineTool', {
      'Prompt.txt': longLine,
      'README.md': '# Test'
    });
    
    const validator = new Validator();
    const isValid = validator.validatePromptFile('LongLineTool', 'Prompt.txt');
    
    this.assert(isValid, 'Long lines should be valid');
  }

  // Test: Multiple JSON files
  testMultipleJsonFiles() {
    this.log('\nTest: Multiple JSON Files');
    
    const tempDir = this.helper.createTempDir();
    const toolDir = this.helper.createToolDir(tempDir, 'MultiJsonTool', {
      'Tools.json': JSON.stringify({ tools: ['tool1'] }),
      'Config.json': JSON.stringify({ config: 'value' }),
      'Prompt.txt': 'Test prompt. ' + 'A'.repeat(500),
      'README.md': '# Test'
    });
    
    const validator = new Validator();
    validator.validateJsonFile('MultiJsonTool', 'Tools.json');
    validator.validateJsonFile('MultiJsonTool', 'Config.json');
    
    this.assertEqual(validator.errors.length, 0, 'Both JSON files should be valid');
    this.assert(validator.passed >= 2, 'Should have validated both files');
  }

  // Run all tests
  runAll() {
    this.log('\n' + '='.repeat(60), 'info');
    this.log('Starting Validator Test Suite', 'info');
    this.log('='.repeat(60), 'info');

    try {
      this.testValidatorInitialization();
      this.testErrorLogging();
      this.testWarningLogging();
      this.testSuccessLogging();
      this.testPromptFileDetection();
      this.testPromptFileDetectionVariations();
      this.testEmptyPromptFile();
      this.testSmallPromptFileWarning();
      this.testLargePromptFile();
      this.testValidJsonFile();
      this.testInvalidJsonFile();
      this.testReadmeWithRequiredSections();
      this.testReadmeMissingSections();
      this.testRedactedContentDetection();
      this.testSpecialCharactersInContent();
      this.testMultiplePromptFiles();
      this.testCaseInsensitivePromptDetection();
      this.testToolDirectoryWithoutReadme();
      this.testToolDirectoryWithoutPrompt();
      this.testEmptyDirectory();
      this.testJsonArrayFormat();
      this.testJsonNestedStructure();
      this.testWhitespaceOnlyContent();
      this.testLongLinesInPrompt();
      this.testMultipleJsonFiles();
    } finally {
      this.helper.cleanup();
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
  const tests = new ValidatorTests();
  tests.runAll();
}

module.exports = ValidatorTests;