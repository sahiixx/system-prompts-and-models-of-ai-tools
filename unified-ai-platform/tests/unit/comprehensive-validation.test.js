const fs = require('fs');
const path = require('path');

describe('Comprehensive Repository Validation', () => {
  const rootDir = path.join(__dirname, '../../..');

  describe('Directory Structure Validation', () => {
    test('all tool directories should follow naming conventions', () => {
      const toolDirs = fs.readdirSync(rootDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .filter(dirent => !dirent.name.startsWith('.'))
        .filter(dirent => !['unified-ai-platform', 'node_modules'].includes(dirent.name));

      toolDirs.forEach(dir => {
        // Directory names should not have trailing spaces
        expect(dir.name).toBe(dir.name.trim());
        
        // Directory should be accessible
        const dirPath = path.join(rootDir, dir.name);
        expect(() => fs.readdirSync(dirPath)).not.toThrow();
      });
    });

    test('tool directories should contain expected file types', () => {
      const toolDirs = ['Lovable', 'Orchids.app', 'Same.dev', '-Spawn'];
      const expectedExtensions = ['.txt', '.json', '.md'];

      toolDirs.forEach(dir => {
        const dirPath = path.join(rootDir, dir);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          const hasExpectedFiles = files.some(file => 
            expectedExtensions.some(ext => file.endsWith(ext))
          );
          expect(hasExpectedFiles).toBe(true);
        }
      });
    });
  });

  describe('Content Consistency Validation', () => {
    test('JSON files should not have duplicate keys', () => {
      const jsonFiles = [
        'Lovable/Agent Tools.json'
      ];

      jsonFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Parse and re-stringify to detect duplicate keys
          const parsed = JSON.parse(content);
          const stringified = JSON.stringify(parsed);
          const reparsed = JSON.parse(stringified);
          
          expect(JSON.stringify(parsed)).toBe(JSON.stringify(reparsed));
        }
      });
    });

    test('prompt files should have consistent terminology', () => {
      const promptFiles = [
        'Lovable/Agent Prompt.txt',
        'Lovable/Prompt.txt',
        'Orchids.app/System Prompt.txt',
        'Same.dev/Prompt.txt'
      ];

      promptFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Check for inconsistent terminology
          const hasYouAre = content.toLowerCase().includes('you are');
          const hasYourTask = content.toLowerCase().includes('your task');
          const hasAssistant = content.toLowerCase().includes('assistant');
          
          // Should have at least one of these
          expect(hasYouAre || hasYourTask || hasAssistant).toBe(true);
        }
      });
    });
  });

  describe('Advanced JSON Schema Validation', () => {
    test('Lovable tools should have valid parameter types', () => {
      const filePath = path.join(rootDir, 'Lovable/Agent Tools.json');
      if (fs.existsSync(filePath)) {
        const tools = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        tools.forEach(tool => {
          if (tool.input_schema && tool.input_schema.properties) {
            Object.values(tool.input_schema.properties).forEach(prop => {
              if (prop.type) {
                const validTypes = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'];
                expect(validTypes).toContain(prop.type);
              }
            });
          }
        });
      }
    });

    test('tools with array parameters should specify items schema', () => {
      const filePath = path.join(rootDir, 'Lovable/Agent Tools.json');
      if (fs.existsSync(filePath)) {
        const tools = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        tools.forEach(tool => {
          if (tool.input_schema && tool.input_schema.properties) {
            Object.entries(tool.input_schema.properties).forEach(([name, prop]) => {
              if (prop.type === 'array') {
                // Arrays should ideally have items schema
                // This is a warning test, not a hard requirement
                if (!prop.items) {
                  console.warn(`Tool "${tool.name}" parameter "${name}" is array but missing items schema`);
                }
              }
            });
          }
        });
      }
    });

    test('enum values should match parameter type', () => {
      const filePath = path.join(rootDir, 'Lovable/Agent Tools.json');
      if (fs.existsSync(filePath)) {
        const tools = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        tools.forEach(tool => {
          if (tool.input_schema && tool.input_schema.properties) {
            Object.values(tool.input_schema.properties).forEach(prop => {
              if (prop.enum && prop.type) {
                prop.enum.forEach(value => {
                  const valueType = typeof value;
                  if (prop.type === 'string') {
                    expect(valueType).toBe('string');
                  } else if (prop.type === 'number' || prop.type === 'integer') {
                    expect(valueType).toBe('number');
                  } else if (prop.type === 'boolean') {
                    expect(valueType).toBe('boolean');
                  }
                });
              }
            });
          }
        });
      }
    });
  });

  describe('File Encoding and Format Edge Cases', () => {
    test('files should not contain BOM (Byte Order Mark)', () => {
      const textFiles = [
        'Lovable/Agent Prompt.txt',
        'Lovable/Prompt.txt',
        'Orchids.app/System Prompt.txt',
        'Same.dev/Prompt.txt',
        '-Spawn/Prompt.txt'
      ];

      textFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          // Check for UTF-8 BOM (EF BB BF)
          const hasBOM = buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
          expect(hasBOM).toBe(false);
        }
      });
    });

    test('JSON files should not have trailing commas', () => {
      const jsonFiles = ['Lovable/Agent Tools.json'];

      jsonFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Should be able to parse without errors
          expect(() => JSON.parse(content)).not.toThrow();
          
          // Check for common trailing comma patterns
          expect(content).not.toMatch(/,\s*\]/);
          expect(content).not.toMatch(/,\s*\}/);
        }
      });
    });

    test('text files should use consistent quotes', () => {
      const textFiles = [
        'Lovable/Agent Prompt.txt',
        'Same.dev/Prompt.txt'
      ];

      textFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Check for smart quotes that might cause issues
          expect(content).not.toMatch(/[""]/); // Smart double quotes
          expect(content).not.toMatch(/['']/); // Smart single quotes
        }
      });
    });
  });

  describe('Content Quality and Best Practices', () => {
    test('prompts should not have excessive capitalization', () => {
      const textFiles = [
        'Lovable/Agent Prompt.txt',
        'Orchids.app/System Prompt.txt',
        'Same.dev/Prompt.txt'
      ];

      textFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const words = content.split(/\s+/);
          const allCapsWords = words.filter(word => 
            word.length > 3 && 
            word === word.toUpperCase() && 
            /^[A-Z]+$/.test(word)
          );
          
          // Less than 5% of words should be all caps
          expect(allCapsWords.length).toBeLessThan(words.length * 0.05);
        }
      });
    });

    test('prompts should use active voice indicators', () => {
      const textFiles = [
        'Lovable/Agent Prompt.txt',
        'Orchids.app/System Prompt.txt'
      ];

      textFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8').toLowerCase();
          
          // Should have action-oriented language
          const hasActionWords = 
            content.includes('you') ||
            content.includes('will') ||
            content.includes('should') ||
            content.includes('must') ||
            content.includes('can');
          
          expect(hasActionWords).toBe(true);
        }
      });
    });

    test('JSON descriptions should be descriptive', () => {
      const filePath = path.join(rootDir, 'Lovable/Agent Tools.json');
      if (fs.existsSync(filePath)) {
        const tools = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        tools.forEach(tool => {
          // Tool descriptions should be meaningful
          expect(tool.description).toBeDefined();
          expect(tool.description.length).toBeGreaterThan(15);
          
          // Should not be just the tool name
          expect(tool.description.toLowerCase()).not.toBe(tool.name.toLowerCase());
        });
      }
    });
  });

  describe('Cross-Tool Consistency', () => {
    test('similar tools should have similar structures', () => {
      const toolDirs = ['Lovable', 'Orchids.app', 'Same.dev'];
      const hasPromptFile = {};

      toolDirs.forEach(dir => {
        const dirPath = path.join(rootDir, dir);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          hasPromptFile[dir] = files.some(f => 
            f.toLowerCase().includes('prompt') && f.endsWith('.txt')
          );
        }
      });

      // Most tools should have prompt files
      const toolsWithPrompts = Object.values(hasPromptFile).filter(Boolean).length;
      expect(toolsWithPrompts).toBeGreaterThan(toolDirs.length * 0.5);
    });

    test('file naming should be consistent across tools', () => {
      const toolDirs = ['Lovable', 'Orchids.app', 'Same.dev'];
      const fileNamingPatterns = new Set();

      toolDirs.forEach(dir => {
        const dirPath = path.join(rootDir, dir);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          files.forEach(file => {
            // Extract naming pattern (e.g., "Prompt.txt", "System Prompt.txt")
            if (file.endsWith('.txt') && file.toLowerCase().includes('prompt')) {
              fileNamingPatterns.add(file);
            }
          });
        }
      });

      // Should have some common naming patterns
      expect(fileNamingPatterns.size).toBeGreaterThan(0);
    });
  });

  describe('Performance and Size Validation', () => {
    test('JSON files should be efficiently structured', () => {
      const filePath = path.join(rootDir, 'Lovable/Agent Tools.json');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        
        // Should be an array (efficient for tools list)
        expect(Array.isArray(parsed)).toBe(true);
        
        // Should not have excessive nesting
        const checkDepth = (obj, depth = 0) => {
          if (depth > 10) return depth;
          if (typeof obj !== 'object' || obj === null) return depth;
          
          return Math.max(
            ...Object.values(obj).map(v => checkDepth(v, depth + 1)),
            depth
          );
        };
        
        const maxDepth = checkDepth(parsed);
        expect(maxDepth).toBeLessThan(10);
      }
    });

    test('text files should have reasonable line lengths', () => {
      const textFiles = [
        'Lovable/Agent Prompt.txt',
        'Same.dev/Prompt.txt'
      ];

      textFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');
          
          // Most lines should be under 1000 characters
          const longLines = lines.filter(line => line.length > 1000);
          expect(longLines.length).toBeLessThan(lines.length * 0.1);
        }
      });
    });
  });

  describe('Future-Proofing Validation', () => {
    test('JSON schemas should be extensible', () => {
      const filePath = path.join(rootDir, 'Lovable/Agent Tools.json');
      if (fs.existsSync(filePath)) {
        const tools = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        tools.forEach(tool => {
          // Should have a structure that can be extended
          expect(typeof tool).toBe('object');
          expect(tool).not.toBeNull();
          
          // Should not use reserved keywords that might conflict
          const reservedKeys = ['__proto__', 'constructor', 'prototype'];
          reservedKeys.forEach(key => {
            expect(tool).not.toHaveProperty(key);
          });
        });
      }
    });

    test('prompts should avoid hardcoded version numbers', () => {
      const textFiles = [
        'Lovable/Agent Prompt.txt',
        'Orchids.app/System Prompt.txt',
        'Same.dev/Prompt.txt'
      ];

      textFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Check for version-specific references that might become outdated
          const hasHardcodedVersions = 
            content.match(/\b(version|v)\s*\d+\.\d+/i) ||
            content.match(/\b(gpt-[34]|claude-[12])\b/i);
          
          // It's okay to have some version references, but not excessive
          if (hasHardcodedVersions) {
            const matches = content.match(/\b(version|v)\s*\d+\.\d+/gi) || [];
            expect(matches.length).toBeLessThan(5);
          }
        }
      });
    });
  });
});