/**
 * Unit Tests for GitHub Actions Workflow Files
 * Tests workflow YAML files for structure, permissions, and security best practices
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

class WorkflowValidationTests {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.total = 0;
    this.workflowDir = path.join(process.cwd(), '.github', 'workflows');
    this.manualWorkflow = path.join(this.workflowDir, 'manual.yml');
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
    }
  }

  testWorkflowExists() {
    this.log('\nTest: Workflow File Exists');
    this.assert(fs.existsSync(this.manualWorkflow), 'manual.yml should exist');
  }

  testWorkflowStructure() {
    this.log('\nTest: Workflow Structure');
    const content = fs.readFileSync(this.manualWorkflow, 'utf8');

    this.assert(content.includes('name:'), 'Should have name field');
    this.assert(content.includes('on:'), 'Should have on field');
    this.assert(content.includes('jobs:'), 'Should have jobs field');
  }

  testPermissionsBlock() {
    this.log('\nTest: Permissions Configuration');
    const content = fs.readFileSync(this.manualWorkflow, 'utf8');

    this.assert(content.includes('permissions:'), 'Should have permissions block');
    this.assert(/contents:\s*read/.test(content), 'Should have contents: read');
    this.assert(!content.includes('contents: write'), 'Should not have contents: write');
  }

  testWorkflowDispatch() {
    this.log('\nTest: Workflow Dispatch');
    const content = fs.readFileSync(this.manualWorkflow, 'utf8');

    this.assert(content.includes('workflow_dispatch'), 'Should have workflow_dispatch trigger');
  }

  testInputFields() {
    this.log('\nTest: Input Configuration');
    const content = fs.readFileSync(this.manualWorkflow, 'utf8');

    if (content.includes('inputs:')) {
      this.assert(content.includes('required:'), 'Inputs should have required field');
      this.assert(content.includes('type:'), 'Inputs should have type field');
      this.assert(content.includes('description:'), 'Inputs should have description field');
      this.assert(content.includes('default:'), 'Inputs should have default field');
    }
  }

  testJobStructure() {
    this.log('\nTest: Job Structure');
    const content = fs.readFileSync(this.manualWorkflow, 'utf8');

    this.assert(content.includes('runs-on:'), 'Should specify runner');
    this.assert(content.includes('steps:'), 'Should have steps');
  }

  testNoSecrets() {
    this.log('\nTest: Security - No Hardcoded Secrets');
    const content = fs.readFileSync(this.manualWorkflow, 'utf8');

    this.assert(
      !(
        content.includes('password:') ||
        content.includes('token:') ||
        content.includes('api_key:') ||
        content.includes('api-key:')
      ),
      'Should not have hardcoded secrets'
    );
  }

  testYamlSyntax() {
    this.log('\nTest: YAML Syntax');
    const content = fs.readFileSync(this.manualWorkflow, 'utf8');
    this.assert(
      !content.includes(String.fromCharCode(9)),
      'Should not contain tabs'
    );
  }

  testDocumentation() {
    this.log('\nTest: Documentation');
    const content = fs.readFileSync(this.manualWorkflow, 'utf8');
    const lines = content.split('\n');
    const commentLines = lines.filter(line => line.trim().startsWith('#'));

    this.assert(commentLines.length > 0, 'Should have comments');
  }

  testAllWorkflows() {
    this.log('\nTest: All Workflows');
    const files = fs
      .readdirSync(this.workflowDir)
      .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

    this.assert(files.length > 0, 'Should have at least one workflow');
    this.log(`  Found ${files.length} workflow files`);
  }

  runAll() {
    this.log('\n' + '='.repeat(70), 'info');
    this.log('GitHub Actions Workflow Validation Test Suite', 'info');
    this.log('='.repeat(70), 'info');

    try {
      this.testWorkflowExists();
      this.testWorkflowStructure();
      this.testPermissionsBlock();
      this.testWorkflowDispatch();
      this.testInputFields();
      this.testJobStructure();
      this.testNoSecrets();
      this.testYamlSyntax();
      this.testDocumentation();
      this.testAllWorkflows();
    } catch (error) {
      this.log(`\nUnexpected error: ${error.message}`, 'fail');
      this.failed++;
    }

    this.printSummary();
  }

  printSummary() {
    this.log('\n' + '='.repeat(70), 'info');
    this.log('Test Summary', 'info');
    this.log('='.repeat(70), 'info');
    this.log(`\nTotal Tests: ${this.total}`, 'info');
    this.log(`Passed: ${this.passed}`, 'pass');
    this.log(`Failed: ${this.failed}`, 'fail');
    this.log(
      `Success Rate: ${((this.passed / this.total) * 100).toFixed(2)}%\n`,
      'info'
    );

    process.exit(this.failed > 0 ? 1 : 0);
  }
}

if (require.main === module) {
  const tests = new WorkflowValidationTests();
  tests.runAll();
}

module.exports = WorkflowValidationTests;