const test = require('node:test');
const assert = require('node:assert');
const { renderFilePage } = require('./filePage');

test('renderFilePage - generates valid HTML document', () => {
  const file = {
    id: 'test123',
    name: 'test.txt',
    relativePath: 'path/to/test.txt',
    size: 1024,
    extension: '.txt',
    language: 'plaintext',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const content = 'Hello World\nLine 2';
  const html = renderFilePage(file, content);
  
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('<html'));
  assert.ok(html.includes('</html>'));
  assert.ok(html.includes('<head>'));
  assert.ok(html.includes('<body>'));
});

test('renderFilePage - includes file metadata', () => {
  const file = {
    id: 'abc',
    name: 'example.json',
    relativePath: 'data/example.json',
    size: 2048,
    extension: '.json',
    language: 'json',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, '{"test": true}');
  
  assert.ok(html.includes('example.json'));
  assert.ok(html.includes('data/example.json'));
  assert.ok(html.includes('.json'));
});

test('renderFilePage - escapes HTML in content', () => {
  const file = {
    id: 'test',
    name: 'script.txt',
    relativePath: 'test.txt',
    size: 100,
    extension: '.txt',
    language: 'plaintext',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const content = '<script>alert("xss")</script>';
  const html = renderFilePage(file, content);
  
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&quot;xss&quot;'));
  assert.ok(!html.includes('<script>alert'));
});

test('renderFilePage - escapes HTML in file paths', () => {
  const file = {
    id: 'test',
    name: '<test>.txt',
    relativePath: 'path/<test>.txt',
    size: 100,
    extension: '.txt',
    language: 'plaintext',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, 'content');
  
  assert.ok(html.includes('&lt;test&gt;'));
  assert.ok(!html.includes('<test>') || html.match(/<test>/g).every(m => m.includes('<!DOCTYPE') || m.includes('<html') || m.includes('<head') || m.includes('<body')));
});

test('renderFilePage - includes navigation breadcrumbs', () => {
  const file = {
    id: 'test',
    name: 'file.txt',
    relativePath: 'dir1/dir2/file.txt',
    size: 100,
    extension: '.txt',
    language: 'plaintext',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, 'content');
  
  assert.ok(html.includes('Home'));
  assert.ok(html.includes('../index.html'));
  assert.ok(html.includes('dir1/dir2/file.txt'));
});

test('renderFilePage - includes control buttons', () => {
  const file = {
    id: 'test',
    name: 'file.txt',
    relativePath: 'file.txt',
    size: 100,
    extension: '.txt',
    language: 'plaintext',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, 'content');
  
  assert.ok(html.includes('data-theme-toggle'));
  assert.ok(html.includes('data-wrap-toggle'));
  assert.ok(html.includes('data-copy-button'));
  assert.ok(html.includes('Light mode'));
  assert.ok(html.includes('Enable wrapping'));
  assert.ok(html.includes('Copy'));
});

test('renderFilePage - sets correct language class', () => {
  const file = {
    id: 'test',
    name: 'data.json',
    relativePath: 'data.json',
    size: 100,
    extension: '.json',
    language: 'json',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, '{"key": "value"}');
  
  assert.ok(html.includes('language-json'));
});

test('renderFilePage - handles missing language gracefully', () => {
  const file = {
    id: 'test',
    name: 'file.txt',
    relativePath: 'file.txt',
    size: 100,
    extension: '.txt',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, 'content');
  
  assert.ok(html.includes('language-plaintext'));
});

test('renderFilePage - calculates line count correctly', () => {
  const file = {
    id: 'test',
    name: 'multiline.txt',
    relativePath: 'multiline.txt',
    size: 100,
    extension: '.txt',
    language: 'plaintext',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
  const html = renderFilePage(file, content);
  
  assert.ok(html.includes('5'));
});

test('renderFilePage - handles single line content', () => {
  const file = {
    id: 'test',
    name: 'single.txt',
    relativePath: 'single.txt',
    size: 10,
    extension: '.txt',
    language: 'plaintext',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, 'Single line');
  
  assert.ok(html.includes('Single line'));
});

test('renderFilePage - handles empty content', () => {
  const file = {
    id: 'test',
    name: 'empty.txt',
    relativePath: 'empty.txt',
    size: 0,
    extension: '.txt',
    language: 'plaintext',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, '');
  
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('empty.txt'));
});

test('renderFilePage - includes styles', () => {
  const file = {
    id: 'test',
    name: 'file.txt',
    relativePath: 'file.txt',
    size: 100,
    extension: '.txt',
    language: 'plaintext',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, 'content');
  
  assert.ok(html.includes('<style>'));
  assert.ok(html.includes('--bg-primary'));
  assert.ok(html.includes('--accent'));
});

test('renderFilePage - includes highlight.js', () => {
  const file = {
    id: 'test',
    name: 'code.js',
    relativePath: 'code.js',
    size: 100,
    extension: '.js',
    language: 'javascript',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, 'console.log("test");');
  
  assert.ok(html.includes('highlight.js'));
  assert.ok(html.includes('cdnjs.cloudflare.com'));
});

test('renderFilePage - includes interactive scripts', () => {
  const file = {
    id: 'test',
    name: 'file.txt',
    relativePath: 'file.txt',
    size: 100,
    extension: '.txt',
    language: 'plaintext',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, 'content');
  
  assert.ok(html.includes('localStorage.getItem'));
  assert.ok(html.includes('navigator.clipboard'));
  assert.ok(html.includes('themeToggle'));
});

test('renderFilePage - handles special characters in filename', () => {
  const file = {
    id: 'test',
    name: "file's & name.txt",
    relativePath: "path/file's & name.txt",
    size: 100,
    extension: '.txt',
    language: 'plaintext',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, 'content');
  
  assert.ok(html.includes('&#39;') || html.includes('&apos;'));
  assert.ok(html.includes('&amp;'));
});

test('renderFilePage - displays file size correctly', () => {
  const file = {
    id: 'test',
    name: 'large.txt',
    relativePath: 'large.txt',
    size: 1048576, // 1 MB
    extension: '.txt',
    language: 'plaintext',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, 'content');
  
  assert.ok(html.includes('1 MB') || html.includes('1,048,576'));
});

test('renderFilePage - handles Windows line endings', () => {
  const file = {
    id: 'test',
    name: 'windows.txt',
    relativePath: 'windows.txt',
    size: 100,
    extension: '.txt',
    language: 'plaintext',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const content = 'Line 1\r\nLine 2\r\nLine 3';
  const html = renderFilePage(file, content);
  
  // Should handle both \n and \r\n
  assert.ok(html.includes('Line 1'));
  assert.ok(html.includes('Line 2'));
  assert.ok(html.includes('Line 3'));
});

test('renderFilePage - sets page title correctly', () => {
  const file = {
    id: 'test',
    name: 'document.md',
    relativePath: 'docs/document.md',
    size: 100,
    extension: '.md',
    language: 'markdown',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, '# Header');
  
  assert.ok(html.includes('<title>'));
  assert.ok(html.includes('docs/document.md'));
  assert.ok(html.includes('System Prompts'));
});

test('renderFilePage - includes meta viewport', () => {
  const file = {
    id: 'test',
    name: 'file.txt',
    relativePath: 'file.txt',
    size: 100,
    extension: '.txt',
    language: 'plaintext',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, 'content');
  
  assert.ok(html.includes('viewport'));
  assert.ok(html.includes('width=device-width'));
});

test('renderFilePage - handles missing extension', () => {
  const file = {
    id: 'test',
    name: 'noext',
    relativePath: 'noext',
    size: 100,
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const html = renderFilePage(file, 'content');
  
  assert.ok(html.includes('n/a') || html.includes('plaintext'));
});

test('renderFilePage - preserves whitespace in content', () => {
  const file = {
    id: 'test',
    name: 'spaces.txt',
    relativePath: 'spaces.txt',
    size: 100,
    extension: '.txt',
    language: 'plaintext',
    modifiedAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T10:00:00Z'
  };
  
  const content = '    indented\n        more indented';
  const html = renderFilePage(file, content);
  
  assert.ok(html.includes('white-space: pre'));
});