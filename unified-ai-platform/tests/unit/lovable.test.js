const fs = require('fs');
const path = require('path');

describe('Lovable Tool Configuration', () => {
  const lovableDir = path.join(__dirname, '../../..', 'Lovable');
  const agentPromptPath = path.join(lovableDir, 'Agent Prompt.txt');
  const agentToolsPath = path.join(lovableDir, 'Agent Tools.json');
  const promptPath = path.join(lovableDir, 'Prompt.txt');

  describe('File Existence', () => {
    test('Agent Prompt.txt should exist', () => {
      expect(fs.existsSync(agentPromptPath)).toBe(true);
    });

    test('Agent Tools.json should exist', () => {
      expect(fs.existsSync(agentToolsPath)).toBe(true);
    });

    test('Prompt.txt should exist', () => {
      expect(fs.existsSync(promptPath)).toBe(true);
    });
  });

  describe('Agent Tools.json Validation', () => {
    let toolsData;

    beforeAll(() => {
      const content = fs.readFileSync(agentToolsPath, 'utf-8');
      toolsData = JSON.parse(content);
    });

    test('should be valid JSON', () => {
      expect(toolsData).toBeDefined();
      expect(typeof toolsData).toBe('object');
    });

    test('should contain tools array', () => {
      expect(Array.isArray(toolsData)).toBe(true);
    });

    test('each tool should have required fields', () => {
      toolsData.forEach((tool, index) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });

    test('tool names should be unique', () => {
      const names = toolsData.map(tool => tool.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    test('each tool with input_schema should have valid schema structure', () => {
      toolsData.forEach((tool) => {
        if (tool.input_schema) {
          expect(tool.input_schema).toHaveProperty('type');
          expect(tool.input_schema.type).toBe('object');
          
          if (tool.input_schema.properties) {
            expect(typeof tool.input_schema.properties).toBe('object');
          }
          
          if (tool.input_schema.required) {
            expect(Array.isArray(tool.input_schema.required)).toBe(true);
          }
        }
      });
    });

    test('all required parameters should be defined in properties', () => {
      toolsData.forEach((tool) => {
        if (tool.input_schema && tool.input_schema.required) {
          const properties = tool.input_schema.properties || {};
          tool.input_schema.required.forEach(requiredParam => {
            expect(properties).toHaveProperty(requiredParam);
          });
        }
      });
    });

    test('property descriptions should be present and meaningful', () => {
      toolsData.forEach((tool) => {
        if (tool.input_schema && tool.input_schema.properties) {
          Object.entries(tool.input_schema.properties).forEach(([propName, propSchema]) => {
            if (propSchema.description) {
              expect(propSchema.description.length).toBeGreaterThan(10);
            }
          });
        }
      });
    });

    test('should not contain placeholder or TODO text', () => {
      const jsonString = JSON.stringify(toolsData, null, 2);
      expect(jsonString).not.toMatch(/TODO/i);
      expect(jsonString).not.toMatch(/FIXME/i);
      expect(jsonString).not.toMatch(/PLACEHOLDER/i);
    });

    test('property types should be valid JSON Schema types', () => {
      const validTypes = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'];
      
      toolsData.forEach((tool) => {
        if (tool.input_schema && tool.input_schema.properties) {
          Object.entries(tool.input_schema.properties).forEach(([propName, propSchema]) => {
            if (propSchema.type) {
              expect(validTypes).toContain(propSchema.type);
            }
          });
        }
      });
    });

    test('enum values should be arrays when present', () => {
      toolsData.forEach((tool) => {
        if (tool.input_schema && tool.input_schema.properties) {
          Object.entries(tool.input_schema.properties).forEach(([propName, propSchema]) => {
            if (propSchema.enum) {
              expect(Array.isArray(propSchema.enum)).toBe(true);
              expect(propSchema.enum.length).toBeGreaterThan(0);
            }
          });
        }
      });
    });
  });

  describe('Agent Prompt.txt Validation', () => {
    let promptContent;

    beforeAll(() => {
      promptContent = fs.readFileSync(agentPromptPath, 'utf-8');
    });

    test('should not be empty', () => {
      expect(promptContent.length).toBeGreaterThan(0);
    });

    test('should be reasonable length', () => {
      expect(promptContent.length).toBeGreaterThan(100);
      expect(promptContent.length).toBeLessThan(1000000); // Less than 1MB
    });

    test('should not contain obvious placeholder text', () => {
      expect(promptContent).not.toMatch(/\[INSERT.*\]/i);
      expect(promptContent).not.toMatch(/\[TODO.*\]/i);
      expect(promptContent).not.toMatch(/lorem ipsum/i);
    });

    test('should have proper encoding (no null bytes)', () => {
      expect(promptContent).not.toMatch(/\0/);
    });

    test('should contain instructions or guidance', () => {
      const lowerContent = promptContent.toLowerCase();
      const hasInstructions = 
        lowerContent.includes('you are') ||
        lowerContent.includes('your task') ||
        lowerContent.includes('instructions') ||
        lowerContent.includes('capabilities') ||
        lowerContent.includes('rules');
      expect(hasInstructions).toBe(true);
    });
  });

  describe('Prompt.txt Validation', () => {
    let promptContent;

    beforeAll(() => {
      promptContent = fs.readFileSync(promptPath, 'utf-8');
    });

    test('should not be empty', () => {
      expect(promptContent.length).toBeGreaterThan(0);
    });

    test('should be substantial in length', () => {
      expect(promptContent.length).toBeGreaterThan(500);
    });

    test('should not contain TODO markers', () => {
      expect(promptContent).not.toMatch(/TODO/i);
      expect(promptContent).not.toMatch(/FIXME/i);
    });

    test('should be valid UTF-8 text', () => {
      expect(promptContent).not.toMatch(/\uFFFD/); // Replacement character
    });
  });

  describe('Cross-file Consistency', () => {
    test('tool names in JSON should be referenced in prompts if applicable', () => {
      const toolsContent = fs.readFileSync(agentToolsPath, 'utf-8');
      const tools = JSON.parse(toolsContent);
      const agentPrompt = fs.readFileSync(agentPromptPath, 'utf-8');
      
      // At least some tools should be mentioned or the prompt should reference tool usage
      const promptLower = agentPrompt.toLowerCase();
      const hasToolReferences = 
        promptLower.includes('tool') ||
        promptLower.includes('function') ||
        promptLower.includes('capability');
      
      if (tools.length > 0) {
        expect(hasToolReferences).toBe(true);
      }
    });

    test('files should have consistent line endings', () => {
      const agentPrompt = fs.readFileSync(agentPromptPath, 'utf-8');
      const mainPrompt = fs.readFileSync(promptPath, 'utf-8');
      
      // Check they don't mix CRLF and LF
      const hasMixedLineEndings = (text) => {
        return text.includes('\r\n') && text.includes('\n') && 
               text.split('\r\n').length !== text.split('\n').length;
      };
      
      expect(hasMixedLineEndings(agentPrompt)).toBe(false);
      expect(hasMixedLineEndings(mainPrompt)).toBe(false);
    });
  });

  describe('Security Validation', () => {
    test('Agent Tools.json should not contain sensitive data', () => {
      const content = fs.readFileSync(agentToolsPath, 'utf-8');
      expect(content).not.toMatch(/password/i);
      expect(content).not.toMatch(/api[_-]?key/i);
      expect(content).not.toMatch(/secret/i);
      expect(content).not.toMatch(/token/i);
      expect(content).not.toMatch(/[a-f0-9]{32,}/); // Hash-like strings
    });

    test('prompts should not contain hardcoded secrets', () => {
      const agentPrompt = fs.readFileSync(agentPromptPath, 'utf-8');
      const mainPrompt = fs.readFileSync(promptPath, 'utf-8');
      
      [agentPrompt, mainPrompt].forEach(content => {
        expect(content).not.toMatch(/sk-[a-zA-Z0-9]{20,}/); // OpenAI-style keys
        expect(content).not.toMatch(/ghp_[a-zA-Z0-9]{36}/); // GitHub tokens
        expect(content).not.toMatch(/xox[baprs]-[a-zA-Z0-9-]+/); // Slack tokens
      });
    });
  });

  describe('JSON Formatting', () => {
    test('Agent Tools.json should be properly formatted', () => {
      const content = fs.readFileSync(agentToolsPath, 'utf-8');
      const parsed = JSON.parse(content);
      const reformatted = JSON.stringify(parsed, null, 2);
      
      // Should be able to parse and reformat without errors
      expect(() => JSON.parse(reformatted)).not.toThrow();
    });

    test('Agent Tools.json should use consistent indentation', () => {
      const content = fs.readFileSync(agentToolsPath, 'utf-8');
      const lines = content.split('\n');
      
      // Check that indentation is consistent (2 spaces)
      const indentedLines = lines.filter(line => line.match(/^\s+\S/));
      indentedLines.forEach(line => {
        const spaces = line.match(/^(\s+)/)?.[1].length || 0;
        expect(spaces % 2).toBe(0); // Should be multiple of 2
      });
    });
  });
});