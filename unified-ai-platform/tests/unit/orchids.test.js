const fs = require('fs');
const path = require('path');

describe('Orchids.app Configuration', () => {
  const orchidsDir = path.join(__dirname, '../../..', 'Orchids.app');
  const decisionPromptPath = path.join(orchidsDir, 'Decision-making prompt.txt');
  const systemPromptPath = path.join(orchidsDir, 'System Prompt.txt');

  describe('File Existence', () => {
    test('Decision-making prompt.txt should exist', () => {
      expect(fs.existsSync(decisionPromptPath)).toBe(true);
    });

    test('System Prompt.txt should exist', () => {
      expect(fs.existsSync(systemPromptPath)).toBe(true);
    });
  });

  describe('Decision-making Prompt Validation', () => {
    let promptContent;

    beforeAll(() => {
      promptContent = fs.readFileSync(decisionPromptPath, 'utf-8');
    });

    test('should not be empty', () => {
      expect(promptContent.length).toBeGreaterThan(0);
    });

    test('should contain decision-making guidance', () => {
      const lowerContent = promptContent.toLowerCase();
      const hasDecisionKeywords = 
        lowerContent.includes('decision') ||
        lowerContent.includes('choose') ||
        lowerContent.includes('determine') ||
        lowerContent.includes('evaluate') ||
        lowerContent.includes('analyze');
      expect(hasDecisionKeywords).toBe(true);
    });

    test('should not contain placeholder text', () => {
      expect(promptContent).not.toMatch(/\[TODO\]/i);
      expect(promptContent).not.toMatch(/\[PLACEHOLDER\]/i);
      expect(promptContent).not.toMatch(/XXX/);
    });

    test('should be properly formatted text', () => {
      expect(promptContent).not.toMatch(/\0/); // No null bytes
      expect(promptContent.trim().length).toBeGreaterThan(0);
    });
  });

  describe('System Prompt Validation', () => {
    let promptContent;

    beforeAll(() => {
      promptContent = fs.readFileSync(systemPromptPath, 'utf-8');
    });

    test('should not be empty', () => {
      expect(promptContent.length).toBeGreaterThan(0);
    });

    test('should be substantial', () => {
      expect(promptContent.length).toBeGreaterThan(200);
    });

    test('should contain system-level instructions', () => {
      const lowerContent = promptContent.toLowerCase();
      const hasSystemKeywords = 
        lowerContent.includes('you are') ||
        lowerContent.includes('system') ||
        lowerContent.includes('role') ||
        lowerContent.includes('capabilities') ||
        lowerContent.includes('assistant');
      expect(hasSystemKeywords).toBe(true);
    });

    test('should not contain obvious errors', () => {
      expect(promptContent).not.toMatch(/TODO/i);
      expect(promptContent).not.toMatch(/FIXME/i);
      expect(promptContent).not.toMatch(/lorem ipsum/i);
    });

    test('should have consistent formatting', () => {
      // No mixed line endings
      const hasCRLF = promptContent.includes('\r\n');
      const hasLF = promptContent.includes('\n');
      
      if (hasCRLF && hasLF) {
        const crlfCount = (promptContent.match(/\r\n/g) || []).length;
        const lfCount = (promptContent.match(/\n/g) || []).length;
        expect(crlfCount).toBe(lfCount);
      }
    });
  });

  describe('Content Quality', () => {
    test('prompts should not be identical', () => {
      const decisionContent = fs.readFileSync(decisionPromptPath, 'utf-8');
      const systemContent = fs.readFileSync(systemPromptPath, 'utf-8');
      expect(decisionContent).not.toBe(systemContent);
    });

    test('prompts should have different purposes', () => {
      const decisionContent = fs.readFileSync(decisionPromptPath, 'utf-8').toLowerCase();
      const systemContent = fs.readFileSync(systemPromptPath, 'utf-8').toLowerCase();
      
      // Decision prompt should focus on decision-making
      const decisionHasKeywords = decisionContent.includes('decision') || decisionContent.includes('choose');
      
      // System prompt should be more general
      const systemIsGeneral = systemContent.length > decisionContent.length * 0.5;
      
      expect(decisionHasKeywords || systemIsGeneral).toBe(true);
    });
  });

  describe('Security Checks', () => {
    test('prompts should not contain sensitive information', () => {
      const decisionContent = fs.readFileSync(decisionPromptPath, 'utf-8');
      const systemContent = fs.readFileSync(systemPromptPath, 'utf-8');
      
      [decisionContent, systemContent].forEach(content => {
        expect(content).not.toMatch(/password/i);
        expect(content).not.toMatch(/api[_-]?key/i);
        expect(content).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
        expect(content).not.toMatch(/ghp_[a-zA-Z0-9]{36}/);
      });
    });

    test('prompts should not contain URLs to private resources', () => {
      const decisionContent = fs.readFileSync(decisionPromptPath, 'utf-8');
      const systemContent = fs.readFileSync(systemPromptPath, 'utf-8');
      
      [decisionContent, systemContent].forEach(content => {
        expect(content).not.toMatch(/localhost:\d+/);
        expect(content).not.toMatch(/127\.0\.0\.1/);
        expect(content).not.toMatch(/192\.168\./);
      });
    });
  });

  describe('Encoding and Format', () => {
    test('files should be UTF-8 encoded', () => {
      const decisionContent = fs.readFileSync(decisionPromptPath, 'utf-8');
      const systemContent = fs.readFileSync(systemPromptPath, 'utf-8');
      
      [decisionContent, systemContent].forEach(content => {
        expect(content).not.toMatch(/\uFFFD/); // Replacement character
      });
    });

    test('files should not have trailing whitespace on lines', () => {
      const decisionContent = fs.readFileSync(decisionPromptPath, 'utf-8');
      const systemContent = fs.readFileSync(systemPromptPath, 'utf-8');
      
      [decisionContent, systemContent].forEach(content => {
        const lines = content.split('\n');
        const badLines = lines.filter(line => line.match(/\s+$/));
        // Allow some trailing whitespace, but not excessive
        expect(badLines.length).toBeLessThan(lines.length * 0.1);
      });
    });
  });
});