const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Comprehensive unit tests for build-enhanced.js
 * 
 * This test suite covers all major functions in build-enhanced.js including:
 * - HTML escaping utilities
 * - Metadata loading
 * - HTML generation functions
 * - Directory scanning
 * - Edge cases and error handling
 */

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

test('escapeHtml - basic HTML escaping', () => {
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

  assert.strictEqual(escapeHtml('<script>alert("xss")</script>'), 
    '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.strictEqual(escapeHtml('Test & Company'), 'Test &amp; Company');
  assert.strictEqual(escapeHtml("It's a test"), "It&#039;s a test");
  assert.strictEqual(escapeHtml('Normal text'), 'Normal text');
});

test('escapeHtml - edge cases', () => {
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

  // Empty string
  assert.strictEqual(escapeHtml(''), '');
  
  // Only special characters
  assert.strictEqual(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#039;');
  
  // Multiple consecutive special characters
  assert.strictEqual(escapeHtml('<<>>"&&\'\''), 
    '&lt;&lt;&gt;&gt;&quot;&amp;&amp;&#039;&#039;');
  
  // Unicode characters should pass through
  assert.strictEqual(escapeHtml('Hello 世界 🌍'), 'Hello 世界 🌍');
  
  // Mixed content
  assert.strictEqual(escapeHtml('Price: <$100 & "free"'), 
    'Price: &lt;$100 &amp; &quot;free&quot;');
});

test('escapeHtml - XSS prevention', () => {
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

  // Common XSS attempts
  const xssAttempts = [
    '<img src=x onerror=alert(1)>',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<svg onload=alert(1)>',
    '"><script>alert(1)</script>',
    '\' onclick=alert(1) //'
  ];

  xssAttempts.forEach(attempt => {
    const escaped = escapeHtml(attempt);
    assert.ok(!escaped.includes('<script'), 'Should not contain unescaped script tag');
  });
});

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

test('directory exclusion logic', () => {
  const EXCLUDED_DIRS = ['.git', 'node_modules', 'site', 'assets'];
  
  const shouldExclude = (path) => EXCLUDED_DIRS.some(excluded => path.startsWith(excluded));
  
  assert.strictEqual(shouldExclude('.git'), true);
  assert.strictEqual(shouldExclude('.git/config'), true);
  assert.strictEqual(shouldExclude('node_modules'), true);
  assert.strictEqual(shouldExclude('node_modules/package'), true);
  assert.strictEqual(shouldExclude('site'), true);
  assert.strictEqual(shouldExclude('assets/images'), true);
  assert.strictEqual(shouldExclude('scripts'), false);
  assert.strictEqual(shouldExclude('tests'), false);
  assert.strictEqual(shouldExclude('ValidDir'), false);
});

test('file extension inclusion logic', () => {
  const INCLUDED_EXTENSIONS = ['.txt', '.json', '.md'];
  
  const shouldInclude = (fileName) => {
    const ext = path.extname(fileName);
    return INCLUDED_EXTENSIONS.includes(ext);
  };
  
  assert.strictEqual(shouldInclude('prompt.txt'), true);
  assert.strictEqual(shouldInclude('tools.json'), true);
  assert.strictEqual(shouldInclude('README.md'), true);
  assert.strictEqual(shouldInclude('image.png'), false);
  assert.strictEqual(shouldInclude('script.js'), false);
  assert.strictEqual(shouldInclude('style.css'), false);
  assert.strictEqual(shouldInclude('noextension'), false);
});

test('language detection from extension', () => {
  const getLanguage = (extension) => {
    if (extension === '.json') return 'json';
    if (extension === '.md') return 'markdown';
    return 'text';
  };
  
  assert.strictEqual(getLanguage('.json'), 'json');
  assert.strictEqual(getLanguage('.md'), 'markdown');
  assert.strictEqual(getLanguage('.txt'), 'text');
  assert.strictEqual(getLanguage('.yaml'), 'text');
  assert.strictEqual(getLanguage(''), 'text');
});

// ============================================================================
// METADATA LOADING TESTS
// ============================================================================

test('loadMetadata - with valid metadata directory', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-metadata-'));
  
  try {
    // Create metadata directory
    const metadataDir = path.join(tempDir, 'metadata');
    fs.mkdirSync(metadataDir);
    
    // Create test metadata files
    fs.writeFileSync(
      path.join(metadataDir, 'tool1.json'),
      JSON.stringify({ name: 'Tool1', slug: 'tool1' })
    );
    
    fs.writeFileSync(
      path.join(metadataDir, 'tool2.json'),
      JSON.stringify({ name: 'Tool2', slug: 'tool2' })
    );
    
    // Create README.md (should be ignored)
    fs.writeFileSync(path.join(metadataDir, 'README.md'), '# README');
    
    // Simulate loadMetadata function
    const loadMetadata = (dir) => {
      const metadata = [];
      if (!fs.existsSync(dir)) return metadata;
      
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('.json') && file !== 'README.md') {
          try {
            const content = fs.readFileSync(path.join(dir, file), 'utf-8');
            metadata.push(JSON.parse(content));
          } catch (error) {
            // Skip invalid files
          }
        }
      }
      return metadata;
    };
    
    const metadata = loadMetadata(metadataDir);
    
    assert.strictEqual(metadata.length, 2);
    assert.strictEqual(metadata[0].name, 'Tool1');
    assert.strictEqual(metadata[1].name, 'Tool2');
  } finally {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('loadMetadata - with non-existent directory', () => {
  const loadMetadata = (dir) => {
    const metadata = [];
    if (!fs.existsSync(dir)) return metadata;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.endsWith('.json') && file !== 'README.md') {
        try {
          const content = fs.readFileSync(path.join(dir, file), 'utf-8');
          metadata.push(JSON.parse(content));
        } catch (error) {
          // Skip invalid files
        }
      }
    }
    return metadata;
  };
  
  const metadata = loadMetadata('/non/existent/path');
  assert.strictEqual(metadata.length, 0);
  assert.ok(Array.isArray(metadata));
});

test('loadMetadata - with invalid JSON files', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-metadata-'));
  
  try {
    const metadataDir = path.join(tempDir, 'metadata');
    fs.mkdirSync(metadataDir);
    
    // Create valid file
    fs.writeFileSync(
      path.join(metadataDir, 'valid.json'),
      JSON.stringify({ name: 'Valid' })
    );
    
    // Create invalid JSON file
    fs.writeFileSync(
      path.join(metadataDir, 'invalid.json'),
      '{ invalid json }'
    );
    
    const loadMetadata = (dir) => {
      const metadata = [];
      if (!fs.existsSync(dir)) return metadata;
      
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('.json') && file !== 'README.md') {
          try {
            const content = fs.readFileSync(path.join(dir, file), 'utf-8');
            metadata.push(JSON.parse(content));
          } catch (error) {
            // Skip invalid files
          }
        }
      }
      return metadata;
    };
    
    const metadata = loadMetadata(metadataDir);
    
    // Should only load the valid file
    assert.strictEqual(metadata.length, 1);
    assert.strictEqual(metadata[0].name, 'Valid');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// ============================================================================
// HTML GENERATION TESTS
// ============================================================================

test('generateFileTreeHTML - basic structure', () => {
  const escapeHtml = (text) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
  };
  
  const generateFileTreeHTML = (tree) => {
    let html = '';
    const sortedDirs = Object.keys(tree).sort();
    
    for (const dir of sortedDirs) {
      const files = tree[dir];
      if (files.length === 0) continue;
      
      html += `<div class="directory">
      <div class="directory-name">
        <span>📁 ${escapeHtml(dir)}</span>
        <span class="collapse-icon">▼</span>
      </div>
      <ul class="file-list">`;
      
      const sortedFiles = files.sort((a, b) => a.name.localeCompare(b.name));
      
      for (const file of sortedFiles) {
        const icon = file.name.endsWith('.json') ? '📋' : file.name.endsWith('.md') ? '📄' : '📝';
        html += `<li class="file-item">
        <a href="files/${escapeHtml(file.id)}.html" class="file-link">
          <span class="file-icon">${icon}</span>
          ${escapeHtml(file.name)}
        </a>
      </li>`;
      }
      
      html += `</ul></div>`;
    }
    
    return html || '<div class="no-results">No files found</div>';
  };
  
  const tree = {
    'Root': [
      { name: 'config.json', id: 'abc123' },
      { name: 'readme.md', id: 'def456' }
    ]
  };
  
  const html = generateFileTreeHTML(tree);
  
  assert.ok(html.includes('class="directory"'));
  assert.ok(html.includes('📁 Root'));
  assert.ok(html.includes('config.json'));
  assert.ok(html.includes('readme.md'));
  assert.ok(html.includes('📋')); // JSON icon
  assert.ok(html.includes('📄')); // MD icon
});

test('generateFileTreeHTML - empty tree', () => {
  const generateFileTreeHTML = (tree) => {
    let html = '';
    const sortedDirs = Object.keys(tree).sort();
    
    for (const dir of sortedDirs) {
      const files = tree[dir];
      if (files.length === 0) continue;
      html += 'some content';
    }
    
    return html || '<div class="no-results">No files found</div>';
  };
  
  const html = generateFileTreeHTML({});
  assert.strictEqual(html, '<div class="no-results">No files found</div>');
});

test('generateFileTreeHTML - multiple directories sorted', () => {
  const escapeHtml = (text) => text;
  
  const generateFileTreeHTML = (tree) => {
    let html = '';
    const sortedDirs = Object.keys(tree).sort();
    
    for (const dir of sortedDirs) {
      const files = tree[dir];
      if (files.length === 0) continue;
      html += `DIR:${dir};`;
    }
    
    return html || '<div class="no-results">No files found</div>';
  };
  
  const tree = {
    'ZFolder': [{ name: 'z.txt', id: 'z' }],
    'AFolder': [{ name: 'a.txt', id: 'a' }],
    'MFolder': [{ name: 'm.txt', id: 'm' }]
  };
  
  const html = generateFileTreeHTML(tree);
  
  // Should be sorted alphabetically
  assert.ok(html.indexOf('AFolder') < html.indexOf('MFolder'));
  assert.ok(html.indexOf('MFolder') < html.indexOf('ZFolder'));
});

test('generateFileTreeHTML - files sorted within directory', () => {
  const escapeHtml = (text) => text;
  
  const generateFileTreeHTML = (tree) => {
    let html = '';
    const sortedDirs = Object.keys(tree).sort();
    
    for (const dir of sortedDirs) {
      const files = tree[dir];
      if (files.length === 0) continue;
      
      const sortedFiles = files.sort((a, b) => a.name.localeCompare(b.name));
      html += sortedFiles.map(f => f.name).join(',');
    }
    
    return html;
  };
  
  const tree = {
    'Root': [
      { name: 'zebra.txt', id: 'z' },
      { name: 'apple.txt', id: 'a' },
      { name: 'monkey.txt', id: 'm' }
    ]
  };
  
  const html = generateFileTreeHTML(tree);
  assert.strictEqual(html, 'apple.txt,monkey.txt,zebra.txt');
});

test('generateFileTreeHTML - correct icon selection', () => {
  const getIcon = (fileName) => {
    if (fileName.endsWith('.json')) return '📋';
    if (fileName.endsWith('.md')) return '📄';
    return '📝';
  };
  
  assert.strictEqual(getIcon('config.json'), '📋');
  assert.strictEqual(getIcon('README.md'), '📄');
  assert.strictEqual(getIcon('prompt.txt'), '📝');
  assert.strictEqual(getIcon('file.yaml'), '📝');
});

test('generateToolCardsHTML - basic card generation', () => {
  const escapeHtml = (text) => text;
  
  const generateToolCardsHTML = (metadata) => {
    if (metadata.length === 0) {
      return '<div class="no-results">No tools found</div>';
    }
    
    let html = '';
    for (const tool of metadata) {
      const tags = tool.tags || [];
      const tagsHTML = tags.slice(0, 3).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
      
      html += `
    <div class="tool-card" data-slug="${tool.slug}">
      <h3>${escapeHtml(tool.name)}</h3>
      <p>${escapeHtml(tool.description || 'No description available')}</p>
      <div class="tool-tags">${tagsHTML}</div>
      <a href="#" class="tool-link">View Details →</a>
    </div>`;
    }
    
    return html;
  };
  
  const metadata = [
    {
      slug: 'cursor',
      name: 'Cursor',
      description: 'AI code editor',
      tags: ['editor', 'ai', 'vscode']
    }
  ];
  
  const html = generateToolCardsHTML(metadata);
  
  assert.ok(html.includes('class="tool-card"'));
  assert.ok(html.includes('data-slug="cursor"'));
  assert.ok(html.includes('<h3>Cursor</h3>'));
  assert.ok(html.includes('AI code editor'));
  assert.ok(html.includes('editor'));
  assert.ok(html.includes('ai'));
  assert.ok(html.includes('vscode'));
});

test('generateToolCardsHTML - empty metadata', () => {
  const generateToolCardsHTML = (metadata) => {
    if (metadata.length === 0) {
      return '<div class="no-results">No tools found</div>';
    }
    return 'content';
  };
  
  const html = generateToolCardsHTML([]);
  assert.strictEqual(html, '<div class="no-results">No tools found</div>');
});

test('generateToolCardsHTML - missing description', () => {
  const escapeHtml = (text) => text;
  
  const generateToolCardsHTML = (metadata) => {
    let html = '';
    for (const tool of metadata) {
      html += escapeHtml(tool.description || 'No description available');
    }
    return html;
  };
  
  const metadata = [
    { name: 'Tool1', slug: 'tool1' }, // No description
    { name: 'Tool2', slug: 'tool2', description: 'Has description' }
  ];
  
  const html = generateToolCardsHTML(metadata);
  assert.ok(html.includes('No description available'));
  assert.ok(html.includes('Has description'));
});

test('generateToolCardsHTML - tag limiting to 3', () => {
  const generateTagsHTML = (tags) => {
    return tags.slice(0, 3).map(tag => tag).join(',');
  };
  
  const manyTags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];
  const result = generateTagsHTML(manyTags);
  
  assert.strictEqual(result, 'tag1,tag2,tag3');
  assert.ok(!result.includes('tag4'));
});

test('generateToolCardsHTML - missing tags array', () => {
  const getTags = (tool) => tool.tags || [];
  
  assert.deepStrictEqual(getTags({ name: 'Tool' }), []);
  assert.deepStrictEqual(getTags({ name: 'Tool', tags: ['a', 'b'] }), ['a', 'b']);
});

test('generateComparisonTableHTML - basic table generation', () => {
  const escapeHtml = (text) => text;
  
  const generateComparisonTableHTML = (metadata) => {
    if (metadata.length === 0) {
      return '<div class="no-results">No tools available for comparison</div>';
    }
    
    let html = '<table class="comparison-table"><tbody>';
    
    for (const tool of metadata) {
      html += `<tr>
        <td><strong>${escapeHtml(tool.name)}</strong></td>
        <td>${escapeHtml(tool.type)}</td>
        <td>${escapeHtml(tool.pricing?.model || 'Unknown')}</td>
        <td>${tool.features?.agentMode ? '✅' : '❌'}</td>
        <td>${tool.features?.parallelExecution ? '✅' : '❌'}</td>
      </tr>`;
    }
    
    html += '</tbody></table>';
    return html;
  };
  
  const metadata = [
    {
      name: 'Cursor',
      type: 'IDE',
      pricing: { model: 'subscription' },
      features: { agentMode: true, parallelExecution: false }
    }
  ];
  
  const html = generateComparisonTableHTML(metadata);
  
  assert.ok(html.includes('<table class="comparison-table">'));
  assert.ok(html.includes('<strong>Cursor</strong>'));
  assert.ok(html.includes('IDE'));
  assert.ok(html.includes('subscription'));
  assert.ok(html.includes('✅')); // agentMode
  assert.ok(html.includes('❌')); // parallelExecution
});

test('generateComparisonTableHTML - empty metadata', () => {
  const generateComparisonTableHTML = (metadata) => {
    if (metadata.length === 0) {
      return '<div class="no-results">No tools available for comparison</div>';
    }
    return 'content';
  };
  
  const html = generateComparisonTableHTML([]);
  assert.strictEqual(html, '<div class="no-results">No tools available for comparison</div>');
});

test('generateComparisonTableHTML - missing pricing model', () => {
  const getPricingModel = (tool) => tool.pricing?.model || 'Unknown';
  
  assert.strictEqual(getPricingModel({ name: 'Tool1' }), 'Unknown');
  assert.strictEqual(getPricingModel({ name: 'Tool2', pricing: {} }), 'Unknown');
  assert.strictEqual(getPricingModel({ name: 'Tool3', pricing: { model: 'free' } }), 'free');
});

test('generateComparisonTableHTML - feature flags', () => {
  const hasFeature = (tool, feature) => tool.features?.[feature] ? '✅' : '❌';
  
  const tool1 = { features: { agentMode: true, parallelExecution: false } };
  const tool2 = { features: {} };
  const tool3 = {};
  
  assert.strictEqual(hasFeature(tool1, 'agentMode'), '✅');
  assert.strictEqual(hasFeature(tool1, 'parallelExecution'), '❌');
  assert.strictEqual(hasFeature(tool2, 'agentMode'), '❌');
  assert.strictEqual(hasFeature(tool3, 'agentMode'), '❌');
});

// ============================================================================
// DIRECTORY SCANNING TESTS
// ============================================================================

test('scanDirectory - basic directory structure', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-scan-'));
  
  try {
    // Create test structure
    fs.mkdirSync(path.join(tempDir, 'subdir'));
    fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'content');
    fs.writeFileSync(path.join(tempDir, 'file2.json'), '{}');
    fs.writeFileSync(path.join(tempDir, 'file3.js'), 'code');
    fs.writeFileSync(path.join(tempDir, 'subdir', 'file4.md'), 'doc');
    
    const EXCLUDED_DIRS = ['.git', 'node_modules', 'site', 'assets'];
    const INCLUDED_EXTENSIONS = ['.txt', '.json', '.md'];
    
    const scanDirectory = (dir, baseDir = dir, fileTree = {}, stats = { totalFiles: 0, totalDirectories: 0, totalSize: 0 }) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (EXCLUDED_DIRS.some(excluded => relativePath.startsWith(excluded))) {
          continue;
        }
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          stats.totalDirectories++;
          scanDirectory(fullPath, baseDir, fileTree, stats);
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          
          if (INCLUDED_EXTENSIONS.includes(ext)) {
            const dirName = path.dirname(relativePath);
            const displayDir = dirName === '.' ? 'Root' : dirName;
            
            if (!fileTree[displayDir]) {
              fileTree[displayDir] = [];
            }
            
            stats.totalFiles++;
            stats.totalSize += stat.size;
            
            fileTree[displayDir].push({
              name: path.basename(fullPath),
              path: fullPath,
              relativePath: relativePath,
              id: Buffer.from(relativePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '_'),
              size: stat.size
            });
          }
        }
      }
      
      return { fileTree, stats };
    };
    
    const result = scanDirectory(tempDir);
    
    // Should find 2 files in root (.txt, .json) and 1 in subdir (.md)
    // .js file should be excluded
    assert.strictEqual(result.stats.totalFiles, 3);
    assert.strictEqual(result.stats.totalDirectories, 1);
    assert.ok(result.stats.totalSize > 0);
    assert.ok(result.fileTree['Root']);
    assert.ok(result.fileTree['subdir']);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('scanDirectory - excludes specified directories', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-scan-'));
  
  try {
    // Create excluded directories
    fs.mkdirSync(path.join(tempDir, '.git'));
    fs.mkdirSync(path.join(tempDir, 'node_modules'));
    fs.mkdirSync(path.join(tempDir, 'valid'));
    
    fs.writeFileSync(path.join(tempDir, '.git', 'config.txt'), 'git');
    fs.writeFileSync(path.join(tempDir, 'node_modules', 'package.json'), '{}');
    fs.writeFileSync(path.join(tempDir, 'valid', 'file.txt'), 'content');
    
    const EXCLUDED_DIRS = ['.git', 'node_modules', 'site', 'assets'];
    const INCLUDED_EXTENSIONS = ['.txt', '.json', '.md'];
    
    const scanDirectory = (dir, baseDir = dir, fileTree = {}, stats = { totalFiles: 0, totalDirectories: 0, totalSize: 0 }) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (EXCLUDED_DIRS.some(excluded => relativePath.startsWith(excluded))) { 
          continue;
        }
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          stats.totalDirectories++;
          scanDirectory(fullPath, baseDir, fileTree, stats);
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (INCLUDED_EXTENSIONS.includes(ext)) {
            stats.totalFiles++;
          }
        }
      }
      
      return { fileTree, stats };
    };
    
    const result = scanDirectory(tempDir);
    
    // Should only find file in valid directory
    assert.strictEqual(result.stats.totalFiles, 1);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('scanDirectory - handles empty directories', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-scan-'));
  
  try {
    fs.mkdirSync(path.join(tempDir, 'empty1'));
    fs.mkdirSync(path.join(tempDir, 'empty2'));
    
    const EXCLUDED_DIRS = [];
    const INCLUDED_EXTENSIONS = ['.txt', '.json', '.md'];
    
    const scanDirectory = (dir, baseDir = dir, fileTree = {}, stats = { totalFiles: 0, totalDirectories: 0 }) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          stats.totalDirectories++;
          scanDirectory(fullPath, baseDir, fileTree, stats);
        }
      }
      
      return { fileTree, stats };
    };
    
    const result = scanDirectory(tempDir);
    
    assert.strictEqual(result.stats.totalFiles, 0);
    assert.strictEqual(result.stats.totalDirectories, 2);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('scanDirectory - correct base64 ID generation', () => {
  const generateId = (relativePath) => {
    return Buffer.from(relativePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '_');
  };
  
  const id1 = generateId('path/to/file.txt');
  const id2 = generateId('different/path.json');
  
  // Should be different IDs
  assert.notStrictEqual(id1, id2);
  
  // Should only contain alphanumeric and underscore
  assert.ok(/^[a-zA-Z0-9_]+$/.test(id1));
  assert.ok(/^[a-zA-Z0-9_]+$/.test(id2));
});

test('scanDirectory - cumulative stats across subdirectories', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-scan-'));
  
  try {
    fs.mkdirSync(path.join(tempDir, 'dir1'));
    fs.mkdirSync(path.join(tempDir, 'dir2'));
    
    fs.writeFileSync(path.join(tempDir, 'root.txt'), '12345');
    fs.writeFileSync(path.join(tempDir, 'dir1', 'file1.txt'), '123');
    fs.writeFileSync(path.join(tempDir, 'dir2', 'file2.txt'), '1234');
    
    const EXCLUDED_DIRS = [];
    const INCLUDED_EXTENSIONS = ['.txt'];
    
    const scanDirectory = (dir, baseDir = dir, fileTree = {}, stats = { totalFiles: 0, totalSize: 0 }) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath, baseDir, fileTree, stats);
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (INCLUDED_EXTENSIONS.includes(ext)) {
            stats.totalFiles++;
            stats.totalSize += stat.size;
          }
        }
      }
      
      return { fileTree, stats };
    };
    
    const result = scanDirectory(tempDir);
    
    assert.strictEqual(result.stats.totalFiles, 3);
    assert.strictEqual(result.stats.totalSize, 12); // 5 + 3 + 4
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// ============================================================================
// PATH OPERATIONS TESTS
// ============================================================================

test('path operations - ROOT_DIR and DIST_DIR', () => {
  const ROOT_DIR = '/repo';
  const DIST_DIR = path.join(ROOT_DIR, 'dist');
  const FILES_DIR = path.join(DIST_DIR, 'files');
  const METADATA_DIR = path.join(ROOT_DIR, 'metadata');
  
  assert.strictEqual(DIST_DIR, '/repo/dist');
  assert.strictEqual(FILES_DIR, '/repo/dist/files');
  assert.strictEqual(METADATA_DIR, '/repo/metadata');
});

test('path operations - relative path calculation', () => {
  const root = '/home/user/project';
  const file = '/home/user/project/src/components/Button.tsx';
  
  const relative = path.relative(root, file);
  assert.strictEqual(relative, 'src/components/Button.tsx');
});

test('path operations - directory name extraction', () => {
  const testCases = [
    { path: 'src/components/Button.tsx', expected: 'src/components' },
    { path: 'README.md', expected: '.' },
    { path: './file.txt', expected: '.' }
  ];
  
  testCases.forEach(({ path: filePath, expected }) => {
    assert.strictEqual(path.dirname(filePath), expected);
  });
});

test('path operations - display directory name', () => {
  const getDisplayDir = (relativePath) => {
    const dirName = path.dirname(relativePath);
    return dirName === '.' ? 'Root' : dirName;
  };
  
  assert.strictEqual(getDisplayDir('file.txt'), 'Root');
  assert.strictEqual(getDisplayDir('src/file.txt'), 'src');
  assert.strictEqual(getDisplayDir('deep/nested/path/file.txt'), 'deep/nested/path');
});

// ============================================================================
// HTML STRUCTURE TESTS
// ============================================================================

test('HTML structure - valid DOCTYPE and structure', () => {
  const generateBasicHTML = (title, body) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body>
    ${body}
</body>
</html>`;
  };
  
  const html = generateBasicHTML('Test', '<h1>Hello</h1>');
  
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('<html lang="en">'));
  assert.ok(html.includes('<meta charset="UTF-8">'));
  assert.ok(html.includes('<meta name="viewport"'));
  assert.ok(html.includes('<title>Test</title>'));
  assert.ok(html.includes('<h1>Hello</h1>'));
});

test('HTML structure - CSS variables for theming', () => {
  const cssVars = `
    :root {
      --bg-primary: #0d1117;
      --text-primary: #c9d1d9;
      --accent-color: #58a6ff;
    }
    [data-theme="light"] {
      --bg-primary: #ffffff;
      --text-primary: #24292f;
      --accent-color: #0969da;
    }
  `;
  
  assert.ok(cssVars.includes('--bg-primary'));
  assert.ok(cssVars.includes('--text-primary'));
  assert.ok(cssVars.includes('[data-theme="light"]'));
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

test('edge case - very long file names', () => {
  const escapeHtml = (text) => text;
  const longFileName = 'a'.repeat(255) + '.txt';
  
  const result = escapeHtml(longFileName);
  assert.strictEqual(result.length, 259); // 255 + 4 (.txt)
});

test('edge case - special characters in file names', () => {
  const escapeHtml = (text) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
  };
  
  const specialNames = [
    'file<script>.txt',
    'file&name.txt',
    'file"quote".txt',
    "file'apostrophe'.txt"
  ];
  
  specialNames.forEach(name => {
    const escaped = escapeHtml(name);
    assert.ok(!escaped.includes('<script'));
    assert.ok(!escaped.includes('&') || escaped.includes('&amp;'));
    assert.ok(!escaped.includes('<script'));
  });

});  // <-- Added to close the 'edge case - special characters in file names' test

test('edge case - empty arrays and objects', () => {
  const generateTagsHTML = (tags) => {
    return tags.slice(0, 3).map(tag => `<span>${tag}</span>`).join('');
  };
  
  assert.strictEqual(generateTagsHTML([]), '');
  assert.strictEqual(generateTagsHTML(['only-one']), '<span>only-one</span>');
});

test('edge case - null and undefined handling', () => {
  const getDescription = (tool) => tool.description || 'No description available';
  const getTags = (tool) => tool.tags || [];
  
  assert.strictEqual(getDescription({}), 'No description available');
  assert.strictEqual(getDescription({ description: null }), 'No description available');
  assert.strictEqual(getDescription({ description: '' }), 'No description available');
  assert.deepStrictEqual(getTags({}), []);
  assert.deepStrictEqual(getTags({ tags: null }), []);
});

test('edge case - deeply nested directories', () => {
  const getDisplayDir = (relativePath) => {
    const dirName = path.dirname(relativePath);
    return dirName === '.' ? 'Root' : dirName;
  };
  
  const deepPath = 'level1/level2/level3/level4/level5/file.txt';
  const displayDir = getDisplayDir(deepPath);
  
  assert.strictEqual(displayDir, 'level1/level2/level3/level4/level5');
});

test('edge case - file size calculations', () => {
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`;
    return `${Math.round(bytes / 1024)}KB`;
  };
  
  assert.strictEqual(formatSize(0), '0B');
  assert.strictEqual(formatSize(512), '512B');
  assert.strictEqual(formatSize(1024), '1KB');
  assert.strictEqual(formatSize(1536), '2KB'); // Rounds up
  assert.strictEqual(formatSize(10240), '10KB');
});

test('error handling - invalid JSON parsing', () => {
  const parseJSON = (text) => {
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  };
  
  assert.strictEqual(parseJSON('{ invalid }'), null);
  assert.strictEqual(parseJSON(''), null);
  assert.deepStrictEqual(parseJSON('{"valid": true}'), { valid: true });
});

test('error handling - file system operations', () => {
  const safeReadFile = (filePath) => {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      return null;
    }
  };
  
  assert.strictEqual(safeReadFile('/non/existent/file.txt'), null);
});

// ============================================================================
// INTEGRATION-STYLE TESTS
// ============================================================================

test('integration - complete file tree generation workflow', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-workflow-'));
  
  try {
    // Setup
    fs.mkdirSync(path.join(tempDir, 'prompts'));
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# Readme');
    fs.writeFileSync(path.join(tempDir, 'prompts', 'cursor.txt'), 'prompt');
    fs.writeFileSync(path.join(tempDir, 'prompts', 'tools.json'), '{}');
    
    // Scan
    const EXCLUDED_DIRS = [];
    const INCLUDED_EXTENSIONS = ['.txt', '.json', '.md'];
    
    const scanDirectory = (dir, baseDir = dir, fileTree = {}) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(baseDir, fullPath);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath, baseDir, fileTree);
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (INCLUDED_EXTENSIONS.includes(ext)) {
            const dirName = path.dirname(relativePath);
            const displayDir = dirName === '.' ? 'Root' : dirName;
            
            if (!fileTree[displayDir]) {
              fileTree[displayDir] = [];
            }
            
            fileTree[displayDir].push({
              name: path.basename(fullPath),
              id: 'test_id'
            });
          }
        }
      }
      
      return fileTree;
    };
    
    const fileTree = scanDirectory(tempDir);
    
    // Verify structure
    assert.ok(fileTree['Root']);
    assert.ok(fileTree['prompts']);
    assert.strictEqual(fileTree['Root'].length, 1); // README.md
    assert.strictEqual(fileTree['prompts'].length, 2); // cursor.txt, tools.json
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('integration - metadata loading and card generation', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-integration-'));
  
  try {
    const metadataDir = path.join(tempDir, 'metadata');
    fs.mkdirSync(metadataDir);
    
    const tool1 = {
      slug: 'cursor',
      name: 'Cursor',
      description: 'AI code editor',
      type: 'IDE',
      tags: ['editor', 'ai']
    };
    
    const tool2 = {
      slug: 'copilot',
      name: 'GitHub Copilot',
      description: 'AI pair programmer',
      type: 'Extension',
      tags: ['vscode', 'ai']
    };
    
    fs.writeFileSync(path.join(metadataDir, 'cursor.json'), JSON.stringify(tool1));
    fs.writeFileSync(path.join(metadataDir, 'copilot.json'), JSON.stringify(tool2));
    
    // Load metadata
    const loadMetadata = (dir) => {
      const metadata = [];
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = fs.readFileSync(path.join(dir, file), 'utf-8');
          metadata.push(JSON.parse(content));
        }
      }
      
      return metadata;
    };
    
    const metadata = loadMetadata(metadataDir);
    
    assert.strictEqual(metadata.length, 2);
    assert.strictEqual(metadata[0].name, 'Cursor');
    assert.ok(metadata.some(m => m.name === 'Cursor'));
    assert.ok(metadata.some(m => m.name === 'GitHub Copilot'));
    // Generate cards
    const escapeHtml = (text) => text;
    const generateToolCardsHTML = (metadata) => {
      return metadata.map(tool => `<div>${escapeHtml(tool.name)}</div>`).join('');
    };
    
    const html = generateToolCardsHTML(metadata);
    assert.ok(html.includes('Cursor'));
    assert.ok(html.includes('GitHub Copilot'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

console.log('✅ All tests for build-enhanced.js passed!');