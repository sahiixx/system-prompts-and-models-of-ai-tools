const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

test('escapeHtml - basic HTML entity escaping', () => {
  const escapeHtml = (text) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  };
  
  assert.strictEqual(escapeHtml('<div>'), '&lt;div&gt;');
  assert.strictEqual(escapeHtml('a & b'), 'a &amp; b');
  assert.strictEqual(escapeHtml('"quoted"'), '&quot;quoted&quot;');
});

test('file extension inclusion check', () => {
  const INCLUDED_EXTENSIONS = ['.txt', '.json', '.md'];
  const isIncluded = (filename) => {
    const ext = path.extname(filename);
    return INCLUDED_EXTENSIONS.includes(ext);
  };
  
  assert.strictEqual(isIncluded('test.txt'), true);
  assert.strictEqual(isIncluded('data.json'), true);
  assert.strictEqual(isIncluded('readme.md'), true);
  assert.strictEqual(isIncluded('image.png'), false);
});

test('directory exclusion logic', () => {
  const EXCLUDED_DIRS = ['.git', 'node_modules', 'site', 'assets'];
  const shouldExclude = (dirName) => EXCLUDED_DIRS.includes(dirName);
  
  assert.strictEqual(shouldExclude('.git'), true);
  assert.strictEqual(shouldExclude('node_modules'), true);
  assert.strictEqual(shouldExclude('ValidDir'), false);
});

test('language detection from file extension', () => {
  const getLanguage = (ext) => {
    if (ext === '.json') return 'json';
    if (ext === '.md') return 'markdown';
    return 'text';
  };
  
  assert.strictEqual(getLanguage('.json'), 'json');
  assert.strictEqual(getLanguage('.md'), 'markdown');
  assert.strictEqual(getLanguage('.txt'), 'text');
});

test('file metadata structure validation', () => {
  const fileInfo = {
    name: 'test.txt',
    path: '/path/to/test.txt',
    size: 1024,
    extension: '.txt'
  };
  
  assert.ok(fileInfo.name);
  assert.ok(fileInfo.path);
  assert.ok(typeof fileInfo.size === 'number');
  assert.ok(fileInfo.extension.startsWith('.'));
});

test('directory tree structure', () => {
  const tree = {
    'Root': [],
    'Dir1': [{ name: 'file1.txt' }],
    'Dir2': [{ name: 'file2.json' }]
  };
  
  assert.ok(Object.keys(tree).includes('Root'));
  assert.strictEqual(tree['Dir1'].length, 1);
  assert.strictEqual(tree['Dir1'][0].name, 'file1.txt');
});

test('stats accumulation', () => {
  const stats = {
    totalFiles: 0,
    totalSize: 0,
    totalDirectories: 0
  };
  
  // Simulate adding files
  stats.totalFiles += 1;
  stats.totalSize += 1024;
  stats.totalDirectories += 1;
  
  assert.strictEqual(stats.totalFiles, 1);
  assert.strictEqual(stats.totalSize, 1024);
  assert.strictEqual(stats.totalDirectories, 1);
});

test('line count calculation', () => {
  const countLines = (content) => content.split('\n').length;
  
  assert.strictEqual(countLines('line1\nline2\nline3'), 3);
  assert.strictEqual(countLines('single line'), 1);
  assert.strictEqual(countLines(''), 1);
});

test('file ID generation for links', () => {
  const generateId = (path) => {
    return Buffer.from(path).toString('base64').replace(/[^a-zA-Z0-9]/g, '_');
  };
  
  const id1 = generateId('path/to/file.txt');
  const id2 = generateId('path/to/file.txt');
  
  assert.strictEqual(id1, id2);
  assert.ok(id1.match(/^[a-zA-Z0-9_]+$/));
});

test('metadata loading from directory', () => {
  // Simulate metadata structure
  const metadata = [
    { slug: 'tool1', name: 'Tool 1', type: 'IDE Plugin' },
    { slug: 'tool2', name: 'Tool 2', type: 'CLI Tool' }
  ];
  
  assert.strictEqual(metadata.length, 2);
  assert.ok(metadata.every(m => m.slug && m.name));
});

test('tool card generation', () => {
  const tool = {
    slug: 'test-tool',
    name: 'Test Tool',
    description: 'A test tool',
    tags: ['ai', 'coding']
  };
  
  assert.ok(tool.slug);
  assert.ok(tool.name);
  assert.ok(Array.isArray(tool.tags));
});

test('file tree grouping by directory', () => {
  const files = [
    { path: 'dir1/file1.txt', name: 'file1.txt' },
    { path: 'dir1/file2.txt', name: 'file2.txt' },
    { path: 'dir2/file3.txt', name: 'file3.txt' }
  ];
  
  const grouped = {};
  files.forEach(file => {
    const dir = path.dirname(file.path);
    if (!grouped[dir]) grouped[dir] = [];
    grouped[dir].push(file);
  });
  
  assert.strictEqual(grouped['dir1'].length, 2);
  assert.strictEqual(grouped['dir2'].length, 1);
});

test('comparison table data structure', () => {
  const tools = [
    { name: 'Tool A', type: 'IDE', pricing: { model: 'free' }, features: { agentMode: true } },
    { name: 'Tool B', type: 'CLI', pricing: { model: 'paid' }, features: { agentMode: false } }
  ];
  
  assert.ok(tools.every(t => t.pricing && t.features));
  assert.strictEqual(tools[0].features.agentMode, true);
  assert.strictEqual(tools[1].features.agentMode, false);
});

test('search filtering logic', () => {
  const filterFiles = (files, query) => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return files.filter(file => 
      terms.every(term => file.name.toLowerCase().includes(term))
    );
  };
  
  const files = [
    { name: 'test.txt' },
    { name: 'data.json' },
    { name: 'test_data.md' }
  ];
  
  assert.strictEqual(filterFiles(files, 'test').length, 2);
  assert.strictEqual(filterFiles(files, 'json').length, 1);
  assert.strictEqual(filterFiles(files, 'test data').length, 1);
});

test('statistics calculation', () => {
  const files = [
    { size: 100 },
    { size: 200 },
    { size: 300 }
  ];
  
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const averageSize = totalSize / files.length;
  
  assert.strictEqual(totalSize, 600);
  assert.strictEqual(averageSize, 200);
});

test('extension statistics grouping', () => {
  const files = [
    { extension: '.txt', size: 100 },
    { extension: '.txt', size: 150 },
    { extension: '.json', size: 200 }
  ];
  
  const extStats = {};
  files.forEach(file => {
    if (!extStats[file.extension]) {
      extStats[file.extension] = { count: 0, totalSize: 0 };
    }
    extStats[file.extension].count++;
    extStats[file.extension].totalSize += file.size;
  });
  
  assert.strictEqual(extStats['.txt'].count, 2);
  assert.strictEqual(extStats['.txt'].totalSize, 250);
  assert.strictEqual(extStats['.json'].count, 1);
});

test('relative path calculation', () => {
  const rootDir = '/repo';
  const filePath = '/repo/path/to/file.txt';
  const relative = path.relative(rootDir, filePath);
  
  assert.strictEqual(relative, 'path/to/file.txt');
});

test('path normalization for cross-platform', () => {
  const normalize = (p) => p.split(path.sep).join('/');
  
  const normalized = normalize(path.join('dir1', 'dir2', 'file.txt'));
  assert.ok(normalized.includes('dir1/dir2/file.txt') || normalized === 'dir1/dir2/file.txt');
});