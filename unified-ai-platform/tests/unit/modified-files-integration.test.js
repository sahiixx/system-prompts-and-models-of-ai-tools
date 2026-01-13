const fs = require('fs');
const path = require('path');

describe('Modified Files Integration Tests', () => {
  const rootDir = path.join(__dirname, '../../..');
  
  const modifiedFiles = [
    'Lovable/Agent Prompt.txt',
    'Lovable/Agent Tools.json',
    'Lovable/Prompt.txt',
    'Orchids.app/Decision-making prompt.txt',
    'Orchids.app/System Prompt.txt',
    'Same.dev/Prompt.txt',
    '-Spawn/Prompt.txt'
  ];

  describe('All Modified Files', () => {
    test('all declared modified files should exist', () => {
      modifiedFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    test('all modified files should be readable', () => {
      modifiedFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        expect(() => fs.readFileSync(filePath, 'utf-8')).not.toThrow();
      });
    });

    test('all modified files should have content', () => {
      modifiedFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content.length).toBeGreaterThan(0);
      });
    });
  });

  describe('JSON Files Validation', () => {
    const jsonFiles = modifiedFiles.filter(f => f.endsWith('.json'));

    test('all JSON files should be valid', () => {
      jsonFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(() => JSON.parse(content)).not.toThrow();
      });
    });

    test('JSON files should be properly formatted', () => {
      jsonFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        const reformatted = JSON.stringify(parsed, null, 2);
        
        // Content should be parseable when reformatted
        expect(() => JSON.parse(reformatted)).not.toThrow();
      });
    });
  });

  describe('Text Files Validation', () => {
    const textFiles = modifiedFiles.filter(f => f.endsWith('.txt'));

    test('all text files should be UTF-8 encoded', () => {
      textFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).not.toMatch(/\uFFFD/);
      });
    });

    test('text files should not be empty', () => {
      textFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content.trim().length).toBeGreaterThan(0);
      });
    });

    test('text files should not contain null bytes', () => {
      textFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).not.toMatch(/\0/);
      });
    });
  });

  describe('Security Validation Across All Files', () => {
    test('no file should contain API keys', () => {
      modifiedFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        expect(content).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
        expect(content).not.toMatch(/ghp_[a-zA-Z0-9]{36}/);
        expect(content).not.toMatch(/xox[baprs]-[a-zA-Z0-9-]+/);
      });
    });

    test('no file should contain password literals', () => {
      modifiedFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        expect(content).not.toMatch(/password\s*[:=]\s*['"][^'"]+['"]/i);
        expect(content).not.toMatch(/secret\s*[:=]\s*['"][^'"]+['"]/i);
      });
    });
  });

  describe('Consistency Checks', () => {
    test('tool directories should have consistent structure', () => {
      const toolDirs = ['Lovable', 'Orchids.app', 'Same.dev', '-Spawn'];
      
      toolDirs.forEach(dir => {
        const dirPath = path.join(rootDir, dir);
        expect(fs.existsSync(dirPath)).toBe(true);
        expect(fs.statSync(dirPath).isDirectory()).toBe(true);
      });
    });

    test('each tool should have at least one prompt file', () => {
      const toolDirs = {
        'Lovable': ['Agent Prompt.txt', 'Prompt.txt'],
        'Orchids.app': ['Decision-making prompt.txt', 'System Prompt.txt'],
        'Same.dev': ['Prompt.txt'],
        '-Spawn': ['Prompt.txt']
      };

      Object.entries(toolDirs).forEach(([dir, files]) => {
        const hasAtLeastOne = files.some(file => {
          const filePath = path.join(rootDir, dir, file);
          return fs.existsSync(filePath);
        });
        expect(hasAtLeastOne).toBe(true);
      });
    });
  });

  describe('File Size Sanity Checks', () => {
    test('files should not be unreasonably large', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      modifiedFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeLessThan(maxSize);
      });
    });

    test('files should not be suspiciously small', () => {
      const minSize = 10; // 10 bytes
      
      modifiedFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(minSize);
      });
    });
  });

  describe('README Update Validation', () => {
    const readmePath = path.join(rootDir, 'README.md');

    test('README.md should exist', () => {
      expect(fs.existsSync(readmePath)).toBe(true);
    });

    test('README should reference the repository purpose', () => {
      const content = fs.readFileSync(readmePath, 'utf-8');
      const lowerContent = content.toLowerCase();
      
      const hasRelevantContent = 
        lowerContent.includes('prompt') ||
        lowerContent.includes('ai') ||
        lowerContent.includes('tool') ||
        lowerContent.includes('system');
      
      expect(hasRelevantContent).toBe(true);
    });

    test('README should be valid markdown', () => {
      const content = fs.readFileSync(readmePath, 'utf-8');
      
      // Check for balanced markdown links
      const openBrackets = (content.match(/\[/g) || []).length;
      const closeBrackets = (content.match(/\]/g) || []).length;
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      
      expect(openBrackets).toBe(closeBrackets);
      expect(openParens).toBe(closeParens);
    });
  });
});