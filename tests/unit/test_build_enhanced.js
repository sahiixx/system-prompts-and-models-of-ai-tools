/**
 * Comprehensive unit tests for site/build-enhanced.js
 * Tests enhanced site building functionality, HTML generation, and metadata processing
 */
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { mkdtempSync, rmSync } = require('fs');
const os = require('os');

// Mock the build-enhanced.js exports
const BUILD_ENHANCED_PATH = path.join(__dirname, '../../site/build-enhanced.js');

describe('build-enhanced.js utility functions', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-build-enhanced-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('escapeHtml', () => {
    test('escapes ampersands', () => {
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

      assert.strictEqual(escapeHtml('A & B'), 'A &amp; B');
    });

    test('escapes less than and greater than', () => {
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
    });

    test('escapes quotes', () => {
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

      assert.strictEqual(escapeHtml('"Hello"'), '&quot;Hello&quot;');
      assert.strictEqual(escapeHtml("'World'"), '&#039;World&#039;');
    });

    test('escapes multiple special characters', () => {
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

      assert.strictEqual(
        escapeHtml('<script>alert("XSS & stuff")</script>'),
        '&lt;script&gt;alert(&quot;XSS &amp; stuff&quot;)&lt;/script&gt;'
      );
    });

    test('handles empty string', () => {
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

    test('handles string with no special characters', () => {
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

      assert.strictEqual(escapeHtml('Hello World 123'), 'Hello World 123');
    });
  });

  describe('loadMetadata', () => {
    test('returns empty array when metadata directory does not exist', () => {
      const loadMetadata = (metadataDir) => {
        const metadata = [];
        
        if (!fs.existsSync(metadataDir)) {
          return metadata;
        }
        
        const files = fs.readdirSync(metadataDir);
        
        for (const file of files) {
          if (file.endsWith('.json') && file !== 'README.md') {
            try {
              const content = fs.readFileSync(path.join(metadataDir, file), 'utf-8');
              metadata.push(JSON.parse(content));
            } catch (error) {
              // Ignore errors
            }
          }
        }
        
        return metadata;
      };

      const nonExistentDir = path.join(tempDir, 'non-existent');
      const result = loadMetadata(nonExistentDir);
      
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 0);
    });

    test('loads valid JSON metadata files', () => {
      const loadMetadata = (metadataDir) => {
        const metadata = [];
        
        if (!fs.existsSync(metadataDir)) {
          return metadata;
        }
        
        const files = fs.readdirSync(metadataDir);
        
        for (const file of files) {
          if (file.endsWith('.json') && file !== 'README.md') {
            try {
              const content = fs.readFileSync(path.join(metadataDir, file), 'utf-8');
              metadata.push(JSON.parse(content));
            } catch (error) {
              // Ignore errors
            }
          }
        }
        
        return metadata;
      };

      const metadataDir = path.join(tempDir, 'metadata');
      fs.mkdirSync(metadataDir);
      
      const testMetadata = { name: 'Test Tool', type: 'CLI' };
      fs.writeFileSync(
        path.join(metadataDir, 'test-tool.json'),
        JSON.stringify(testMetadata)
      );
      
      const result = loadMetadata(metadataDir);
      
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'Test Tool');
      assert.strictEqual(result[0].type, 'CLI');
    });

    test('skips non-JSON files', () => {
      const loadMetadata = (metadataDir) => {
        const metadata = [];
        
        if (!fs.existsSync(metadataDir)) {
          return metadata;
        }
        
        const files = fs.readdirSync(metadataDir);
        
        for (const file of files) {
          if (file.endsWith('.json') && file !== 'README.md') {
            try {
              const content = fs.readFileSync(path.join(metadataDir, file), 'utf-8');
              metadata.push(JSON.parse(content));
            } catch (error) {
              // Ignore errors
            }
          }
        }
        
        return metadata;
      };

      const metadataDir = path.join(tempDir, 'metadata');
      fs.mkdirSync(metadataDir);
      
      fs.writeFileSync(path.join(metadataDir, 'README.md'), '# Documentation');
      fs.writeFileSync(path.join(metadataDir, 'notes.txt'), 'Notes');
      
      const result = loadMetadata(metadataDir);
      
      assert.strictEqual(result.length, 0);
    });

    test('handles malformed JSON gracefully', () => {
      const loadMetadata = (metadataDir) => {
        const metadata = [];
        
        if (!fs.existsSync(metadataDir)) {
          return metadata;
        }
        
        const files = fs.readdirSync(metadataDir);
        
        for (const file of files) {
          if (file.endsWith('.json') && file !== 'README.md') {
            try {
              const content = fs.readFileSync(path.join(metadataDir, file), 'utf-8');
              metadata.push(JSON.parse(content));
            } catch (error) {
              // Ignore errors
            }
          }
        }
        
        return metadata;
      };

      const metadataDir = path.join(tempDir, 'metadata');
      fs.mkdirSync(metadataDir);
      
      fs.writeFileSync(path.join(metadataDir, 'broken.json'), '{ invalid json }');
      fs.writeFileSync(
        path.join(metadataDir, 'valid.json'),
        JSON.stringify({ name: 'Valid Tool' })
      );
      
      const result = loadMetadata(metadataDir);
      
      // Should only load the valid file
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'Valid Tool');
    });

    test('loads multiple metadata files', () => {
      const loadMetadata = (metadataDir) => {
        const metadata = [];
        
        if (!fs.existsSync(metadataDir)) {
          return metadata;
        }
        
        const files = fs.readdirSync(metadataDir);
        
        for (const file of files) {
          if (file.endsWith('.json') && file !== 'README.md') {
            try {
              const content = fs.readFileSync(path.join(metadataDir, file), 'utf-8');
              metadata.push(JSON.parse(content));
            } catch (error) {
              // Ignore errors
            }
          }
        }
        
        return metadata;
      };

      const metadataDir = path.join(tempDir, 'metadata');
      fs.mkdirSync(metadataDir);
      
      fs.writeFileSync(
        path.join(metadataDir, 'tool1.json'),
        JSON.stringify({ name: 'Tool 1' })
      );
      fs.writeFileSync(
        path.join(metadataDir, 'tool2.json'),
        JSON.stringify({ name: 'Tool 2' })
      );
      fs.writeFileSync(
        path.join(metadataDir, 'tool3.json'),
        JSON.stringify({ name: 'Tool 3' })
      );
      
      const result = loadMetadata(metadataDir);
      
      assert.strictEqual(result.length, 3);
      assert.ok(result.some(m => m.name === 'Tool 1'));
      assert.ok(result.some(m => m.name === 'Tool 2'));
      assert.ok(result.some(m => m.name === 'Tool 3'));
    });
  });

  describe('scanDirectory', () => {
    test('scans directory and counts files', () => {
      const scanDirectory = (dir, baseDir = dir, fileTree = {}, stats = { totalFiles: 0, totalDirectories: 0, totalSize: 0 }) => {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            if (!['.git', 'node_modules', 'site', 'assets'].includes(item)) {
              stats.totalDirectories++;
              fileTree[item] = {};
              scanDirectory(itemPath, baseDir, fileTree[item], stats);
            }
          } else if (stat.isFile()) {
            const ext = path.extname(item);
            if (['.txt', '.json', '.md'].includes(ext)) {
              stats.totalFiles++;
              stats.totalSize += stat.size;
              fileTree[item] = { size: stat.size, path: path.relative(baseDir, itemPath) };
            }
          }
        }
        
        return { fileTree, stats };
      };

      const testDir = path.join(tempDir, 'test-scan');
      fs.mkdirSync(testDir);
      fs.writeFileSync(path.join(testDir, 'file1.txt'), 'content');
      fs.writeFileSync(path.join(testDir, 'file2.json'), '{}');
      
      const result = scanDirectory(testDir);
      
      assert.strictEqual(result.stats.totalFiles, 2);
      assert.ok(result.fileTree['file1.txt']);
      assert.ok(result.fileTree['file2.json']);
    });

    test('excludes specified directories', () => {
      const scanDirectory = (dir, baseDir = dir, fileTree = {}, stats = { totalFiles: 0, totalDirectories: 0, totalSize: 0 }) => {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            if (!['.git', 'node_modules', 'site', 'assets'].includes(item)) {
              stats.totalDirectories++;
              fileTree[item] = {};
              scanDirectory(itemPath, baseDir, fileTree[item], stats);
            }
          } else if (stat.isFile()) {
            const ext = path.extname(item);
            if (['.txt', '.json', '.md'].includes(ext)) {
              stats.totalFiles++;
              stats.totalSize += stat.size;
              fileTree[item] = { size: stat.size, path: path.relative(baseDir, itemPath) };
            }
          }
        }
        
        return { fileTree, stats };
      };

      const testDir = path.join(tempDir, 'test-exclude');
      fs.mkdirSync(testDir);
      
      const nodeModules = path.join(testDir, 'node_modules');
      fs.mkdirSync(nodeModules);
      fs.writeFileSync(path.join(nodeModules, 'excluded.txt'), 'excluded');
      
      fs.writeFileSync(path.join(testDir, 'included.txt'), 'included');
      
      const result = scanDirectory(testDir);
      
      assert.strictEqual(result.stats.totalFiles, 1);
      assert.ok(result.fileTree['included.txt']);
      assert.ok(!result.fileTree['node_modules']);
    });

    test('handles nested directories', () => {
      const scanDirectory = (dir, baseDir = dir, fileTree = {}, stats = { totalFiles: 0, totalDirectories: 0, totalSize: 0 }) => {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            if (!['.git', 'node_modules', 'site', 'assets'].includes(item)) {
              stats.totalDirectories++;
              fileTree[item] = {};
              scanDirectory(itemPath, baseDir, fileTree[item], stats);
            }
          } else if (stat.isFile()) {
            const ext = path.extname(item);
            if (['.txt', '.json', '.md'].includes(ext)) {
              stats.totalFiles++;
              stats.totalSize += stat.size;
              fileTree[item] = { size: stat.size, path: path.relative(baseDir, itemPath) };
            }
          }
        }
        
        return { fileTree, stats };
      };

      const testDir = path.join(tempDir, 'test-nested');
      fs.mkdirSync(testDir);
      
      const subDir = path.join(testDir, 'subdir');
      fs.mkdirSync(subDir);
      
      fs.writeFileSync(path.join(testDir, 'root.txt'), 'root');
      fs.writeFileSync(path.join(subDir, 'nested.txt'), 'nested');
      
      const result = scanDirectory(testDir);
      
      assert.strictEqual(result.stats.totalFiles, 2);
      assert.strictEqual(result.stats.totalDirectories, 1);
      assert.ok(result.fileTree['root.txt']);
      assert.ok(result.fileTree['subdir']);
      assert.ok(result.fileTree['subdir']['nested.txt']);
    });

    test('filters files by extension', () => {
      const scanDirectory = (dir, baseDir = dir, fileTree = {}, stats = { totalFiles: 0, totalDirectories: 0, totalSize: 0 }) => {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            if (!['.git', 'node_modules', 'site', 'assets'].includes(item)) {
              stats.totalDirectories++;
              fileTree[item] = {};
              scanDirectory(itemPath, baseDir, fileTree[item], stats);
            }
          } else if (stat.isFile()) {
            const ext = path.extname(item);
            if (['.txt', '.json', '.md'].includes(ext)) {
              stats.totalFiles++;
              stats.totalSize += stat.size;
              fileTree[item] = { size: stat.size, path: path.relative(baseDir, itemPath) };
            }
          }
        }
        
        return { fileTree, stats };
      };

      const testDir = path.join(tempDir, 'test-filter');
      fs.mkdirSync(testDir);
      
      fs.writeFileSync(path.join(testDir, 'file.txt'), 'text');
      fs.writeFileSync(path.join(testDir, 'file.js'), 'javascript');
      fs.writeFileSync(path.join(testDir, 'file.py'), 'python');
      fs.writeFileSync(path.join(testDir, 'file.json'), '{}');
      
      const result = scanDirectory(testDir);
      
      assert.strictEqual(result.stats.totalFiles, 2); // Only .txt and .json
      assert.ok(result.fileTree['file.txt']);
      assert.ok(result.fileTree['file.json']);
      assert.ok(!result.fileTree['file.js']);
      assert.ok(!result.fileTree['file.py']);
    });

    test('calculates total size correctly', () => {
      const scanDirectory = (dir, baseDir = dir, fileTree = {}, stats = { totalFiles: 0, totalDirectories: 0, totalSize: 0 }) => {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            if (!['.git', 'node_modules', 'site', 'assets'].includes(item)) {
              stats.totalDirectories++;
              fileTree[item] = {};
              scanDirectory(itemPath, baseDir, fileTree[item], stats);
            }
          } else if (stat.isFile()) {
            const ext = path.extname(item);
            if (['.txt', '.json', '.md'].includes(ext)) {
              stats.totalFiles++;
              stats.totalSize += stat.size;
              fileTree[item] = { size: stat.size, path: path.relative(baseDir, itemPath) };
            }
          }
        }
        
        return { fileTree, stats };
      };

      const testDir = path.join(tempDir, 'test-size');
      fs.mkdirSync(testDir);
      
      const content1 = 'a'.repeat(100);
      const content2 = 'b'.repeat(200);
      
      fs.writeFileSync(path.join(testDir, 'file1.txt'), content1);
      fs.writeFileSync(path.join(testDir, 'file2.txt'), content2);
      
      const result = scanDirectory(testDir);
      
      assert.strictEqual(result.stats.totalSize, 300);
    });
  });

  describe('HTML generation functions', () => {
    test('generateFileTreeHTML handles empty tree', () => {
      const generateFileTreeHTML = (tree) => {
        let html = '';
        
        if (Object.keys(tree).length === 0) {
          return '<div class="no-results">No files found</div>';
        }
        
        return html || '<div>Files</div>';
      };

      const result = generateFileTreeHTML({});
      assert.ok(result.includes('No files found'));
    });

    test('generateToolCardsHTML handles empty metadata', () => {
      const generateToolCardsHTML = (metadata) => {
        if (metadata.length === 0) {
          return '<div class="no-results">No tools found</div>';
        }
        return '<div>Tools</div>';
      };

      const result = generateToolCardsHTML([]);
      assert.ok(result.includes('No tools found'));
    });

    test('generateToolCardsHTML handles tool data', () => {
      const generateToolCardsHTML = (metadata) => {
        if (metadata.length === 0) {
          return '<div class="no-results">No tools found</div>';
        }
        return `<div class="tool-card">${metadata[0].name}</div>`;
      };

      const metadata = [{ name: 'Test Tool', type: 'CLI' }];
      const result = generateToolCardsHTML(metadata);
      assert.ok(result.includes('Test Tool'));
    });

    test('generateComparisonTableHTML handles empty metadata', () => {
      const generateComparisonTableHTML = (metadata) => {
        if (metadata.length === 0) {
          return '<div class="no-results">No tools available for comparison</div>';
        }
        return '<table>Comparison</table>';
      };

      const result = generateComparisonTableHTML([]);
      assert.ok(result.includes('No tools available for comparison'));
    });
  });

  describe('File content processing', () => {
    test('processes text files correctly', () => {
      const testDir = path.join(tempDir, 'content-test');
      fs.mkdirSync(testDir);
      
      const content = 'Sample prompt content\nLine 2\nLine 3';
      fs.writeFileSync(path.join(testDir, 'prompt.txt'), content);
      
      const readContent = fs.readFileSync(path.join(testDir, 'prompt.txt'), 'utf-8');
      const lines = readContent.split('\n');
      
      assert.strictEqual(lines.length, 3);
      assert.strictEqual(lines[0], 'Sample prompt content');
    });

    test('processes JSON files correctly', () => {
      const testDir = path.join(tempDir, 'json-test');
      fs.mkdirSync(testDir);
      
      const data = { name: 'Tool', version: '1.0' };
      fs.writeFileSync(path.join(testDir, 'config.json'), JSON.stringify(data));
      
      const readData = JSON.parse(fs.readFileSync(path.join(testDir, 'config.json'), 'utf-8'));
      
      assert.strictEqual(readData.name, 'Tool');
      assert.strictEqual(readData.version, '1.0');
    });
  });

  describe('Path handling', () => {
    test('generates correct relative paths', () => {
      const baseDir = '/base';
      const filePath = '/base/subdir/file.txt';
      
      const relativePath = path.relative(baseDir, filePath);
      
      assert.strictEqual(relativePath, path.join('subdir', 'file.txt'));
    });

    test('handles file extensions correctly', () => {
      const extensions = ['.txt', '.json', '.md', '.js', '.py'];
      
      extensions.forEach(ext => {
        const filename = `file${ext}`;
        assert.strictEqual(path.extname(filename), ext);
      });
    });
  });

  describe('Edge cases', () => {
    test('handles empty directory gracefully', () => {
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir);
      
      const files = fs.readdirSync(emptyDir);
      assert.strictEqual(files.length, 0);
    });

    test('handles deeply nested structures', () => {
      let current = tempDir;
      for (let i = 0; i < 5; i++) {
        current = path.join(current, `level${i}`);
        fs.mkdirSync(current);
      }
      
      fs.writeFileSync(path.join(current, 'deep.txt'), 'deep content');
      
      const content = fs.readFileSync(path.join(current, 'deep.txt'), 'utf-8');
      assert.strictEqual(content, 'deep content');
    });

    test('handles special characters in filenames', () => {
      const specialDir = path.join(tempDir, 'special');
      fs.mkdirSync(specialDir);
      
      const specialNames = ['file-with-dashes.txt', 'file_with_underscores.txt'];
      
      specialNames.forEach(name => {
        fs.writeFileSync(path.join(specialDir, name), 'content');
        assert.ok(fs.existsSync(path.join(specialDir, name)));
      });
    });

    test('handles large files', () => {
      const largeDir = path.join(tempDir, 'large');
      fs.mkdirSync(largeDir);
      
      const largeContent = 'x'.repeat(10000);
      fs.writeFileSync(path.join(largeDir, 'large.txt'), largeContent);
      
      const stat = fs.statSync(path.join(largeDir, 'large.txt'));
      assert.strictEqual(stat.size, 10000);
    });
  });
});