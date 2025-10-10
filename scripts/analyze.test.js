const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Analyzer = require('./analyze.js');

function createTestDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-test-'));
}

function cleanupTestDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('Analyzer - constructor initializes correctly', () => {
  const analyzer = new Analyzer();
  assert.ok(Array.isArray(analyzer.tools));
  assert.strictEqual(analyzer.tools.length, 0);
  assert.ok(analyzer.patterns);
  assert.ok(analyzer.stats);
});

test('Analyzer - getToolDirectories() returns array of directories', () => {
  const analyzer = new Analyzer();
  const dirs = analyzer.getToolDirectories();

  assert.ok(Array.isArray(dirs));
  // Should exclude system directories
  assert.ok(!dirs.includes('.git'));
  assert.ok(!dirs.includes('scripts'));
  assert.ok(!dirs.includes('node_modules'));
});

test('Analyzer - analyzePrompt() detects security patterns', () => {
  const analyzer = new Analyzer();
  const content = 'Never log secrets or expose API keys. This is for security.';

  const result = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);

  assert.strictEqual(result.patterns.hasSecurityRules, true);
  assert.ok(result.securityMentions > 0);
});

test('Analyzer - analyzePrompt() detects conciseness patterns', () => {
  const analyzer = new Analyzer();
  const content = 'Be concise and brief. Keep responses to 1-3 sentences with no preamble.';

  const result = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);

  assert.strictEqual(result.patterns.hasConciseness, true);
});

test('Analyzer - analyzePrompt() detects tool instructions', () => {
  const analyzer = new Analyzer();
  const content = 'You have access to the following tools and functions. Use them wisely.';

  const result = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);

  assert.strictEqual(result.patterns.hasToolInstructions, true);
});

test('Analyzer - analyzePrompt() detects verification patterns', () => {
  const analyzer = new Analyzer();
  const content = 'Always verify and validate your output. Check for errors and test thoroughly.';

  const result = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);

  assert.strictEqual(result.patterns.hasVerification, true);
});

test('Analyzer - analyzePrompt() detects parallel execution', () => {
  const analyzer = new Analyzer();
  const content = 'Execute tasks in parallel when possible. Run operations simultaneously.';

  const result = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);

  assert.strictEqual(result.patterns.hasParallel, true);
});

test('Analyzer - analyzePrompt() detects memory system', () => {
  const analyzer = new Analyzer();
  const content = 'Remember context from previous interactions. Persist important information in memory.';

  const result = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);

  assert.strictEqual(result.patterns.hasMemory, true);
});

test('Analyzer - analyzePrompt() detects sub-agents', () => {
  const analyzer = new Analyzer();
  const content = 'Delegate tasks to sub-agents. Use oracle reasoning for complex problems.';

  const result = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);

  assert.strictEqual(result.patterns.hasSubAgents, true);
});

test('Analyzer - analyzePrompt() counts lines and characters', () => {
  const analyzer = new Analyzer();
  const content = 'Line 1\nLine 2\nLine 3';

  const result = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);

  assert.strictEqual(result.lineCount, 3);
  assert.strictEqual(result.charCount, content.length);
});

test('Analyzer - analyzePrompt() handles empty content', () => {
  const analyzer = new Analyzer();
  const content = '';

  const result = analyzer.analyzePrompt('TestTool', 'Prompt.txt', content);

  assert.strictEqual(result.lineCount, 1);
  assert.strictEqual(result.charCount, 0);
});

test('Analyzer - calculateStats() computes correct averages', () => {
  const analyzer = new Analyzer();

  analyzer.tools = [
    {
      name: 'Tool1',
      promptCount: 2,
      prompts: [
        { lineCount: 100, charCount: 1000 },
        { lineCount: 200, charCount: 2000 }
      ],
      toolCount: 5
    },
    {
      name: 'Tool2',
      promptCount: 1,
      prompts: [
        { lineCount: 150, charCount: 1500 }
      ],
      toolCount: 3
    }
  ];

  analyzer.calculateStats();

  assert.strictEqual(analyzer.stats.totalTools, 2);
  assert.strictEqual(analyzer.stats.totalPrompts, 3);
  assert.strictEqual(analyzer.stats.totalLines, 450);
  assert.strictEqual(analyzer.stats.avgPromptLength, 150);
  assert.strictEqual(analyzer.stats.avgToolCount, 4);
});

test('Analyzer - calculateStats() handles empty tools', () => {
  const analyzer = new Analyzer();
  analyzer.tools = [];

  analyzer.calculateStats();

  assert.strictEqual(analyzer.stats.totalTools, 0);
  assert.strictEqual(analyzer.stats.totalPrompts, 0);
  assert.strictEqual(analyzer.stats.totalLines, 0);
  assert.strictEqual(analyzer.stats.avgPromptLength, 0);
  assert.strictEqual(analyzer.stats.avgToolCount, 0);
});

test('Analyzer - extractPatterns() counts pattern occurrences', () => {
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

test('Analyzer - generateReport() creates valid report structure', () => {
  const analyzer = new Analyzer();

  analyzer.tools = [
    {
      name: 'TestTool',
      promptCount: 1,
      hasTools: true,
      toolCount: 5,
      prompts: [
        {
          lineCount: 100,
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
        }
      ]
    }
  ];

  analyzer.calculateStats();
  const report = analyzer.generateReport();

  assert.ok(report.summary);
  assert.ok(report.patterns);
  assert.ok(report.topTools);
  assert.ok(Array.isArray(report.topTools));
  assert.strictEqual(report.summary.totalTools, 1);
  assert.strictEqual(report.summary.totalPrompts, 1);
});

test('Analyzer - generateReport() calculates percentages correctly', () => {
  const analyzer = new Analyzer();

  analyzer.tools = [
    {
      name: 'Tool1',
      promptCount: 2,
      prompts: [
        {
          lineCount: 100,
          patterns: {
            hasSecurityRules: true,
            hasConciseness: true,
            hasToolInstructions: false,
            hasVerification: false,
            hasParallel: false,
            hasTodo: false,
            hasMemory: false,
            hasSubAgents: false
          }
        },
        {
          lineCount: 100,
          patterns: {
            hasSecurityRules: false,
            hasConciseness: true,
            hasToolInstructions: false,
            hasVerification: false,
            hasParallel: false,
            hasTodo: false,
            hasMemory: false,
            hasSubAgents: false
          }
        }
      ]
    }
  ];

  analyzer.calculateStats();
  const report = analyzer.generateReport();

  assert.strictEqual(report.patterns.security.count, 1);
  assert.strictEqual(report.patterns.security.percentage, 50);
  assert.strictEqual(report.patterns.conciseness.count, 2);
  assert.strictEqual(report.patterns.conciseness.percentage, 100);
});

test('Analyzer - edge case: very long prompt', () => {
  const analyzer = new Analyzer();
  const longContent = 'a'.repeat(100000);

  const result = analyzer.analyzePrompt('LongTool', 'Prompt.txt', longContent);

  assert.strictEqual(result.charCount, 100000);
  assert.ok(result.lineCount > 0);
});

test('Analyzer - edge case: prompt with all patterns', () => {
  const analyzer = new Analyzer();
  const content = `
    Never log secrets. Be concise.
    Use available tools. Verify your output.
    Run in parallel. Track todos.
    Remember context in memory. Delegate to sub-agents.
  `;

  const result = analyzer.analyzePrompt('AllPatterns', 'Prompt.txt', content);

  assert.strictEqual(result.patterns.hasSecurityRules, true);
  assert.strictEqual(result.patterns.hasConciseness, true);
  assert.strictEqual(result.patterns.hasToolInstructions, true);
  assert.strictEqual(result.patterns.hasVerification, true);
  assert.strictEqual(result.patterns.hasParallel, true);
  assert.strictEqual(result.patterns.hasTodo, true);
  assert.strictEqual(result.patterns.hasMemory, true);
  assert.strictEqual(result.patterns.hasSubAgents, true);
});

test('Analyzer - saveReport() creates valid JSON file', (t) => {
  const tmpDir = createTestDir();

  t.after(() => cleanupTestDir(tmpDir));

  // Temporarily modify ROOT_DIR
  const originalDir = process.cwd();
  process.chdir(tmpDir);

  const analyzer = new Analyzer();
  analyzer.tools = [];
  analyzer.calculateStats();
  const report = analyzer.generateReport();

  analyzer.saveReport(report);

  const reportPath = path.join(tmpDir, 'analysis-report.json');
  assert.ok(fs.existsSync(reportPath));

  const savedReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  assert.ok(savedReport.summary);
  assert.ok(savedReport.patterns);

  process.chdir(originalDir);
});