#!/usr/bin/env node
/**
 * Unit Tests for scripts/analyze.js
 * Tests the repository pattern analyzer
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import the Analyzer class
const Analyzer = require('../scripts/analyze.js');

// Test Suite
class AnalyzerTests {
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
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyzer-test-'));
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

  // Test: Analyzer initialization
  testAnalyzerInitialization() {
    this.log('\nTest: Analyzer Initialization');
    
    const analyzer = new Analyzer();
    this.assert(analyzer !== null, 'Analyzer should be instantiated');
    this.assert(Array.isArray(analyzer.tools), 'Tools should be an array');
    this.assert(typeof analyzer.patterns === 'object', 'Patterns should be an object');
    this.assert(typeof analyzer.stats === 'object', 'Stats should be an object');
  }

  // Test: Security pattern detection
  testSecurityPatternDetection() {
    this.log('\nTest: Security Pattern Detection');
    
    const analyzer = new Analyzer();
    const content = 'Never log secrets. Never expose API keys. Always validate security credentials.';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(analysis.patterns.hasSecurityRules, 'Should detect security rules');
    this.assert(analysis.securityMentions > 0, 'Should count security mentions');
  }

  // Test: Conciseness pattern detection
  testConcisenessPatternDetection() {
    this.log('\nTest: Conciseness Pattern Detection');
    
    const analyzer = new Analyzer();
    const content = 'Be concise. Keep responses brief. Use 1-3 sentences. No preamble needed.';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(analysis.patterns.hasConciseness, 'Should detect conciseness patterns');
  }

  // Test: Tool instructions detection
  testToolInstructionsDetection() {
    this.log('\nTest: Tool Instructions Detection');
    
    const analyzer = new Analyzer();
    const content = 'You have access to these tools and functions. Available tools include search and execute.';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(analysis.patterns.hasToolInstructions, 'Should detect tool instructions');
  }

  // Test: Verification pattern detection
  testVerificationPatternDetection() {
    this.log('\nTest: Verification Pattern Detection');
    
    const analyzer = new Analyzer();
    const content = 'Always verify your work. Check for errors. Validate the output before proceeding.';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(analysis.patterns.hasVerification, 'Should detect verification patterns');
  }

  // Test: Parallel execution detection
  testParallelExecutionDetection() {
    this.log('\nTest: Parallel Execution Detection');
    
    const analyzer = new Analyzer();
    const content = 'Execute tools in parallel. Run tasks simultaneously. Process independently.';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(analysis.patterns.hasParallel, 'Should detect parallel execution patterns');
  }

  // Test: TODO system detection
  testTodoSystemDetection() {
    this.log('\nTest: TODO System Detection');
    
    const analyzer = new Analyzer();
    const content = 'Track your progress with TODO lists. Update task status as you complete them.';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(analysis.patterns.hasTodo, 'Should detect TODO system patterns');
  }

  // Test: Memory system detection
  testMemorySystemDetection() {
    this.log('\nTest: Memory System Detection');
    
    const analyzer = new Analyzer();
    const content = 'Use memory to persist context. Remember important details across conversations.';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(analysis.patterns.hasMemory, 'Should detect memory system patterns');
  }

  // Test: Sub-agents detection
  testSubAgentsDetection() {
    this.log('\nTest: Sub-Agents Detection');
    
    const analyzer = new Analyzer();
    const content = 'Delegate to sub-agents. Use reasoning oracles for complex problems.';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(analysis.patterns.hasSubAgents, 'Should detect sub-agent patterns');
  }

  // Test: Line and character counting
  testLineAndCharacterCounting() {
    this.log('\nTest: Line and Character Counting');
    
    const analyzer = new Analyzer();
    const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assertEqual(analysis.lineCount, 5, 'Should count lines correctly');
    this.assertEqual(analysis.charCount, content.length, 'Should count characters correctly');
  }

  // Test: Multiple security mentions
  testMultipleSecurityMentions() {
    this.log('\nTest: Multiple Security Mentions');
    
    const analyzer = new Analyzer();
    const content = 'Never log secrets. Protect API keys. Keep passwords secure. Encrypt sensitive data.';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(analysis.securityMentions >= 3, 'Should count multiple security mentions');
  }

  // Test: Empty content handling
  testEmptyContentHandling() {
    this.log('\nTest: Empty Content Handling');
    
    const analyzer = new Analyzer();
    const content = '';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assertEqual(analysis.lineCount, 1, 'Empty content should have 1 line');
    this.assertEqual(analysis.charCount, 0, 'Empty content should have 0 characters');
  }

  // Test: Case-insensitive pattern matching
  testCaseInsensitivePatternMatching() {
    this.log('\nTest: Case-Insensitive Pattern Matching');
    
    const analyzer = new Analyzer();
    const content = 'NEVER LOG SECRETS. KEEP RESPONSES CONCISE. VERIFY ALL WORK.';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(analysis.patterns.hasSecurityRules, 'Should detect uppercase security patterns');
    this.assert(analysis.patterns.hasConciseness, 'Should detect uppercase conciseness patterns');
    this.assert(analysis.patterns.hasVerification, 'Should detect uppercase verification patterns');
  }

  // Test: Mixed case pattern matching
  testMixedCasePatternMatching() {
    this.log('\nTest: Mixed Case Pattern Matching');
    
    const analyzer = new Analyzer();
    const content = 'NeVeR LoG SeCrEtS. kEeP ReSpoNSeS CoNciSe. vEriFy AlL WoRk.';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(analysis.patterns.hasSecurityRules, 'Should detect mixed case security patterns');
    this.assert(analysis.patterns.hasConciseness, 'Should detect mixed case conciseness patterns');
    this.assert(analysis.patterns.hasVerification, 'Should detect mixed case verification patterns');
  }

  // Test: No patterns detected
  testNoPatternsDetected() {
    this.log('\nTest: No Patterns Detected');
    
    const analyzer = new Analyzer();
    const content = 'This is a simple prompt with no special patterns or keywords.';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(!analysis.patterns.hasSecurityRules, 'Should not detect security patterns');
    this.assert(!analysis.patterns.hasConciseness, 'Should not detect conciseness patterns');
    this.assert(!analysis.patterns.hasParallel, 'Should not detect parallel patterns');
  }

  // Test: Large prompt analysis
  testLargePromptAnalysis() {
    this.log('\nTest: Large Prompt Analysis');
    
    const analyzer = new Analyzer();
    const content = 'A'.repeat(10000) + '\nNever log secrets.\nKeep it concise.';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(analysis.charCount > 10000, 'Should handle large prompts');
    this.assert(analysis.patterns.hasSecurityRules, 'Should detect patterns in large prompts');
  }

  // Test: Special characters in content
  testSpecialCharactersInContent() {
    this.log('\nTest: Special Characters in Content');
    
    const analyzer = new Analyzer();
    const content = 'Unicode: 你好世界 🌍\nSpecial: <>&"\'\nNever log secrets.';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(analysis.patterns.hasSecurityRules, 'Should handle special characters');
    this.assert(analysis.charCount > 0, 'Should count characters with unicode');
  }

  // Test: Multiple pattern detection in single prompt
  testMultiplePatternDetection() {
    this.log('\nTest: Multiple Pattern Detection');
    
    const analyzer = new Analyzer();
    const content = `
      Never log secrets. Keep it concise. Use available tools.
      Verify your work. Execute in parallel. Track with TODO.
      Remember context in memory. Delegate to sub-agents.
    `;
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(analysis.patterns.hasSecurityRules, 'Should detect security');
    this.assert(analysis.patterns.hasConciseness, 'Should detect conciseness');
    this.assert(analysis.patterns.hasToolInstructions, 'Should detect tools');
    this.assert(analysis.patterns.hasVerification, 'Should detect verification');
    this.assert(analysis.patterns.hasParallel, 'Should detect parallel');
    this.assert(analysis.patterns.hasTodo, 'Should detect TODO');
    this.assert(analysis.patterns.hasMemory, 'Should detect memory');
    this.assert(analysis.patterns.hasSubAgents, 'Should detect sub-agents');
  }

  // Test: Whitespace handling
  testWhitespaceHandling() {
    this.log('\nTest: Whitespace Handling');
    
    const analyzer = new Analyzer();
    const content = '   Never log secrets.   \n\n   Keep it concise.   \n\n';
    const analysis = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);
    
    this.assert(analysis.patterns.hasSecurityRules, 'Should handle leading/trailing whitespace');
    this.assert(analysis.patterns.hasConciseness, 'Should detect patterns with whitespace');
  }

  // Test: Calculation of statistics
  testStatisticsCalculation() {
    this.log('\nTest: Statistics Calculation');
    
    const analyzer = new Analyzer();
    analyzer.tools = [
      {
        name: 'Tool1',
        promptCount: 2,
        prompts: [
          { lineCount: 100, charCount: 5000 },
          { lineCount: 150, charCount: 7500 }
        ]
      },
      {
        name: 'Tool2',
        promptCount: 1,
        prompts: [
          { lineCount: 200, charCount: 10000 }
        ]
      }
    ];
    
    analyzer.calculateStats();
    
    this.assertEqual(analyzer.stats.totalTools, 2, 'Should count tools');
    this.assertEqual(analyzer.stats.totalPrompts, 3, 'Should count total prompts');
    this.assertEqual(analyzer.stats.totalLines, 450, 'Should sum total lines');
  }

  // Test: Average calculations
  testAverageCalculations() {
    this.log('\nTest: Average Calculations');
    
    const analyzer = new Analyzer();
    analyzer.tools = [
      {
        name: 'Tool1',
        promptCount: 2,
        prompts: [
          { lineCount: 100 },
          { lineCount: 200 }
        ],
        hasTools: true,
        toolCount: 10
      },
      {
        name: 'Tool2',
        promptCount: 1,
        prompts: [
          { lineCount: 300 }
        ],
        hasTools: true,
        toolCount: 20
      }
    ];
    
    analyzer.calculateStats();
    
    this.assertEqual(analyzer.stats.avgPromptLength, 200, 'Should calculate average prompt length');
    this.assertEqual(analyzer.stats.avgToolCount, 15, 'Should calculate average tool count');
  }

  // Test: Zero division handling
  testZeroDivisionHandling() {
    this.log('\nTest: Zero Division Handling');
    
    const analyzer = new Analyzer();
    analyzer.tools = [];
    analyzer.calculateStats();
    
    this.assertEqual(analyzer.stats.avgPromptLength, 0, 'Should handle zero prompts');
    this.assertEqual(analyzer.stats.avgToolCount, 0, 'Should handle zero tools');
  }

  // Test: Pattern extraction
  testPatternExtraction() {
    this.log('\nTest: Pattern Extraction');
    
    const analyzer = new Analyzer();
    analyzer.tools = [
      {
        prompts: [
          {
            patterns: {
              hasSecurityRules: true,
              hasConciseness: false,
              hasToolInstructions: true,
              hasVerification: false,
              hasParallel: false,
              hasTodo: false,
              hasMemory: false,
              hasSubAgents: false
            }
          },
          {
            patterns: {
              hasSecurityRules: true,
              hasConciseness: true,
              hasToolInstructions: false,
              hasVerification: true,
              hasParallel: false,
              hasTodo: false,
              hasMemory: false,
              hasSubAgents: false
            }
          }
        ]
      }
    ];
    
    const patterns = analyzer.extractPatterns();
    
    this.assertEqual(patterns.security, 2, 'Should count security patterns');
    this.assertEqual(patterns.conciseness, 1, 'Should count conciseness patterns');
    this.assertEqual(patterns.tools, 1, 'Should count tool patterns');
    this.assertEqual(patterns.verification, 1, 'Should count verification patterns');
  }

  // Run all tests
  runAll() {
    this.log('\n' + '='.repeat(60), 'info');
    this.log('Starting Analyzer Test Suite', 'info');
    this.log('='.repeat(60), 'info');

    try {
      this.testAnalyzerInitialization();
      this.testSecurityPatternDetection();
      this.testConcisenessPatternDetection();
      this.testToolInstructionsDetection();
      this.testVerificationPatternDetection();
      this.testParallelExecutionDetection();
      this.testTodoSystemDetection();
      this.testMemorySystemDetection();
      this.testSubAgentsDetection();
      this.testLineAndCharacterCounting();
      this.testMultipleSecurityMentions();
      this.testEmptyContentHandling();
      this.testCaseInsensitivePatternMatching();
      this.testMixedCasePatternMatching();
      this.testNoPatternsDetected();
      this.testLargePromptAnalysis();
      this.testSpecialCharactersInContent();
      this.testMultiplePatternDetection();
      this.testWhitespaceHandling();
      this.testStatisticsCalculation();
      this.testAverageCalculations();
      this.testZeroDivisionHandling();
      this.testPatternExtraction();
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
  const tests = new AnalyzerTests();
  tests.runAll();
}

module.exports = AnalyzerTests;