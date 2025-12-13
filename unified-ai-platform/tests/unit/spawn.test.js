const fs = require('fs');
const path = require('path');

describe('Spawn Configuration', () => {
  const spawnDir = path.join(__dirname, '../../..', '-Spawn');
  const promptPath = path.join(spawnDir, 'Prompt.txt');

  describe('File Existence', () => {
    test('Prompt.txt should exist', () => {
      expect(fs.existsSync(promptPath)).toBe(true);
    });
  });

  describe('Content Validation', () => {
    let promptContent;

    beforeAll(() => {
      promptContent = fs.readFileSync(promptPath, 'utf-8');
    });

    test('should not be empty', () => {
      expect(promptContent.length).toBeGreaterThan(0);
    });

    test('should contain spawn.co reference', () => {
      const lowerContent = promptContent.toLowerCase();
      expect(lowerContent).toMatch(/spawn/);
    });

    test('should be valid UTF-8', () => {
      expect(promptContent).not.toMatch(/\0/);
      expect(promptContent).not.toMatch(/\uFFFD/);
    });

    test('should not contain obvious placeholder text', () => {
      expect(promptContent).not.toMatch(/\[TODO\]/i);
      expect(promptContent).not.toMatch(/lorem ipsum/i);
    });
  });

  describe('Content Quality', () => {
    let promptContent;

    beforeAll(() => {
      promptContent = fs.readFileSync(promptPath, 'utf-8');
    });

    test('should have multiple lines', () => {
      const lines = promptContent.split('\n').filter(l => l.trim());
      expect(lines.length).toBeGreaterThan(1);
    });

    test('should have balanced quotes', () => {
      const doubleQuotes = (promptContent.match(/"/g) || []).length;
      const singleQuotes = (promptContent.match(/'/g) || []).length;
      
      expect(doubleQuotes % 2).toBe(0);
    });

    test('should mention relevant topics', () => {
      const lowerContent = promptContent.toLowerCase();
      const hasRelevantContent = 
        lowerContent.includes('game') ||
        lowerContent.includes('ai') ||
        lowerContent.includes('security') ||
        lowerContent.includes('prompt');
      expect(hasRelevantContent).toBe(true);
    });
  });

  describe('Security Checks', () => {
    let promptContent;

    beforeAll(() => {
      promptContent = fs.readFileSync(promptPath, 'utf-8');
    });

    test('should not contain API keys', () => {
      expect(promptContent).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
      expect(promptContent).not.toMatch(/ghp_[a-zA-Z0-9]{36}/);
    });

    test('should not contain sensitive patterns', () => {
      expect(promptContent).not.toMatch(/password\s*[:=]/i);
      expect(promptContent).not.toMatch(/api[_-]?key\s*[:=]/i);
    });
  });

  describe('Format Validation', () => {
    let promptContent;

    beforeAll(() => {
      promptContent = fs.readFileSync(promptPath, 'utf-8');
    });

    test('should be properly encoded', () => {
      const buffer = fs.readFileSync(promptPath);
      const decoded = buffer.toString('utf-8');
      expect(decoded).toBe(promptContent);
    });

    test('should not have excessive whitespace', () => {
      const lines = promptContent.split('\n');
      const emptyLines = lines.filter(line => line.trim() === '');
      expect(emptyLines.length).toBeLessThan(lines.length * 0.5);
    });
  });
});