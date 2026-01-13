/**
 * Unit Tests for System Prompt (core/system-prompts/main-prompt.txt)
 * 
 * Validates the structure, content, and completeness of the system prompt including:
 * - File structure and formatting
 * - Required sections presence
 * - Content quality and clarity
 * - Instruction completeness
 * - Best practices coverage
 */

const fs = require('fs');
const path = require('path');

describe('System Prompt - main-prompt.txt', () => {
  let promptContent;
  let lines;

  beforeAll(() => {
    const promptPath = path.join(__dirname, '../../core/system-prompts/main-prompt.txt');
    promptContent = fs.readFileSync(promptPath, 'utf8');
    lines = promptContent.split('\n');
  });

  describe('File Structure', () => {
    test('should not be empty', () => {
      expect(promptContent.length).toBeGreaterThan(0);
      expect(lines.length).toBeGreaterThan(10);
    });

    test('should have proper title header', () => {
      expect(promptContent).toContain('# Unified AI Platform');
      expect(promptContent).toContain('Main System Prompt');
    });

    test('should use markdown formatting', () => {
      expect(promptContent).toMatch(/^#/m);
      expect(promptContent).toMatch(/^##/m);
    });

    test('should have multiple sections', () => {
      const sectionHeaders = promptContent.match(/^##\s+.+$/gm);
      expect(sectionHeaders).not.toBeNull();
      expect(sectionHeaders.length).toBeGreaterThan(5);
    });

    test('should have subsections', () => {
      const subsectionHeaders = promptContent.match(/^###\s+.+$/gm);
      expect(subsectionHeaders).not.toBeNull();
      expect(subsectionHeaders.length).toBeGreaterThan(0);
    });
  });

  describe('Core Identity Section', () => {
    test('should define core identity', () => {
      expect(promptContent).toContain('Core Identity');
      expect(promptContent).toContain('Capabilities');
    });

    test('should list multi-modal processing', () => {
      expect(promptContent).toContain('Multi-Modal Processing');
      expect(promptContent).toContain('Text');
      expect(promptContent).toContain('code');
    });

    test('should describe memory system', () => {
      expect(promptContent).toContain('Context-Aware Memory');
      expect(promptContent).toContain('Memory System');
    });

    test('should describe tool system', () => {
      expect(promptContent).toContain('Tool System');
      expect(promptContent).toContain('Modular');
    });

    test('should describe planning system', () => {
      expect(promptContent).toContain('Planning');
      expect(promptContent).toContain('Intelligent');
    });

    test('should mention security', () => {
      expect(promptContent).toContain('Security');
    });
  });

  describe('Operating Modes', () => {
    test('should define operating modes section', () => {
      expect(promptContent).toContain('Operating Modes');
    });

    test('should describe planning mode', () => {
      expect(promptContent).toContain('Planning Mode');
    });

    test('should describe execution mode', () => {
      expect(promptContent).toContain('Execution Mode');
    });

    test('should include mode-specific instructions', () => {
      expect(promptContent).toContain('Gather');
      expect(promptContent).toContain('Execute');
      expect(promptContent).toContain('Monitor');
    });
  });

  describe('Communication Guidelines', () => {
    test('should have communication guidelines section', () => {
      expect(promptContent).toContain('Communication Guidelines');
    });

    test('should include user communication rules', () => {
      expect(promptContent).toContain('With Users');
      expect(promptContent).toContain('language');
    });

    test('should include tool usage guidelines', () => {
      expect(promptContent).toContain('Tool Usage');
      expect(promptContent).toContain('parameters');
    });

    test('should emphasize clarity', () => {
      expect(promptContent).toContain('clear');
    });

    test('should mention asking for clarification', () => {
      expect(promptContent).toContain('clarification');
    });
  });

  describe('Memory System Integration', () => {
    test('should have memory system section', () => {
      expect(promptContent).toContain('Memory System Integration');
    });

    test('should explain memory usage', () => {
      expect(promptContent).toContain('Memory Usage');
    });

    test('should define memory criteria', () => {
      expect(promptContent).toContain('Memory Criteria');
    });

    test('should list what to remember', () => {
      expect(promptContent).toContain('Remember:');
      expect(promptContent).toContain('preferences');
    });

    test('should list what not to remember', () => {
      expect(promptContent).toContain("Don't Remember:");
    });

    test('should mention memory citation format', () => {
      expect(promptContent).toMatch(/\[\[memory:/);
    });
  });

  describe('Code Development Guidelines', () => {
    test('should have code development section', () => {
      expect(promptContent).toContain('Code Development');
    });

    test('should list best practices', () => {
      expect(promptContent).toContain('Best Practices');
    });

    test('should mention code conventions', () => {
      expect(promptContent).toContain('conventions');
      expect(promptContent).toContain('patterns');
    });

    test('should mention file operations', () => {
      expect(promptContent).toContain('File Operations');
    });

    test('should emphasize reading before editing', () => {
      expect(promptContent).toContain('Read');
      expect(promptContent).toContain('understand');
    });

    test('should mention security practices', () => {
      expect(promptContent).toContain('Security');
      expect(promptContent).toContain('data');
    });
  });

  describe('Decision-Making Framework', () => {
    test('should have decision-making section', () => {
      expect(promptContent).toContain('Decision-Making');
    });

    test('should describe tool selection process', () => {
      expect(promptContent).toContain('Tool Selection');
    });

    test('should outline problem-solving approach', () => {
      expect(promptContent).toContain('Problem-Solving');
    });

    test('should include numbered steps', () => {
      expect(promptContent).toMatch(/\d\.\s+\*\*/);
    });
  });

  describe('Error Handling', () => {
    test('should have error handling section', () => {
      expect(promptContent).toContain('Error Handling');
    });

    test('should address environment issues', () => {
      expect(promptContent).toContain('Environment Issues');
    });

    test('should address code issues', () => {
      expect(promptContent).toContain('Code Issues');
    });

    test('should mention debugging', () => {
      expect(promptContent).toContain('debug');
    });
  });

  describe('Quality Assurance', () => {
    test('should have quality assurance section', () => {
      expect(promptContent).toContain('Quality Assurance');
    });

    test('should list completion checks', () => {
      expect(promptContent).toContain('Before Completion');
    });

    test('should mention testing', () => {
      expect(promptContent).toContain('test');
    });

    test('should address documentation', () => {
      expect(promptContent).toContain('Documentation');
    });

    test('should mention verification', () => {
      expect(promptContent).toContain('Verify');
    });
  });

  describe('Continuous Learning', () => {
    test('should have continuous learning section', () => {
      expect(promptContent).toContain('Continuous Learning');
    });

    test('should mention adaptation', () => {
      expect(promptContent).toContain('Adaptation');
      expect(promptContent).toContain('feedback');
    });

    test('should address knowledge management', () => {
      expect(promptContent).toContain('Knowledge Management');
    });
  });

  describe('Emergency Protocols', () => {
    test('should have emergency protocols section', () => {
      expect(promptContent).toContain('Emergency Protocols');
    });

    test('should define safety measures', () => {
      expect(promptContent).toContain('Safety Measures');
    });

    test('should warn about harmful commands', () => {
      expect(promptContent).toContain('harmful');
      expect(promptContent).toContain('confirmation');
    });

    test('should mention recovery procedures', () => {
      expect(promptContent).toContain('Recovery Procedures');
    });

    test('should address data protection', () => {
      expect(promptContent).toContain('data');
      expect(promptContent).toContain('privacy');
    });
  });

  describe('Content Quality', () => {
    test('should have adequate length', () => {
      expect(promptContent.length).toBeGreaterThan(1000);
    });

    test('should use bullet points', () => {
      expect(promptContent).toMatch(/^- /m);
    });

    test('should use bold formatting', () => {
      expect(promptContent).toContain('**');
    });

    test('should not have spelling errors in common words', () => {
      // Check for common misspellings
      expect(promptContent.toLowerCase()).not.toContain('teh ');
      expect(promptContent.toLowerCase()).not.toContain('thier ');
      expect(promptContent.toLowerCase()).not.toContain('recieve');
    });

    test('should use consistent terminology', () => {
      // Check that key terms are used consistently
      const terms = ['tool', 'memory', 'plan', 'user', 'system'];
      terms.forEach(term => {
        expect(promptContent.toLowerCase()).toContain(term);
      });
    });

    test('should have proper paragraph spacing', () => {
      expect(promptContent).toMatch(/\n\n/);
    });

    test('should not have excessive blank lines', () => {
      expect(promptContent).not.toMatch(/\n\n\n\n/);
    });
  });

  describe('Instruction Completeness', () => {
    test('should mention AI system names', () => {
      expect(promptContent).toContain('Cursor');
      expect(promptContent).toContain('Devin');
      expect(promptContent).toContain('Manus');
    });

    test('should provide actionable instructions', () => {
      // Should have imperative verbs
      const imperatives = ['use', 'provide', 'ensure', 'follow', 'create', 'analyze'];
      const hasImperatives = imperatives.some(verb => 
        promptContent.toLowerCase().includes(verb)
      );
      expect(hasImperatives).toBe(true);
    });

    test('should include examples or formats', () => {
      expect(promptContent).toMatch(/\[\[.*\]\]/);
    });

    test('should have closing statement', () => {
      const lastLines = lines.slice(-10).join('\n');
      expect(lastLines).toContain('Remember');
    });
  });

  describe('Formatting Consistency', () => {
    test('should use consistent header levels', () => {
      const h1Count = (promptContent.match(/^# /gm) || []).length;
      const h2Count = (promptContent.match(/^## /gm) || []).length;
      
      expect(h1Count).toBeGreaterThan(0);
      expect(h2Count).toBeGreaterThan(h1Count);
    });

    test('should not have trailing whitespace on lines', () => {
      const hasTrailingWhitespace = lines.some(line => 
        line.length > 0 && line !== line.trimEnd()
      );
      expect(hasTrailingWhitespace).toBe(false);
    });

    test('should end with newline', () => {
      expect(promptContent.endsWith('\n')).toBe(true);
    });
  });

  describe('AI Systems References', () => {
    test('should reference multiple AI systems', () => {
      expect(promptContent).toContain('Cursor');
      expect(promptContent).toContain('Devin');
      expect(promptContent).toContain('Manus');
      expect(promptContent).toContain('v0');
    });

    test('should describe what is learned from each system', () => {
      expect(promptContent).toMatch(/Cursor.*tool/i);
      expect(promptContent).toMatch(/Devin.*planning/i);
    });
  });

  describe('Security and Privacy', () => {
    test('should mention data protection', () => {
      expect(promptContent).toContain('data');
      expect(promptContent).toContain('privacy');
    });

    test('should warn about sensitive information', () => {
      expect(promptContent).toContain('sensitive');
    });

    test('should mention input validation', () => {
      expect(promptContent).toContain('Validate');
      expect(promptContent).toContain('inputs');
    });

    test('should address credentials handling', () => {
      expect(promptContent).toContain('credentials');
    });
  });

  describe('User Experience Guidelines', () => {
    test('should mention user language matching', () => {
      expect(promptContent).toContain('same language');
      expect(promptContent).toContain('user');
    });

    test('should emphasize helpfulness', () => {
      expect(promptContent).toContain('helpful');
    });

    test('should mention progress updates', () => {
      expect(promptContent).toContain('progress');
    });
  });
});