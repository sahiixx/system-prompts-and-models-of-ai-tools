/**
 * Unit Tests for System Prompt
 * 
 * These tests validate the structure, content, and quality of the main system prompt
 * located at: core/system-prompts/main-prompt.txt
 */

const fs = require('fs');
const path = require('path');

describe('System Prompt Validation', () => {
  let promptContent;
  let promptLines;

  beforeAll(() => {
    const promptPath = path.join(__dirname, '../../core/system-prompts/main-prompt.txt');
    promptContent = fs.readFileSync(promptPath, 'utf8');
    promptLines = promptContent.split('\n');
  });

  describe('File Structure', () => {
    test('prompt file should exist and be readable', () => {
      expect(promptContent).toBeDefined();
      expect(promptContent.length).toBeGreaterThan(0);
    });

    test('prompt should have substantial content', () => {
      expect(promptContent.length).toBeGreaterThan(1000);
      expect(promptLines.length).toBeGreaterThan(50);
    });

    test('prompt should use markdown formatting', () => {
      expect(promptContent).toMatch(/^#\s+/m);
      expect(promptContent).toMatch(/^##\s+/m);
    });

    test('prompt should not be empty or contain only whitespace', () => {
      const trimmed = promptContent.trim();
      expect(trimmed.length).toBeGreaterThan(0);
    });

    test('prompt should have proper line endings', () => {
      // Check that it doesn't have excessive blank lines
      const consecutiveBlankLines = promptContent.match(/\n\n\n+/g);
      if (consecutiveBlankLines) {
        expect(consecutiveBlankLines.length).toBeLessThan(10);
      }
    });
  });

  describe('Content Sections', () => {
    test('should have core identity section', () => {
      expect(promptContent.toLowerCase()).toMatch(/identity|core.*capabilities/);
    });

    test('should define operating modes', () => {
      expect(promptContent.toLowerCase()).toMatch(/operating.*modes?|modes?.*operating/);
      expect(promptContent.toLowerCase()).toMatch(/planning.*mode|execution.*mode/);
    });

    test('should have communication guidelines', () => {
      expect(promptContent.toLowerCase()).toMatch(/communication.*guidelines?/);
    });

    test('should mention memory system', () => {
      expect(promptContent.toLowerCase()).toMatch(/memory.*system|memory.*integration/);
    });

    test('should include code development guidelines', () => {
      expect(promptContent.toLowerCase()).toMatch(/code.*development|development.*guidelines/);
    });

    test('should have decision-making framework', () => {
      expect(promptContent.toLowerCase()).toMatch(/decision.*making|problem.*solving/);
    });

    test('should include error handling procedures', () => {
      expect(promptContent.toLowerCase()).toMatch(/error.*handling|error.*management/);
    });

    test('should have quality assurance section', () => {
      expect(promptContent.toLowerCase()).toMatch(/quality.*assurance|quality.*control/);
    });

    test('should mention security protocols', () => {
      expect(promptContent.toLowerCase()).toMatch(/security|safety|secure/);
    });
  });

  describe('Capability Mentions', () => {
    test('should reference multi-modal processing', () => {
      expect(promptContent.toLowerCase()).toMatch(/multi.*modal|multimodal/);
    });

    test('should mention tool system', () => {
      expect(promptContent.toLowerCase()).toMatch(/tool.*system|tools/);
    });

    test('should reference planning capabilities', () => {
      expect(promptContent.toLowerCase()).toMatch(/planning|plan/);
    });

    test('should mention supported modalities', () => {
      const hasText = promptContent.toLowerCase().includes('text');
      const hasCode = promptContent.toLowerCase().includes('code');
      expect(hasText && hasCode).toBe(true);
    });

    test('should reference multiple AI systems', () => {
      // Should mention at least some of the systems it combines
      const mentionsCursor = promptContent.toLowerCase().includes('cursor');
      const mentionsDevin = promptContent.toLowerCase().includes('devin');
      const mentionsManus = promptContent.toLowerCase().includes('manus');
      const mentionsV0 = promptContent.toLowerCase().includes('v0');
      
      const mentionsCount = [mentionsCursor, mentionsDevin, mentionsManus, mentionsV0]
        .filter(Boolean).length;
      
      expect(mentionsCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Instruction Quality', () => {
    test('should use imperative mood for instructions', () => {
      const imperativePatterns = [
        /^use /im,
        /^provide /im,
        /^follow /im,
        /^maintain /im,
        /^ensure /im,
        /^never /im,
        /^always /im
      ];
      
      const hasImperatives = imperativePatterns.some(pattern => 
        pattern.test(promptContent)
      );
      
      expect(hasImperatives).toBe(true);
    });

    test('should have clear action items', () => {
      const actionWords = ['should', 'must', 'will', 'need to', 'required'];
      const hasActionWords = actionWords.some(word => 
        promptContent.toLowerCase().includes(word)
      );
      
      expect(hasActionWords).toBe(true);
    });

    test('should avoid ambiguous language', () => {
      const ambiguousPatterns = [
        /maybe|perhaps|possibly|might want to/i
      ];
      
      ambiguousPatterns.forEach(pattern => {
        const matches = promptContent.match(pattern);
        if (matches) {
          // Some ambiguous language is okay, but not excessive
          expect(matches.length).toBeLessThan(5);
        }
      });
    });

    test('should have consistent formatting', () => {
      const headings = promptContent.match(/^#+\s+.+$/gm);
      
      if (headings && headings.length > 0) {
        // Check that headings are properly formatted
        headings.forEach(heading => {
          expect(heading).toMatch(/^#+\s+[A-Z]/);
        });
      }
    });

    test('should use lists for structured information', () => {
      const hasBulletLists = /^[-*]\s+/m.test(promptContent);
      const hasNumberedLists = /^\d+\.\s+/m.test(promptContent);
      
      expect(hasBulletLists || hasNumberedLists).toBe(true);
    });
  });

  describe('Security and Safety', () => {
    test('should mention data protection', () => {
      expect(promptContent.toLowerCase()).toMatch(/data.*protection|privacy|protect.*data/);
    });

    test('should address sensitive data handling', () => {
      expect(promptContent.toLowerCase()).toMatch(/sensitive|credentials|secrets/);
    });

    test('should include user permission guidelines', () => {
      expect(promptContent.toLowerCase()).toMatch(/permission|confirmation|approve/);
    });

    test('should have safety protocols', () => {
      expect(promptContent.toLowerCase()).toMatch(/safety|safe|secure/);
    });

    test('should mention validation requirements', () => {
      expect(promptContent.toLowerCase()).toMatch(/validat(e|ion)/);
    });
  });

  describe('Best Practices', () => {
    test('should reference code quality standards', () => {
      expect(promptContent.toLowerCase()).toMatch(/code.*quality|best.*practices|conventions/);
    });

    test('should mention testing requirements', () => {
      expect(promptContent.toLowerCase()).toMatch(/test(ing)?|verify/);
    });

    test('should include documentation guidelines', () => {
      expect(promptContent.toLowerCase()).toMatch(/document(ation)?/);
    });

    test('should emphasize user experience', () => {
      expect(promptContent.toLowerCase()).toMatch(/user.*experience|ux|usability/);
    });

    test('should promote maintainability', () => {
      expect(promptContent.toLowerCase()).toMatch(/maintain(able|ability)?|clean.*code/);
    });
  });

  describe('Tone and Style', () => {
    test('should maintain professional tone', () => {
      // Should not contain overly casual language
      const casualWords = ['gonna', 'wanna', 'yeah', 'nope', 'yep'];
      casualWords.forEach(word => {
        expect(promptContent.toLowerCase()).not.toContain(word);
      });
    });

    test('should use consistent terminology', () => {
      // If it uses "user", it should be consistent
      if (promptContent.toLowerCase().includes('user')) {
        const userCount = (promptContent.toLowerCase().match(/user/g) || []).length;
        expect(userCount).toBeGreaterThan(3);
      }
    });

    test('should not contain TODO or placeholder text', () => {
      expect(promptContent).not.toMatch(/TODO|FIXME|XXX|PLACEHOLDER/i);
    });

    test('should not have excessive capitalization', () => {
      const allCapsWords = promptContent.match(/\b[A-Z]{4,}\b/g);
      if (allCapsWords) {
        // Some acronyms are okay, but not too many
        expect(allCapsWords.length).toBeLessThan(20);
      }
    });
  });

  describe('Completeness', () => {
    test('should have examples or demonstrations', () => {
      const hasExamples = 
        promptContent.toLowerCase().includes('example') ||
        promptContent.toLowerCase().includes('for instance') ||
        promptContent.match(/e\.g\./i);
      
      expect(hasExamples).toBe(true);
    });

    test('should provide context for rules', () => {
      const hasContext = 
        promptContent.toLowerCase().includes('because') ||
        promptContent.toLowerCase().includes('this ensures') ||
        promptContent.toLowerCase().includes('to ensure');
      
      expect(hasContext).toBe(true);
    });

    test('should address edge cases', () => {
      const hasEdgeCases = 
        promptContent.toLowerCase().includes('when') ||
        promptContent.toLowerCase().includes('if') ||
        promptContent.toLowerCase().includes('in case');
      
      expect(hasEdgeCases).toBe(true);
    });

    test('should have emergency or fallback procedures', () => {
      expect(promptContent.toLowerCase()).toMatch(/emergency|fallback|recovery|backup/);
    });
  });

  describe('Integration with Platform', () => {
    test('should reference configuration system', () => {
      expect(promptContent.toLowerCase()).toMatch(/config(uration)?|settings/);
    });

    test('should align with platform capabilities', () => {
      // Should mention capabilities that exist in system-config.json
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      const capabilities = [
        'multi_modal',
        'memory_system',
        'tool_system',
        'planning_system',
        'security'
      ];
      
      capabilities.forEach(capability => {
        if (config.core_capabilities[capability]?.enabled) {
          const capabilityName = capability.replace('_', '[ -]');
          const pattern = new RegExp(capabilityName, 'i');
          expect(promptContent).toMatch(pattern);
        }
      });
    });

    test('should reference available tools appropriately', () => {
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
      
      // Should mention tool usage generally
      expect(promptContent.toLowerCase()).toMatch(/tool/);
      
      // Might mention specific important tools
      const importantTools = ['read', 'write', 'search', 'execute'];
      const mentionsTools = importantTools.some(tool => 
        promptContent.toLowerCase().includes(tool)
      );
      expect(mentionsTools).toBe(true);
    });
  });

  describe('Memory and Context Management', () => {
    test('should explain memory citation format', () => {
      const hasCitationFormat = 
        promptContent.includes('[[memory:') ||
        promptContent.includes('memory:') ||
        promptContent.match(/\[\[.*\]\]/);
      
      expect(hasCitationFormat).toBe(true);
    });

    test('should provide memory usage guidelines', () => {
      const sections = promptContent.toLowerCase();
      expect(sections).toMatch(/memory.*usage|when.*remember|what.*remember/);
    });

    test('should distinguish what to remember vs forget', () => {
      const hasRememberGuidance = sections => 
        sections.includes('remember') && 
        (sections.includes("don't remember") || sections.includes('forget'));
      
      expect(hasRememberGuidance(promptContent.toLowerCase())).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should have clear error handling instructions', () => {
      expect(promptContent.toLowerCase()).toMatch(/error|failure|exception/);
    });

    test('should provide recovery strategies', () => {
      expect(promptContent.toLowerCase()).toMatch(/recovery|fallback|alternative|retry/);
    });

    test('should address environment issues', () => {
      expect(promptContent.toLowerCase()).toMatch(/environment|setup|configuration/);
    });

    test('should guide on when to ask for help', () => {
      expect(promptContent.toLowerCase()).toMatch(/ask.*user|clarif(y|ication)|help/);
    });
  });

  describe('Prompt Length and Density', () => {
    test('should not be excessively long', () => {
      expect(promptContent.length).toBeLessThan(50000);
    });

    test('should not be too short', () => {
      expect(promptContent.length).toBeGreaterThan(2000);
    });

    test('should have reasonable paragraph sizes', () => {
      const paragraphs = promptContent.split(/\n\n+/);
      const longParagraphs = paragraphs.filter(p => p.length > 1000);
      
      // Most paragraphs should be reasonably sized
      expect(longParagraphs.length).toBeLessThan(paragraphs.length / 2);
    });

    test('should have good information density', () => {
      const words = promptContent.split(/\s+/);
      const uniqueWords = new Set(words.map(w => w.toLowerCase()));
      
      // Should have good vocabulary diversity
      const diversityRatio = uniqueWords.size / words.length;
      expect(diversityRatio).toBeGreaterThan(0.3);
    });
  });
});