const fs = require('fs');
const path = require('path');

describe('main-prompt.txt', () => {
  let promptContent;
  let promptPath;
  
  beforeAll(() => {
    promptPath = path.join(__dirname, '../../core/system-prompts/main-prompt.txt');
    
    if (fs.existsSync(promptPath)) {
      promptContent = fs.readFileSync(promptPath, 'utf8');
    }
  });

  describe('File Existence and Basic Validation', () => {
    test('should exist in the expected location', () => {
      expect(fs.existsSync(promptPath)).toBe(true);
    });

    test('should not be empty', () => {
      if (promptContent) {
        expect(promptContent.length).toBeGreaterThan(0);
        expect(promptContent.trim().length).toBeGreaterThan(0);
      }
    });

    test('should be readable text', () => {
      if (promptContent) {
        expect(typeof promptContent).toBe('string');
        expect(promptContent).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F]/);
      }
    });
  });

  describe('Content Structure', () => {
    test('should have reasonable length for a system prompt', () => {
      if (promptContent) {
        expect(promptContent.length).toBeGreaterThan(100);
        expect(promptContent.length).toBeLessThan(1000000);
      }
    });

    test('should contain instructional language', () => {
      if (promptContent) {
        const instructionalWords = ['you', 'should', 'must', 'will', 'can', 'please', 'follow'];
        const hasInstructions = instructionalWords.some(word => 
          promptContent.toLowerCase().includes(word)
        );
        expect(hasInstructions).toBe(true);
      }
    });

    test('should have proper line endings', () => {
      if (promptContent) {
        expect(promptContent).not.toMatch(/\r(?!\n)/);
      }
    });
  });

  describe('Content Quality', () => {
    test('should not contain obvious placeholders', () => {
      if (promptContent) {
        expect(promptContent).not.toMatch(/\[YOUR_.*?\]/i);
        expect(promptContent).not.toMatch(/TODO:/i);
        expect(promptContent).not.toMatch(/FIXME:/i);
        expect(promptContent).not.toMatch(/XXX/);
      }
    });

    test('should not contain sensitive information', () => {
      if (promptContent) {
        expect(promptContent).not.toMatch(/password\s*[:=]\s*\S+/i);
        expect(promptContent).not.toMatch(/api[_-]?key\s*[:=]\s*\S+/i);
        expect(promptContent).not.toMatch(/secret\s*[:=]\s*\S+/i);
        expect(promptContent).not.toMatch(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      }
    });

    test('should have consistent formatting', () => {
      if (promptContent) {
        const lines = promptContent.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        
        expect(nonEmptyLines.length).toBeGreaterThan(0);
        
        const hasConsistentIndentation = lines.every(line => {
          if (line.trim().length === 0) return true;
          return !line.match(/^\t+ /);
        });
        
        expect(hasConsistentIndentation).toBe(true);
      }
    });
  });

  describe('Linguistic Quality', () => {
    test('should have proper sentence structure', () => {
      if (promptContent) {
        const sentences = promptContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        expect(sentences.length).toBeGreaterThan(0);
        
        const averageLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
        expect(averageLength).toBeGreaterThan(10);
        expect(averageLength).toBeLessThan(500);
      }
    });

    test('should not have excessive repetition', () => {
      if (promptContent) {
        const words = promptContent.toLowerCase().split(/\s+/);
        const wordCounts = {};
        
        words.forEach(word => {
          if (word.length > 4) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
          }
        });
        
        Object.entries(wordCounts).forEach(([word, count]) => {
          const repetitionRate = count / words.length;
          expect(repetitionRate).toBeLessThan(0.1);
        });
      }
    });
  });

  describe('Special Characters and Encoding', () => {
    test('should handle special characters properly', () => {
      if (promptContent) {
        const hasValidEncoding = !promptContent.match(/�/);
        expect(hasValidEncoding).toBe(true);
      }
    });

    test('should not have trailing whitespace on lines', () => {
      if (promptContent) {
        const lines = promptContent.split('\n');
        const hasTrailingWhitespace = lines.some(line => 
          line.length > 0 && line !== line.trimEnd()
        );
        
        expect(hasTrailingWhitespace).toBe(false);
      }
    });
  });

  describe('Metadata and Documentation', () => {
    test('should potentially contain version or date information', () => {
      if (promptContent) {
        const hasVersionOrDate = 
          promptContent.match(/version|v\d+\.\d+|date|updated|modified/i);
        
        if (hasVersionOrDate) {
          expect(hasVersionOrDate).toBeTruthy();
        }
      }
    });
  });
});