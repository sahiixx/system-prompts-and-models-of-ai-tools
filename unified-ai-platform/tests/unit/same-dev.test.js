const fs = require('fs');
const path = require('path');

describe('Same.dev Configuration', () => {
  const sameDevDir = path.join(__dirname, '../../..', 'Same.dev');
  const promptPath = path.join(sameDevDir, 'Prompt.txt');

  describe('File Existence', () => {
    test('Prompt.txt should exist', () => {
      expect(fs.existsSync(promptPath)).toBe(true);
    });
  });

  describe('Prompt Content Validation', () => {
    let promptContent;

    beforeAll(() => {
      promptContent = fs.readFileSync(promptPath, 'utf-8');
    });

    test('should not be empty', () => {
      expect(promptContent.length).toBeGreaterThan(0);
    });

    test('should have substantial content', () => {
      expect(promptContent.length).toBeGreaterThan(100);
    });

    test('should not contain placeholder text', () => {
      expect(promptContent).not.toMatch(/\[TODO\]/i);
      expect(promptContent).not.toMatch(/\[INSERT.*\]/i);
      expect(promptContent).not.toMatch(/lorem ipsum/i);
      expect(promptContent).not.toMatch(/PLACEHOLDER/i);
    });

    test('should be valid UTF-8', () => {
      expect(promptContent).not.toMatch(/\0/);
      expect(promptContent).not.toMatch(/\uFFFD/);
    });

    test('should contain AI assistant instructions', () => {
      const lowerContent = promptContent.toLowerCase();
      const hasInstructions = 
        lowerContent.includes('you are') ||
        lowerContent.includes('your role') ||
        lowerContent.includes('assistant') ||
        lowerContent.includes('help') ||
        lowerContent.includes('task');
      expect(hasInstructions).toBe(true);
    });
  });

  describe('Content Quality', () => {
    let promptContent;

    beforeAll(() => {
      promptContent = fs.readFileSync(promptPath, 'utf-8');
    });

    test('should have multiple lines', () => {
      const lines = promptContent.split('\n');
      expect(lines.length).toBeGreaterThan(5);
    });

    test('should not have excessive blank lines', () => {
      const lines = promptContent.split('\n');
      const blankLines = lines.filter(line => line.trim() === '');
      expect(blankLines.length).toBeLessThan(lines.length * 0.5);
    });

    test('should not contain obvious typos in common words', () => {
      const commonTypos = [
        /\bteh\b/i,
        /\brecieve\b/i,
        /\boccured\b/i,
        /\bseperate\b/i,
        /\bdefinately\b/i
      ];
      
      commonTypos.forEach(typo => {
        expect(promptContent).not.toMatch(typo);
      });
    });

    test('should have balanced brackets and parentheses', () => {
      const openBrackets = (promptContent.match(/\[/g) || []).length;
      const closeBrackets = (promptContent.match(/\]/g) || []).length;
      const openParens = (promptContent.match(/\(/g) || []).length;
      const closeParens = (promptContent.match(/\)/g) || []).length;
      
      expect(openBrackets).toBe(closeBrackets);
      expect(openParens).toBe(closeParens);
    });
  });

  describe('Security Validation', () => {
    let promptContent;

    beforeAll(() => {
      promptContent = fs.readFileSync(promptPath, 'utf-8');
    });

    test('should not contain API keys or tokens', () => {
      expect(promptContent).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
      expect(promptContent).not.toMatch(/ghp_[a-zA-Z0-9]{36}/);
      expect(promptContent).not.toMatch(/xox[baprs]-[a-zA-Z0-9-]+/);
      expect(promptContent).not.toMatch(/AIza[a-zA-Z0-9_-]{35}/);
    });

    test('should not contain sensitive keywords', () => {
      expect(promptContent).not.toMatch(/password\s*[:=]\s*\w+/i);
      expect(promptContent).not.toMatch(/secret\s*[:=]\s*\w+/i);
      expect(promptContent).not.toMatch(/api[_-]?key\s*[:=]\s*\w+/i);
    });

    test('should not reference localhost or private IPs', () => {
      expect(promptContent).not.toMatch(/localhost:\d+/);
      expect(promptContent).not.toMatch(/127\.0\.0\.1/);
      expect(promptContent).not.toMatch(/192\.168\.\d+\.\d+/);
      expect(promptContent).not.toMatch(/10\.\d+\.\d+\.\d+/);
    });
  });

  describe('Formatting Consistency', () => {
    let promptContent;

    beforeAll(() => {
      promptContent = fs.readFileSync(promptPath, 'utf-8');
    });

    test('should not have mixed line endings', () => {
      const hasCRLF = promptContent.includes('\r\n');
      const hasLF = promptContent.includes('\n');
      
      if (hasCRLF && hasLF) {
        const crlfCount = (promptContent.match(/\r\n/g) || []).length;
        const lfCount = (promptContent.match(/\n/g) || []).length;
        expect(crlfCount).toBe(lfCount);
      }
    });

    test('should not have tabs mixed with spaces for indentation', () => {
      const lines = promptContent.split('\n');
      const tabLines = lines.filter(line => line.startsWith('\t'));
      const spaceLines = lines.filter(line => line.match(/^\s+/) && !line.startsWith('\t'));
      
      // Either all tabs or all spaces, not mixed
      if (tabLines.length > 0 && spaceLines.length > 0) {
        expect(tabLines.length).toBeLessThan(spaceLines.length * 0.1);
      }
    });

    test('should end with newline', () => {
      expect(promptContent.endsWith('\n')).toBe(true);
    });
  });
});