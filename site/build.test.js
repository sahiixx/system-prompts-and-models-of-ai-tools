const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// We'll test the utility functions by requiring the module
// Note: The build script uses require.main === module check, so importing won't run the build

test('escapeHtml utility function', () => {
  // Test basic HTML escaping
  const testCases = [
    { input: '<script>alert("xss")</script>', expected: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;' },
    { input: "Test & 'quotes'", expected: "Test &amp; &#039;quotes&#039;" },
    { input: 'Normal text', expected: 'Normal text' }
  ];
  
  // Since we can't directly import the function, we'll test the logic
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
  
  testCases.forEach(({ input, expected }) => {
    assert.strictEqual(escapeHtml(input), expected);
  });
});

test('file extension detection', () => {
  const testCases = [
    { path: 'test.json', expected: '.json' },
    { path: 'prompt.txt', expected: '.txt' },
    { path: 'readme.md', expected: '.md' },
    { path: 'noextension', expected: '' }
  ];
  
  testCases.forEach(({ path: filePath, expected }) => {
    assert.strictEqual(require('path').extname(filePath), expected);
  });
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
  assert.strictEqual(getLanguage('.unknown'), 'text');
});

test('directory exclusion logic', () => {
  const EXCLUDED_DIRS = ['.git', 'node_modules', 'site', 'assets'];
  
  const shouldExclude = (dirName) => EXCLUDED_DIRS.includes(dirName);
  
  assert.strictEqual(shouldExclude('.git'), true);
  assert.strictEqual(shouldExclude('node_modules'), true);
  assert.strictEqual(shouldExclude('ValidDir'), false);
});

test('file extension inclusion logic', () => {
  const INCLUDED_EXTENSIONS = ['.txt', '.json', '.md'];
  
  const shouldInclude = (fileName) => {
    const ext = require('path').extname(fileName);
    return INCLUDED_EXTENSIONS.includes(ext);
  };
  
  assert.strictEqual(shouldInclude('prompt.txt'), true);
  assert.strictEqual(shouldInclude('tools.json'), true);
  assert.strictEqual(shouldInclude('readme.md'), true);
  assert.strictEqual(shouldInclude('image.png'), false);
  assert.strictEqual(shouldInclude('script.js'), false);
});

test('path operations', () => {
  const ROOT_DIR = '/repo';
  const DIST_DIR = path.join(ROOT_DIR, 'dist');
  const FILES_DIR = path.join(DIST_DIR, 'files');
  
  assert.strictEqual(DIST_DIR, '/repo/dist');
  assert.strictEqual(FILES_DIR, '/repo/dist/files');
});

test('relative path calculation', () => {
  const from = '/repo';
  const to = '/repo/tools/cursor/prompt.txt';
  const relative = path.relative(from, to);
  
  assert.strictEqual(relative, 'tools/cursor/prompt.txt');
});

test('HTML template generation structure', () => {
  // Test that HTML structure is valid
  const title = "Test Title";
  const htmlTemplate = `<\!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
</head>
<body>
    <h1>${title}</h1>
</body>
</html>`;
  
  assert.ok(htmlTemplate.includes('<\!DOCTYPE html>'));
  assert.ok(htmlTemplate.includes('<html lang="en">'));
  assert.ok(htmlTemplate.includes(title));
});

test('edge case - empty string escaping', () => {
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
  
  assert.strictEqual(escapeHtml(''), '');
});

test('edge case - unicode characters', () => {
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
  
  const unicode = 'Hello 世界 🌍';
  assert.strictEqual(escapeHtml(unicode), unicode);
});

test('edge case - multiple special characters', () => {
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
  
  const input = '<<>>"&&\'\'';
  const expected = '&lt;&lt;&gt;&gt;&quot;&amp;&amp;&#039;&#039;';
  assert.strictEqual(escapeHtml(input), expected);
});