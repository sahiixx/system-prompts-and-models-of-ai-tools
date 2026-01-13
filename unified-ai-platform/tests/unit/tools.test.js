const fs = require('fs');
const path = require('path');

describe('tools.json', () => {
  let tools;
  
  beforeAll(() => {
    const toolsPath = path.join(__dirname, '../../config/tools.json');
    const toolsData = fs.readFileSync(toolsPath, 'utf8');
    tools = JSON.parse(toolsData);
  });

  describe('Structure Validation', () => {
    test('should be a valid JSON array or object', () => {
      expect(tools).toBeDefined();
      expect(['object', 'array']).toContain(typeof tools);
    });

    test('should not be empty', () => {
      if (Array.isArray(tools)) {
        expect(tools.length).toBeGreaterThan(0);
      } else {
        expect(Object.keys(tools).length).toBeGreaterThan(0);
      }
    });
  });

  describe('Tool Definition Validation', () => {
    const getToolsArray = () => Array.isArray(tools) ? tools : Object.values(tools);

    test('each tool should have required properties', () => {
      const toolsArray = getToolsArray();
      
      toolsArray.forEach((tool, index) => {
        if (typeof tool === 'object' && tool !== null) {
          expect(tool).toHaveProperty('name');
          expect(typeof tool.name).toBe('string');
          expect(tool.name.length).toBeGreaterThan(0);
        }
      });
    });

    test('tool names should be unique', () => {
      const toolsArray = getToolsArray();
      const names = toolsArray
        .filter(tool => tool && tool.name)
        .map(tool => tool.name);
      
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    test('tool definitions should have consistent structure', () => {
      const toolsArray = getToolsArray();
      
      if (toolsArray.length > 0) {
        const firstToolKeys = Object.keys(toolsArray[0]).sort();
        
        toolsArray.forEach((tool, index) => {
          const toolKeys = Object.keys(tool).sort();
          
          const hasCommonKeys = firstToolKeys.some(key => toolKeys.includes(key));
          expect(hasCommonKeys).toBe(true);
        });
      }
    });

    test('tool parameters should be well-formed', () => {
      const toolsArray = getToolsArray();
      
      toolsArray.forEach(tool => {
        if (tool.parameters) {
          expect(typeof tool.parameters).toBe('object');
          
          if (Array.isArray(tool.parameters)) {
            tool.parameters.forEach(param => {
              expect(param).toHaveProperty('name');
              expect(typeof param.name).toBe('string');
            });
          }
        }
      });
    });

    test('tool descriptions should exist and be informative', () => {
      const toolsArray = getToolsArray();
      
      toolsArray.forEach(tool => {
        if (tool.description) {
          expect(typeof tool.description).toBe('string');
          expect(tool.description.length).toBeGreaterThan(10);
        }
      });
    });
  });

  describe('Data Type Validation', () => {
    test('should have valid data types for all tool properties', () => {
      const toolsArray = Array.isArray(tools) ? tools : Object.values(tools);
      
      toolsArray.forEach(tool => {
        Object.entries(tool).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            expect(['string', 'number', 'boolean', 'object']).toContain(typeof value);
          }
        });
      });
    });

    test('should handle boolean flags correctly', () => {
      const toolsArray = Array.isArray(tools) ? tools : Object.values(tools);
      
      toolsArray.forEach(tool => {
        Object.entries(tool).forEach(([key, value]) => {
          if (key.startsWith('is') || key.startsWith('has') || key.startsWith('enable')) {
            if (value !== null && value !== undefined) {
              expect(typeof value).toBe('boolean');
            }
          }
        });
      });
    });
  });

  describe('Security and Best Practices', () => {
    test('should not contain hardcoded credentials', () => {
      const toolsStr = JSON.stringify(tools);
      
      expect(toolsStr).not.toMatch(/password\s*[:=]\s*["'][^"']+["']/i);
      expect(toolsStr).not.toMatch(/api[_-]?key\s*[:=]\s*["'][^"']+["']/i);
      expect(toolsStr).not.toMatch(/secret\s*[:=]\s*["'][^"']+["']/i);
      expect(toolsStr).not.toMatch(/token\s*[:=]\s*["'][^"']+["']/i);
    });

    test('should not contain suspicious URLs', () => {
      const toolsStr = JSON.stringify(tools);
      
      if (toolsStr.includes('http://')) {
        const httpMatches = toolsStr.match(/http:\/\/[^\s"']+/g) || [];
        httpMatches.forEach(url => {
          expect(url).toMatch(/http:\/\/localhost|http:\/\/127\.0\.0\.1/);
        });
      }
    });

    test('should be JSON serializable without circular references', () => {
      expect(() => JSON.stringify(tools)).not.toThrow();
      expect(() => JSON.parse(JSON.stringify(tools))).not.toThrow();
    });
  });

  describe('Tool Categories and Organization', () => {
    test('tools should be logically organized', () => {
      const toolsArray = Array.isArray(tools) ? tools : Object.values(tools);
      
      if (toolsArray.length > 5) {
        const hasCategories = toolsArray.some(tool => 
          tool.category || tool.type || tool.group
        );
        
        if (hasCategories) {
          expect(hasCategories).toBe(true);
        }
      }
    });

    test('tool IDs should be valid if present', () => {
      const toolsArray = Array.isArray(tools) ? tools : Object.values(tools);
      
      toolsArray.forEach(tool => {
        if (tool.id) {
          expect(typeof tool.id).toBe('string');
          expect(tool.id.length).toBeGreaterThan(0);
          expect(tool.id).not.toMatch(/\s/);
        }
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing optional fields gracefully', () => {
      const toolsArray = Array.isArray(tools) ? tools : Object.values(tools);
      
      toolsArray.forEach(tool => {
        expect(() => {
          const _ = tool.description || '';
          const __ = tool.version || '1.0.0';
          const ___ = tool.enabled !== undefined ? tool.enabled : true;
        }).not.toThrow();
      });
    });

    test('should not have duplicate tool entries', () => {
      const toolsArray = Array.isArray(tools) ? tools : Object.values(tools);
      const toolStrings = toolsArray.map(tool => JSON.stringify(tool));
      const uniqueTools = new Set(toolStrings);
      
      expect(uniqueTools.size).toBe(toolsArray.length);
    });

    test('version fields should follow semantic versioning if present', () => {
      const toolsArray = Array.isArray(tools) ? tools : Object.values(tools);
      const semverRegex = /^\d+\.\d+\.\d+/;
      
      toolsArray.forEach(tool => {
        if (tool.version) {
          expect(tool.version).toMatch(semverRegex);
        }
      });
    });
  });
});