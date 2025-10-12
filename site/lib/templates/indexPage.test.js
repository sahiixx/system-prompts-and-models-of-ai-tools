const test = require('node:test');
const assert = require('node:assert');
const { renderIndexPage } = require('./indexPage');

test('renderIndexPage - generates valid HTML document', () => {
  const report = {
    totalFiles: 100,
    totalDirectories: 20,
    totalSizeBytes: 1024000,
    averageFileSizeBytes: 10240,
    averageFilesPerDirectory: 5,
    generatedPages: 100,
    durationMs: 5000,
    bytesPerSecond: 204800,
    generatedHuman: 'Jan 01, 2025 12:00 PM',
    runtime: { node: 'v20.0.0', platform: 'linux' },
    sizeMetrics: { median: 5000, p95: 50000 },
    lineMetrics: { totalLines: 10000, averageLines: 100 },
    extensionBreakdown: [],
    largestDirectories: [],
    largestFiles: [],
    sizeDistribution: [],
    filesPerSecond: 20
  };
  
  const rootNode = {
    name: 'Root',
    relativePath: '.',
    depth: 0,
    files: [],
    children: new Map(),
    totalFiles: 100,
    totalBytes: 1024000,
    totalLines: 10000
  };
  
  const searchIndex = [];
  
  const html = renderIndexPage({ report, rootNode, searchIndex });
  
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('<html'));
  assert.ok(html.includes('</html>'));
  assert.ok(html.includes('<head>'));
  assert.ok(html.includes('<body>'));
});

test('renderIndexPage - includes page title', () => {
  const report = createMinimalReport();
  const rootNode = createMinimalNode();
  const html = renderIndexPage({ report, rootNode, searchIndex: [] });
  
  assert.ok(html.includes('<title>'));
  assert.ok(html.includes('System Prompts'));
  assert.ok(html.includes('Repository Atlas'));
});

test('renderIndexPage - includes header with statistics', () => {
  const report = {
    ...createMinimalReport(),
    totalFiles: 250,
    generatedHuman: 'Jan 15, 2025 10:30 AM',
    runtime: { node: 'v20.0.0', platform: 'linux' }
  };
  
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  assert.ok(html.includes('250'));
  assert.ok(html.includes('Jan 15, 2025'));
});

test('renderIndexPage - includes metrics grid', () => {
  const report = createMinimalReport();
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  assert.ok(html.includes('metrics-grid'));
  assert.ok(html.includes('Files indexed'));
  assert.ok(html.includes('Directories'));
  assert.ok(html.includes('Generated pages'));
});

test('renderIndexPage - includes search functionality', () => {
  const report = createMinimalReport();
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  assert.ok(html.includes('data-search'));
  assert.ok(html.includes('Filter files'));
  assert.ok(html.includes('data-search-results'));
});

test('renderIndexPage - includes extension breakdown section', () => {
  const report = {
    ...createMinimalReport(),
    extensionBreakdown: [
      {
        extension: '.txt',
        files: 50,
        totalSizeHuman: '100 KB',
        averageFileSizeHuman: '2 KB',
        sizeSharePercent: 50
      }
    ]
  };
  
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  assert.ok(html.includes('Extension breakdown'));
  assert.ok(html.includes('.txt'));
  assert.ok(html.includes('100 KB'));
});

test('renderIndexPage - includes directory insights section', () => {
  const report = {
    ...createMinimalReport(),
    largestDirectories: [
      {
        directory: 'docs',
        files: 30,
        totalSizeHuman: '500 KB',
        averageFileSizeHuman: '16.67 KB',
        sizeSharePercent: 30
      }
    ]
  };
  
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  assert.ok(html.includes('Directory insights'));
  assert.ok(html.includes('docs'));
  assert.ok(html.includes('500 KB'));
});

test('renderIndexPage - includes largest files section', () => {
  const report = {
    ...createMinimalReport(),
    largestFiles: [
      {
        path: 'large/file.txt',
        sizeHuman: '10 MB',
        bytes: 10485760,
        lines: 100000
      }
    ]
  };
  
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  assert.ok(html.includes('Largest files'));
  assert.ok(html.includes('large/file.txt'));
  assert.ok(html.includes('10 MB'));
});

test('renderIndexPage - includes size distribution histogram', () => {
  const report = {
    ...createMinimalReport(),
    sizeDistribution: [
      { label: '0 – 1 KB', count: 50, totalBytes: 25000 },
      { label: '1 KB – 10 KB', count: 30, totalBytes: 150000 }
    ]
  };
  
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  assert.ok(html.includes('Size distribution'));
  assert.ok(html.includes('histogram'));
  assert.ok(html.includes('0 – 1 KB'));
});

test('renderIndexPage - includes repository tree', () => {
  const rootNode = {
    name: 'Root',
    relativePath: '.',
    depth: 0,
    files: [{ id: 'abc', name: 'test.txt', size: 100 }],
    children: new Map(),
    totalFiles: 1,
    totalBytes: 100
  };
  
  const html = renderIndexPage({ report: createMinimalReport(), rootNode, searchIndex: [] });
  
  assert.ok(html.includes('Repository map'));
  assert.ok(html.includes('tree'));
  assert.ok(html.includes('test.txt'));
});

test('renderIndexPage - escapes HTML in file names', () => {
  const rootNode = {
    name: 'Root',
    relativePath: '.',
    depth: 0,
    files: [{ id: 'test', name: '<script>.txt', size: 100 }],
    children: new Map(),
    totalFiles: 1,
    totalBytes: 100
  };
  
  const html = renderIndexPage({ report: createMinimalReport(), rootNode, searchIndex: [] });
  
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>.txt'));
});

test('renderIndexPage - includes theme toggle', () => {
  const report = createMinimalReport();
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  assert.ok(html.includes('data-theme-toggle'));
  assert.ok(html.includes('Light mode'));
});

test('renderIndexPage - includes footer with build info', () => {
  const report = {
    ...createMinimalReport(),
    durationMs: 3500,
    filesPerSecond: 28.5
  };
  
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  assert.ok(html.includes('<footer>'));
  assert.ok(html.includes('3') || html.includes('second'));
  assert.ok(html.includes('build-report.json'));
});

test('renderIndexPage - embeds search data as JSON', () => {
  const searchIndex = [
    { id: 'abc', path: 'test.txt', pathLower: 'test.txt', extension: '.txt', sizeHuman: '1 KB', lines: 10 }
  ];
  
  const html = renderIndexPage({ report: createMinimalReport(), rootNode: createMinimalNode(), searchIndex });
  
  assert.ok(html.includes('search-data'));
  assert.ok(html.includes('application/json'));
  assert.ok(html.includes('test.txt'));
});

test('renderIndexPage - includes client-side scripts', () => {
  const report = createMinimalReport();
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  assert.ok(html.includes('<script>'));
  assert.ok(html.includes('localStorage'));
  assert.ok(html.includes('addEventListener'));
});

test('renderIndexPage - handles empty extension breakdown', () => {
  const report = {
    ...createMinimalReport(),
    extensionBreakdown: []
  };
  
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  assert.ok(html.includes('Extension breakdown'));
  assert.ok(html.includes('No extension statistics available') || html.includes('</tbody>'));
});

test('renderIndexPage - handles empty directory list', () => {
  const report = {
    ...createMinimalReport(),
    largestDirectories: []
  };
  
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  assert.ok(html.includes('Directory insights'));
  assert.ok(html.includes('No directory statistics available') || html.includes('</tbody>'));
});

test('renderIndexPage - handles empty file list', () => {
  const report = {
    ...createMinimalReport(),
    largestFiles: []
  };
  
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  assert.ok(html.includes('Largest files'));
  assert.ok(html.includes('No file samples available') || html.includes('</tbody>'));
});

test('renderIndexPage - handles nested directory tree', () => {
  const childNode = {
    name: 'subdir',
    relativePath: 'subdir',
    depth: 1,
    files: [{ id: 'xyz', name: 'nested.txt', size: 50 }],
    children: new Map(),
    totalFiles: 1,
    totalBytes: 50
  };
  
  const rootNode = {
    name: 'Root',
    relativePath: '.',
    depth: 0,
    files: [],
    children: new Map([['subdir', childNode]]),
    totalFiles: 1,
    totalBytes: 50
  };
  
  const html = renderIndexPage({ report: createMinimalReport(), rootNode, searchIndex: [] });
  
  assert.ok(html.includes('subdir'));
  assert.ok(html.includes('nested.txt'));
});

test('renderIndexPage - formats large numbers with separators', () => {
  const report = {
    ...createMinimalReport(),
    totalFiles: 1000000,
    totalSizeBytes: 1000000000
  };
  
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  // Should have comma separators for readability
  assert.ok(html.includes('1,000,000') || html.includes('1000000'));
});

test('renderIndexPage - includes CSS styles', () => {
  const report = createMinimalReport();
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  assert.ok(html.includes('<style>'));
  assert.ok(html.includes('--bg-primary'));
  assert.ok(html.includes('--accent'));
  assert.ok(html.includes('color-scheme'));
});

test('renderIndexPage - supports light theme', () => {
  const report = createMinimalReport();
  const html = renderIndexPage({ report, rootNode: createMinimalNode(), searchIndex: [] });
  
  assert.ok(html.includes('[data-theme="light"]'));
});

test('renderIndexPage - sanitizes JSON for safe embedding', () => {
  const searchIndex = [
    { id: 'test', path: '<script>alert(1)</script>', pathLower: 'test', extension: '.txt' }
  ];
  
  const html = renderIndexPage({ report: createMinimalReport(), rootNode: createMinimalNode(), searchIndex });
  
  // Should escape < to prevent script injection
  assert.ok(html.includes('\\u003c') || !html.includes('<script>alert(1)</script>'));
});

// Helper functions
function createMinimalReport() {
  return {
    totalFiles: 100,
    totalDirectories: 20,
    totalSizeBytes: 1024000,
    averageFileSizeBytes: 10240,
    averageFilesPerDirectory: 5,
    generatedPages: 100,
    durationMs: 5000,
    bytesPerSecond: 204800,
    generatedHuman: 'Jan 01, 2025',
    runtime: { node: 'v20.0.0', platform: 'linux' },
    sizeMetrics: { median: 5000, p95: 50000 },
    lineMetrics: { totalLines: 10000, averageLines: 100 },
    extensionBreakdown: [],
    largestDirectories: [],
    largestFiles: [],
    sizeDistribution: [],
    filesPerSecond: 20
  };
}

function createMinimalNode() {
  return {
    name: 'Root',
    relativePath: '.',
    depth: 0,
    files: [],
    children: new Map(),
    totalFiles: 0,
    totalBytes: 0,
    totalLines: 0
  };
}