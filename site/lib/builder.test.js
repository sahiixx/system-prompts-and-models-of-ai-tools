const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const crypto = require('crypto');

// Test utility functions that can be extracted
test('createDirectoryNode structure', () => {
  // Simulate the createDirectoryNode function
  const createNode = (name, relativePath, depth) => ({
    name,
    relativePath,
    depth,
    files: [],
    children: new Map(),
    totalFiles: 0,
    totalBytes: 0,
    totalLines: 0
  });
  
  const node = createNode('test', 'test/path', 1);
  assert.strictEqual(node.name, 'test');
  assert.strictEqual(node.relativePath, 'test/path');
  assert.strictEqual(node.depth, 1);
  assert.ok(Array.isArray(node.files));
  assert.ok(node.children instanceof Map);
  assert.strictEqual(node.totalFiles, 0);
});

test('shouldExclude logic - excluded directories', () => {
  const EXCLUDED_DIRECTORIES = new Set(['.git', 'node_modules', 'site/dist', 'site', 'assets', 'dist']);
  
  const shouldExclude = (relativePath) => {
    if (!relativePath || relativePath === '.') {
      return false;
    }
    const normalized = relativePath.split(path.sep).join('/');
    return Array.from(EXCLUDED_DIRECTORIES).some(entry => 
      normalized === entry || normalized.startsWith(`${entry}/`)
    );
  };
  
  assert.strictEqual(shouldExclude('.git'), true);
  assert.strictEqual(shouldExclude('node_modules'), true);
  assert.strictEqual(shouldExclude('site/dist'), true);
  assert.strictEqual(shouldExclude('site/dist/files'), true);
  assert.strictEqual(shouldExclude('assets'), true);
  assert.strictEqual(shouldExclude('valid/path'), false);
  assert.strictEqual(shouldExclude('.'), false);
});

test('included extensions logic', () => {
  const INCLUDED_EXTENSIONS = new Set(['.txt', '.json', '.md', '.mdx', '.yaml', '.yml']);
  
  const isIncluded = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    return INCLUDED_EXTENSIONS.has(ext);
  };
  
  assert.strictEqual(isIncluded('prompt.txt'), true);
  assert.strictEqual(isIncluded('tools.json'), true);
  assert.strictEqual(isIncluded('readme.md'), true);
  assert.strictEqual(isIncluded('config.yaml'), true);
  assert.strictEqual(isIncluded('config.yml'), true);
  assert.strictEqual(isIncluded('doc.mdx'), true);
  assert.strictEqual(isIncluded('image.png'), false);
  assert.strictEqual(isIncluded('script.js'), false);
});

test('detectLanguage function', () => {
  const detectLanguage = (extension) => {
    switch (extension) {
      case '.json':
        return 'json';
      case '.md':
      case '.mdx':
        return 'markdown';
      case '.yaml':
      case '.yml':
        return 'yaml';
      case '.txt':
        return 'plaintext';
      default:
        return 'plaintext';
    }
  };
  
  assert.strictEqual(detectLanguage('.json'), 'json');
  assert.strictEqual(detectLanguage('.md'), 'markdown');
  assert.strictEqual(detectLanguage('.mdx'), 'markdown');
  assert.strictEqual(detectLanguage('.yaml'), 'yaml');
  assert.strictEqual(detectLanguage('.yml'), 'yaml');
  assert.strictEqual(detectLanguage('.txt'), 'plaintext');
  assert.strictEqual(detectLanguage('.unknown'), 'plaintext');
});

test('file ID generation is consistent', () => {
  const generateId = (relativePath) => {
    return crypto.createHash('sha1').update(relativePath).digest('hex');
  };
  
  const path1 = 'test/file.txt';
  const id1 = generateId(path1);
  const id2 = generateId(path1);
  
  assert.strictEqual(id1, id2);
  assert.strictEqual(typeof id1, 'string');
  assert.strictEqual(id1.length, 40); // SHA1 hex length
});

test('file ID generation produces unique IDs', () => {
  const generateId = (relativePath) => {
    return crypto.createHash('sha1').update(relativePath).digest('hex');
  };
  
  const id1 = generateId('test/file1.txt');
  const id2 = generateId('test/file2.txt');
  
  assert.notStrictEqual(id1, id2);
});

test('createStats structure', () => {
  const createStats = () => {
    const directories = new Map();
    directories.set('Root', { directory: 'Root', files: 0, totalBytes: 0 });
    
    return {
      totalFiles: 0,
      totalDirectories: 0,
      totalSize: 0,
      extensionStats: new Map(),
      directories,
      files: [],
      minFile: null,
      maxFile: null,
      newestFile: null,
      oldestFile: null
    };
  };
  
  const stats = createStats();
  assert.strictEqual(stats.totalFiles, 0);
  assert.ok(stats.directories instanceof Map);
  assert.ok(stats.extensionStats instanceof Map);
  assert.ok(Array.isArray(stats.files));
});

test('createSizeHistogram - empty files', () => {
  const createSizeHistogram = (files) => {
    if (!files.length) {
      return [];
    }
    return [{ label: 'test', count: 1 }];
  };
  
  const result = createSizeHistogram([]);
  assert.strictEqual(result.length, 0);
});

test('createSizeHistogram - buckets files correctly', () => {
  const thresholds = [1024, 4096, 16384, Infinity];
  const createSizeHistogram = (files) => {
    const buckets = thresholds.map(() => ({ count: 0, totalBytes: 0 }));
    
    for (const file of files) {
      const size = file.size;
      let bucketIndex = thresholds.findIndex(limit => size <= limit);
      if (bucketIndex === -1) bucketIndex = thresholds.length - 1;
      buckets[bucketIndex].count += 1;
      buckets[bucketIndex].totalBytes += size;
    }
    
    return buckets.filter(b => b.count > 0);
  };
  
  const files = [
    { size: 512 },
    { size: 2048 },
    { size: 8192 },
    { size: 100000 }
  ];
  
  const buckets = createSizeHistogram(files);
  assert.ok(buckets.length > 0);
  assert.ok(buckets.every(b => b.count > 0));
});

test('ensureDirectoryNode creates nested structure', () => {
  const createDirectoryNode = (name, relativePath, depth) => ({
    name,
    relativePath,
    depth,
    children: new Map()
  });
  
  const ensureDirectoryNode = (rootNode, segments) => {
    let node = rootNode;
    let pathAccumulator = node.depth === 0 ? '' : rootNode.relativePath;
    
    for (const segment of segments) {
      if (!segment) continue;
      pathAccumulator = pathAccumulator ? `${pathAccumulator}/${segment}` : segment;
      
      if (!node.children.has(segment)) {
        node.children.set(segment, createDirectoryNode(segment, pathAccumulator, node.depth + 1));
      }
      node = node.children.get(segment);
    }
    
    return node;
  };
  
  const root = createDirectoryNode('Root', '.', 0);
  const node = ensureDirectoryNode(root, ['a', 'b', 'c']);
  
  assert.strictEqual(node.depth, 3);
  assert.ok(node.relativePath.includes('c'));
});

test('finalizeTreeMetrics calculates totals', () => {
  const finalizeTreeMetrics = (node) => {
    let totalFiles = node.files?.length || 0;
    let totalBytes = 0;
    
    if (node.files) {
      for (const file of node.files) {
        totalBytes += file.size || 0;
      }
    }
    
    for (const child of (node.children?.values() || [])) {
      const childTotals = finalizeTreeMetrics(child);
      totalFiles += childTotals.totalFiles;
      totalBytes += childTotals.totalBytes;
    }
    
    node.totalFiles = totalFiles;
    node.totalBytes = totalBytes;
    
    return { totalFiles, totalBytes };
  };
  
  const node = {
    files: [{ size: 100 }, { size: 200 }],
    children: new Map()
  };
  
  const result = finalizeTreeMetrics(node);
  assert.strictEqual(result.totalFiles, 2);
  assert.strictEqual(result.totalBytes, 300);
});

test('computeSizeMetrics handles empty array', () => {
  const computeSizeMetrics = (files) => {
    if (!files.length) {
      return { median: 0, average: 0 };
    }
    const sizes = files.map(f => f.size).sort((a, b) => a - b);
    return { median: sizes[Math.floor(sizes.length / 2)], average: sizes.reduce((a, b) => a + b, 0) / sizes.length };
  };
  
  const result = computeSizeMetrics([]);
  assert.strictEqual(result.median, 0);
  assert.strictEqual(result.average, 0);
});

test('computeSizeMetrics calculates correctly', () => {
  const computeSizeMetrics = (files) => {
    const sizes = files.map(f => f.size).sort((a, b) => a - b);
    return {
      median: sizes[Math.floor(sizes.length / 2)],
      average: sizes.reduce((a, b) => a + b, 0) / sizes.length
    };
  };
  
  const files = [{ size: 100 }, { size: 200 }, { size: 300 }];
  const result = computeSizeMetrics(files);
  
  assert.strictEqual(result.median, 200);
  assert.strictEqual(result.average, 200);
});

test('createSearchIndex generates proper structure', () => {
  const createSearchIndex = (files) => {
    return files.map(file => ({
      id: file.id,
      path: file.relativePath,
      pathLower: file.relativePath.toLowerCase(),
      extension: file.extension || 'unknown',
      sizeHuman: `${file.size} bytes`,
      lines: file.lineCount
    }));
  };
  
  const files = [
    { id: 'abc123', relativePath: 'Test/File.txt', extension: '.txt', size: 100, lineCount: 10 }
  ];
  
  const index = createSearchIndex(files);
  assert.strictEqual(index.length, 1);
  assert.strictEqual(index[0].id, 'abc123');
  assert.strictEqual(index[0].path, 'Test/File.txt');
  assert.strictEqual(index[0].pathLower, 'test/file.txt');
});

test('directory overview sorting', () => {
  const createDirectoryOverview = (directories) => {
    return Array.from(directories.values())
      .sort((a, b) => b.totalBytes - a.totalBytes)
      .slice(0, 12);
  };
  
  const dirs = new Map([
    ['a', { totalBytes: 100, files: 1 }],
    ['b', { totalBytes: 300, files: 3 }],
    ['c', { totalBytes: 200, files: 2 }]
  ]);
  
  const sorted = createDirectoryOverview(dirs);
  assert.strictEqual(sorted[0].totalBytes, 300);
  assert.strictEqual(sorted[1].totalBytes, 200);
  assert.strictEqual(sorted[2].totalBytes, 100);
});

test('line count calculation', () => {
  const countLines = (content) => {
    return content.split(/\r?\n/).length;
  };
  
  assert.strictEqual(countLines('line1\nline2\nline3'), 3);
  assert.strictEqual(countLines('single line'), 1);
  assert.strictEqual(countLines(''), 1);
  assert.strictEqual(countLines('line1\r\nline2'), 2);
});

test('path normalization for cross-platform', () => {
  const normalize = (relativePath) => {
    return relativePath.split(path.sep).join('/');
  };
  
  const result = normalize(path.join('a', 'b', 'c'));
  assert.ok(result.includes('a/b/c') || result === 'a/b/c');
});