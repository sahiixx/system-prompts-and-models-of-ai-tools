// #!/usr/bin/env node

/**
 * Unit tests for analyze.js
 * Tests repository analysis functionality
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { mkdtempSync, rmSync } = require('fs');
const os = require('os');

// Import the Analyzer class
const Analyzer = require('../../scripts/analyze.js');

describe('Analyzer', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    // Create temporary directory
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-analyzer-'));
    originalCwd = process.cwd();
  });

  afterEach(() => {
    // Cleanup
    if (tempDir && fs.existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    process.chdir(originalCwd);
  });

  test('Analyzer initialization', () => {
    const analyzer = new Analyzer();

    assert.ok(analyzer);
    assert.strictEqual(typeof analyzer.tools, 'object');
    assert.strictEqual(typeof analyzer.patterns, 'object');
    assert.strictEqual(typeof analyzer.stats, 'object');
  });

  test('analyzePrompt detects security rules', () => {
    const analyzer = new Analyzer();
    const content = `
      Never log secrets or API keys.
      Never expose passwords.
      Ensure security of all operations.
    `;

    const result = analyzer.analyzePrompt('TestTool', 'prompt.txt', content);

    assert.ok(result.patterns.hasSecurityRules);
    assert.ok(result.securityMentions > 0);
  });

  test('analyzePrompt detects conciseness', () => {
    const analyzer = new Analyzer();
    const content = `
      Be concise and brief in responses.
      Keep it short. No preamble.
    `;

    const result = analyzer.analyzePrompt('TestTool', 'prompt.txt', content);

    assert.ok(result.patterns.hasConciseness);
  });

  test('analyzePrompt detects tool instructions', () => {
    const analyzer = new Analyzer();
    const content = `
      Use the available tools to complete tasks.
      Functions are provided for file operations.
    `;

    const result = analyzer.analyzePrompt('TestTool', 'prompt.txt', content);

    assert.ok(result.patterns.hasToolInstructions);
  });

  test('analyzePrompt detects verification patterns', () => {
    const analyzer = new Analyzer();
    const content = `
      Verify all changes before applying.
      Check the output for correctness.
      Validate inputs thoroughly.
    `;

    const result = analyzer.analyzePrompt('TestTool', 'prompt.txt', content);

    assert.ok(result.patterns.hasVerification);
  });

  test('analyzePrompt detects parallel execution', () => {
    const analyzer = new Analyzer();
    const content = `
      Execute tasks in parallel when possible.
      Run operations simultaneously.
      Process files independently.
    `;

    const result = analyzer.analyzePrompt('TestTool', 'prompt.txt', content);

    assert.ok(result.patterns.hasParallel);
  });

  test('analyzePrompt counts lines and characters', () => {
    const analyzer = new Analyzer();
    const content = 'Line 1\nLine 2\nLine 3';

    const result = analyzer.analyzePrompt('TestTool', 'prompt.txt', content);

    assert.strictEqual(result.lineCount, 3);
    assert.strictEqual(result.charCount, content.length);
  });

  test('analyzePrompt with empty content', () => {
    const analyzer = new Analyzer();
    const content = '';

    const result = analyzer.analyzePrompt('TestTool', 'prompt.txt', content);

    assert.strictEqual(result.lineCount, 1); // Empty string has 1 line
    assert.strictEqual(result.charCount, 0);
  });

  test('calculateStats with no tools', () => {
    const analyzer = new Analyzer();
    analyzer.tools = [];

    analyzer.calculateStats();

    assert.strictEqual(analyzer.stats.totalTools, 0);
    assert.strictEqual(analyzer.stats.totalPrompts, 0);
    assert.strictEqual(analyzer.stats.avgPromptLength, 0);
  });

  test('calculateStats with tools', () => {
    const analyzer = new Analyzer();
    analyzer.tools = [
      {
        name: 'Tool1',
        promptCount: 2,
        prompts: [
          { lineCount: 100 },
          { lineCount: 200 }
        ]
      },
      {
        name: 'Tool2',
        promptCount: 1,
        prompts: [
          { lineCount: 150 }
        ],
        toolCount: 5
      }
    ];

    analyzer.calculateStats();

    assert.strictEqual(analyzer.stats.totalTools, 2);
    assert.strictEqual(analyzer.stats.totalPrompts, 3);
    assert.strictEqual(analyzer.stats.avgPromptLength, 150);
    assert.strictEqual(analyzer.stats.avgToolCount, 5);
  });

  test('extractPatterns counts pattern occurrences', () => {
    const analyzer = new Analyzer();
    analyzer.tools = [
      {
        prompts: [
          {
            patterns: {
              hasSecurityRules: true,
              hasConciseness: true,
              hasToolInstructions: false
            }
          },
          {
            patterns: {
              hasSecurityRules: true,
              hasConciseness: false,
              hasToolInstructions: true
            }
          }
        ]
      }
    ];

    const patterns = analyzer.extractPatterns();

    assert.strictEqual(patterns.security, 2);
    assert.strictEqual(patterns.conciseness, 1);
    assert.strictEqual(patterns.tools, 1);
  });

  test('generateReport creates proper structure', () => {
    const analyzer = new Analyzer();
    analyzer.tools = [
      {
        name: 'TestTool',
        promptCount: 1,
        hasTools: true,
        toolCount: 3,
        prompts: [
          {
            lineCount: 100,
            patterns: {
              hasSecurityRules: true,
              hasConciseness: false
            }
          }
        ]
      }
    ];

    analyzer.calculateStats();
    const report = analyzer.generateReport();

    assert.ok(report.summary);
    assert.ok(report.patterns);
    assert.ok(report.topTools);
    assert.strictEqual(report.summary.totalTools, 1);
    assert.ok(Array.isArray(report.topTools));
  });

  test('generateReport with empty tools', () => {
    const analyzer = new Analyzer();
    analyzer.tools = [];
    analyzer.calculateStats();

    const report = analyzer.generateReport();

    assert.strictEqual(report.summary.totalTools, 0);
    assert.strictEqual(report.topTools.length, 0);
  });

  test('pattern percentages are calculated correctly', () => {
    const analyzer = new Analyzer();
    analyzer.tools = [
      {
        prompts: [
          { patterns: { hasSecurityRules: true } },
          { patterns: { hasSecurityRules: false } },
          { patterns: { hasSecurityRules: true } },
          { patterns: { hasSecurityRules: true } }
        ]
      }
    ];

    analyzer.calculateStats();
    const report = analyzer.generateReport();

    // 3 out of 4 = 75%
    assert.strictEqual(report.patterns.security.percentage, 75);
  });

  test('topTools are sorted by line count', () => {
    const analyzer = new Analyzer();
    analyzer.tools = [
      {
        name: 'Small',
        promptCount: 1,
        prompts: [{ lineCount: 50 }]
      },
      {
        name: 'Large',
        promptCount: 1,
        prompts: [{ lineCount: 200 }]
      },
      {
        name: 'Medium',
        promptCount: 1,
        prompts: [{ lineCount: 100 }]
      }
    ];

    analyzer.calculateStats();
    const report = analyzer.generateReport();

    // Should be sorted descending
    assert.strictEqual(report.topTools[0].name, 'Large');
    assert.strictEqual(report.topTools[1].name, 'Medium');
    assert.strictEqual(report.topTools[2].name, 'Small');
  });

  test('topTools limits to 10 items', () => {
    const analyzer = new Analyzer();
    analyzer.tools = Array.from({ length: 15 }, (_, i) => ({
      name: `Tool${i}`,
      promptCount: 1,
      prompts: [{ lineCount: 100 - i }]
    }));

    analyzer.calculateStats();
    const report = analyzer.generateReport();

    assert.strictEqual(report.topTools.length, 10);
  });
});

describe('Analyzer pattern detection', () => {
  test('detects todo tracking pattern', () => {
    const analyzer = new Analyzer();
    const content = 'Track progress with todo list';

    const result = analyzer.analyzePrompt('Tool', 'prompt.txt', content);

    assert.ok(result.patterns.hasTodo);
  });

  test('detects memory system pattern', () => {
    const analyzer = new Analyzer();
    const content = 'Remember context and persist information';

    const result = analyzer.analyzePrompt('Tool', 'prompt.txt', content);

    assert.ok(result.patterns.hasMemory);
  });

  test('detects sub-agents pattern', () => {
    const analyzer = new Analyzer();
    const content = 'Delegate to sub-agent for specialized tasks';

    const result = analyzer.analyzePrompt('Tool', 'prompt.txt', content);

    assert.ok(result.patterns.hasSubAgents);
  });

  test('case-insensitive pattern detection', () => {
    const analyzer = new Analyzer();
    const content = 'BE CONCISE AND BRIEF';

    const result = analyzer.analyzePrompt('Tool', 'prompt.txt', content);

    assert.ok(result.patterns.hasConciseness);
  });
});