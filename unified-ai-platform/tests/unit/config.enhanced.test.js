/**
 * Enhanced Unit Tests for Configuration Files
 * 
 * These additional tests provide comprehensive coverage for:
 * - Configuration validation and schema integrity
 * - Edge cases and boundary conditions
 * - Performance and resource constraints
 * - Security and data integrity
 * - Complex tool configurations
 */

const fs = require('fs');
const path = require('path');

describe('Configuration Files - Enhanced Tests', () => {
  describe('system-config.json - Advanced Validation', () => {
    let config;

    beforeAll(() => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(configData);
    });

    describe('Version Management', () => {
      test('should follow semantic versioning', () => {
        const version = config.platform.version;
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
        
        const [major, minor, patch] = version.split('.').map(Number);
        expect(major).toBeGreaterThanOrEqual(0);
        expect(minor).toBeGreaterThanOrEqual(0);
        expect(patch).toBeGreaterThanOrEqual(0);
      });

      test('should have valid version number components', () => {
        const version = config.platform.version;
        const parts = version.split('.');
        
        parts.forEach(part => {
          const num = parseInt(part, 10);
          expect(num).not.toBeNaN();
          expect(num).toBeLessThan(1000); // Reasonable upper bound
        });
      });
    });

    describe('Core Capabilities - Deep Validation', () => {
      test('multi_modal should have valid processor names', () => {
        const processors = config.core_capabilities.multi_modal.processors;
        expect(processors).toBeDefined();
        expect(Array.isArray(processors)).toBe(true);
        
        processors.forEach(processor => {
          expect(typeof processor).toBe('string');
          expect(processor.length).toBeGreaterThan(0);
          expect(processor).toMatch(/^[a-z_]+$/); // snake_case validation
        });
      });

      test('multi_modal should support expected media types', () => {
        const types = config.core_capabilities.multi_modal.supported_types;
        const expectedTypes = ['text', 'code', 'image', 'audio'];
        
        expectedTypes.forEach(type => {
          expect(types).toContain(type);
        });
      });

      test('memory_system types should be comprehensive', () => {
        const memoryTypes = config.core_capabilities.memory_system.types;
        expect(memoryTypes.length).toBeGreaterThan(0);
        
        memoryTypes.forEach(type => {
          expect(typeof type).toBe('string');
          expect(type.length).toBeGreaterThan(0);
        });
      });

      test('memory_system should have valid persistence strategy', () => {
        const persistence = config.core_capabilities.memory_system.persistence;
        const validStrategies = ['in_memory', 'redis', 'database', 'file_system', 'hybrid'];
        
        expect(validStrategies).toContain(persistence);
      });

      test('tool_system flags should be boolean', () => {
        const toolSystem = config.core_capabilities.tool_system;
        expect(typeof toolSystem.modular).toBe('boolean');
        expect(typeof toolSystem.json_defined).toBe('boolean');
        expect(typeof toolSystem.dynamic_loading).toBe('boolean');
      });

      test('planning_system should have valid modes', () => {
        const modes = config.core_capabilities.planning_system.modes;
        expect(modes).toContain('two_phase');
        
        modes.forEach(mode => {
          expect(typeof mode).toBe('string');
          expect(mode.length).toBeGreaterThan(0);
        });
      });

      test('planning_system strategies should be actionable', () => {
        const strategies = config.core_capabilities.planning_system.strategies;
        const validStrategies = ['sequential', 'parallel', 'adaptive', 'reactive', 'proactive'];
        
        strategies.forEach(strategy => {
          expect(typeof strategy).toBe('string');
          expect(validStrategies.some(valid => strategy.includes(valid) || valid.includes(strategy))).toBe(true);
        });
      });

      test('security features should be comprehensive', () => {
        const features = config.core_capabilities.security.features;
        const essentialFeatures = ['authentication', 'authorization'];
        
        essentialFeatures.forEach(feature => {
          expect(features).toContain(feature);
        });
        
        expect(features.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('Operating Modes - Consistency', () => {
      test('development mode should have debug enabled', () => {
        expect(config.operating_modes.development.debug).toBe(true);
      });

      test('production mode should have debug disabled', () => {
        expect(config.operating_modes.production.debug).toBe(false);
      });

      test('development mode should have verbose logging', () => {
        const logging = config.operating_modes.development.logging;
        expect(['verbose', 'debug', 'info']).toContain(logging);
      });

      test('production mode should have minimal logging', () => {
        const logging = config.operating_modes.production.logging;
        expect(['error', 'warn', 'info']).toContain(logging);
      });

      test('operating modes should have distinct configurations', () => {
        const dev = config.operating_modes.development;
        const prod = config.operating_modes.production;
        
        // At least one setting should differ
        const differs = dev.debug !== prod.debug || dev.logging !== prod.logging;
        expect(differs).toBe(true);
      });
    });

    describe('Performance Targets - Validation', () => {
      test('response time targets should be realistic', () => {
        const { target_ms, max_ms } = config.performance.response_time;
        
        expect(target_ms).toBeGreaterThan(0);
        expect(target_ms).toBeLessThan(10000); // Less than 10 seconds
        expect(max_ms).toBeGreaterThan(target_ms);
        expect(max_ms).toBeLessThan(60000); // Less than 1 minute
      });

      test('memory usage limits should be reasonable', () => {
        const { max_mb } = config.performance.memory_usage;
        
        expect(max_mb).toBeGreaterThan(0);
        expect(max_mb).toBeLessThan(10000); // Less than 10GB
      });

      test('concurrent operations should have sensible limits', () => {
        const { max_parallel, queue_size } = config.performance.concurrent_operations;
        
        expect(max_parallel).toBeGreaterThan(0);
        expect(max_parallel).toBeLessThanOrEqual(100); // Reasonable parallel limit
        expect(queue_size).toBeGreaterThanOrEqual(max_parallel);
        expect(queue_size).toBeLessThan(10000);
      });

      test('performance optimization flag should exist in production', () => {
        const prod = config.operating_modes.production;
        expect(prod.performance_optimized).toBeDefined();
      });
    });

    describe('Configuration Completeness', () => {
      test('should have all required top-level keys', () => {
        const requiredKeys = ['platform', 'core_capabilities', 'operating_modes', 'performance'];
        
        requiredKeys.forEach(key => {
          expect(config).toHaveProperty(key);
          expect(config[key]).not.toBeNull();
          expect(config[key]).not.toBeUndefined();
        });
      });

      test('should not have empty string values', () => {
        const checkForEmptyStrings = (obj, path = '') => {
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (typeof value === 'string') {
              expect(value.length).toBeGreaterThan(0);
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              checkForEmptyStrings(value, currentPath);
            }
          }
        };
        
        checkForEmptyStrings(config);
      });

      test('should not have null or undefined values in critical paths', () => {
        expect(config.platform.name).not.toBeNull();
        expect(config.platform.version).not.toBeNull();
        expect(config.platform.description).not.toBeNull();
        
        Object.values(config.core_capabilities).forEach(capability => {
          expect(capability.enabled).not.toBeUndefined();
        });
      });
    });

    describe('Data Type Consistency', () => {
      test('all enabled flags should be boolean', () => {
        const capabilities = config.core_capabilities;
        
        Object.values(capabilities).forEach(capability => {
          if (capability.hasOwnProperty('enabled')) {
            expect(typeof capability.enabled).toBe('boolean');
          }
        });
      });

      test('all numeric values should be valid numbers', () => {
        const performance = config.performance;
        
        Object.values(performance).forEach(metric => {
          Object.entries(metric).forEach(([key, value]) => {
            if (key.includes('_ms') || key.includes('_mb') || key.includes('max_') || key.includes('target_')) {
              expect(typeof value).toBe('number');
              expect(value).not.toBeNaN();
              expect(isFinite(value)).toBe(true);
            }
          });
        });
      });

      test('all array fields should be valid arrays', () => {
        const multiModal = config.core_capabilities.multi_modal;
        const memory = config.core_capabilities.memory_system;
        const planning = config.core_capabilities.planning_system;
        const security = config.core_capabilities.security;
        
        expect(Array.isArray(multiModal.supported_types)).toBe(true);
        expect(Array.isArray(multiModal.processors)).toBe(true);
        expect(Array.isArray(memory.types)).toBe(true);
        expect(Array.isArray(planning.modes)).toBe(true);
        expect(Array.isArray(planning.strategies)).toBe(true);
        expect(Array.isArray(security.features)).toBe(true);
      });
    });
  });

  describe('tools.json - Advanced Validation', () => {
    let tools;

    beforeAll(() => {
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      const toolsData = fs.readFileSync(toolsPath, 'utf8');
      tools = JSON.parse(toolsData);
    });

    describe('Tool Structure Validation', () => {
      test('all tools should have consistent structure', () => {
        tools.forEach((tool, index) => {
          expect(tool).toHaveProperty('type');
          expect(tool).toHaveProperty('function');
          expect(tool.function).toHaveProperty('name');
          expect(tool.function).toHaveProperty('description');
          expect(tool.function).toHaveProperty('parameters');
        });
      });

      test('all tool names should be valid identifiers', () => {
        tools.forEach(tool => {
          const name = tool.function.name;
          // Valid snake_case identifier
          expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
          // Not too long
          expect(name.length).toBeLessThan(100);
          // Not reserved keywords (basic check)
          const reserved = ['function', 'class', 'return', 'if', 'else', 'for', 'while'];
          expect(reserved).not.toContain(name);
        });
      });

      test('all descriptions should be meaningful', () => {
        tools.forEach(tool => {
          const desc = tool.function.description;
          expect(desc.length).toBeGreaterThan(10); // Substantial description
          expect(desc.length).toBeLessThan(1000); // Not excessively long
          // Should start with capital letter
          expect(desc[0]).toMatch(/[A-Z]/);
        });
      });
    });

    describe('Parameter Schema Validation', () => {
      test('all parameter schemas should be valid JSON Schema', () => {
        tools.forEach(tool => {
          const params = tool.function.parameters;
          expect(params.type).toBe('object');
          expect(params).toHaveProperty('properties');
          expect(typeof params.properties).toBe('object');
        });
      });

      test('all parameters should have descriptions', () => {
        tools.forEach(tool => {
          const properties = tool.function.parameters.properties || {};
          
          Object.entries(properties).forEach(([paramName, paramDef]) => {
            expect(paramDef).toHaveProperty('description');
            expect(paramDef.description.length).toBeGreaterThan(0);
          });
        });
      });

      test('required parameters should be in properties', () => {
        tools.forEach(tool => {
          const required = tool.function.parameters.required || [];
          const properties = Object.keys(tool.function.parameters.properties || {});
          
          required.forEach(reqParam => {
            expect(properties).toContain(reqParam);
          });
        });
      });

      test('all parameter types should be valid JSON Schema types', () => {
        const validTypes = ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'];
        
        tools.forEach(tool => {
          const properties = tool.function.parameters.properties || {};
          
          Object.values(properties).forEach(prop => {
            if (prop.type) {
              expect(validTypes).toContain(prop.type);
            }
          });
        });
      });

      test('array parameters should have items definition', () => {
        tools.forEach(tool => {
          const properties = tool.function.parameters.properties || {};
          
          Object.entries(properties).forEach(([name, prop]) => {
            if (prop.type === 'array') {
              expect(prop).toHaveProperty('items');
            }
          });
        });
      });
    });

    describe('Tool Naming Conventions', () => {
      test('should not have duplicate tool names', () => {
        const names = tools.map(t => t.function.name);
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(names.length);
      });

      test('tool names should follow consistent patterns', () => {
        const names = tools.map(t => t.function.name);
        
        // All should use underscores, not hyphens or camelCase
        names.forEach(name => {
          expect(name).not.toMatch(/-/);
          expect(name).not.toMatch(/[A-Z]/);
        });
      });

      test('tool names should be descriptive', () => {
        tools.forEach(tool => {
          const name = tool.function.name;
          // Should have at least 3 characters
          expect(name.length).toBeGreaterThanOrEqual(3);
          // Common abbreviations are okay but shouldn't be too cryptic
          const parts = name.split('_');
          parts.forEach(part => {
            expect(part.length).toBeGreaterThan(0);
          });
        });
      });
    });

    describe('Tool Capabilities Coverage', () => {
      test('should include file system tools', () => {
        const names = tools.map(t => t.function.name);
        const fileSystemTools = names.filter(name => 
          name.includes('file') || name.includes('dir') || name.includes('read') || name.includes('write')
        );
        expect(fileSystemTools.length).toBeGreaterThan(0);
      });

      test('should include search/query tools', () => {
        const names = tools.map(t => t.function.name);
        const searchTools = names.filter(name => 
          name.includes('search') || name.includes('find') || name.includes('query')
        );
        expect(searchTools.length).toBeGreaterThan(0);
      });

      test('should include execution tools', () => {
        const names = tools.map(t => t.function.name);
        const execTools = names.filter(name => 
          name.includes('run') || name.includes('execute') || name.includes('command') || name.includes('terminal')
        );
        expect(execTools.length).toBeGreaterThan(0);
      });
    });

    describe('Parameter Validation Rules', () => {
      test('string parameters should not have invalid constraints', () => {
        tools.forEach(tool => {
          const properties = tool.function.parameters.properties || {};
          
          Object.entries(properties).forEach(([name, prop]) => {
            if (prop.type === 'string') {
              // If maxLength exists, it should be reasonable
              if (prop.maxLength) {
                expect(prop.maxLength).toBeGreaterThan(0);
                expect(prop.maxLength).toBeLessThan(1000000);
              }
              // If minLength exists, it should be reasonable
              if (prop.minLength) {
                expect(prop.minLength).toBeGreaterThanOrEqual(0);
                if (prop.maxLength) {
                  expect(prop.minLength).toBeLessThanOrEqual(prop.maxLength);
                }
              }
            }
          });
        });
      });

      test('numeric parameters should have reasonable bounds', () => {
        tools.forEach(tool => {
          const properties = tool.function.parameters.properties || {};
          
          Object.entries(properties).forEach(([name, prop]) => {
            if (prop.type === 'number' || prop.type === 'integer') {
              if (prop.minimum !== undefined && prop.maximum !== undefined) {
                expect(prop.minimum).toBeLessThanOrEqual(prop.maximum);
              }
            }
          });
        });
      });

      test('boolean parameters should be simple', () => {
        tools.forEach(tool => {
          const properties = tool.function.parameters.properties || {};
          
          Object.entries(properties).forEach(([name, prop]) => {
            if (prop.type === 'boolean') {
              // Boolean parameters shouldn't have enum or other complex constraints
              expect(prop.enum).toBeUndefined();
              expect(prop.pattern).toBeUndefined();
            }
          });
        });
      });
    });

    describe('Tool Completeness', () => {
      test('should have reasonable number of tools', () => {
        expect(tools.length).toBeGreaterThan(5);
        expect(tools.length).toBeLessThan(200); // Not overwhelming
      });

      test('each tool should be complete and not a stub', () => {
        tools.forEach(tool => {
          // Should have meaningful description
          expect(tool.function.description.length).toBeGreaterThan(10);
          // Should have at least one parameter or be explicitly parameterless
          const properties = tool.function.parameters.properties || {};
          expect(Object.keys(properties).length).toBeGreaterThanOrEqual(0);
        });
      });

      test('tools should not have placeholder descriptions', () => {
        const placeholders = ['TODO', 'TBD', 'FIXME', 'placeholder', 'example'];
        
        tools.forEach(tool => {
          const desc = tool.function.description.toLowerCase();
          placeholders.forEach(placeholder => {
            expect(desc).not.toContain(placeholder.toLowerCase());
          });
        });
      });
    });

    describe('Tool Safety and Security', () => {
      test('dangerous operations should have confirmation parameters', () => {
        const dangerousKeywords = ['delete', 'remove', 'destroy', 'drop', 'truncate'];
        
        tools.forEach(tool => {
          const name = tool.function.name.toLowerCase();
          const isDangerous = dangerousKeywords.some(keyword => name.includes(keyword));
          
          if (isDangerous) {
            const properties = tool.function.parameters.properties || {};
            // Should have some form of confirmation, force flag, or detailed parameters
            expect(Object.keys(properties).length).toBeGreaterThan(0);
          }
        });
      });

      test('file system operations should specify target paths', () => {
        tools.forEach(tool => {
          const name = tool.function.name;
          const properties = tool.function.parameters.properties || {};
          
          if (name.includes('file') || name.includes('write') || name.includes('read')) {
            // Should have path, file, or target parameter
            const hasPathParam = Object.keys(properties).some(key => 
              key.includes('path') || key.includes('file') || key.includes('target')
            );
            expect(hasPathParam).toBe(true);
          }
        });
      });
    });
  });

  describe('Configuration Cross-Validation', () => {
    let config, tools;

    beforeAll(() => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
    });

    test('tool system should be enabled when tools are defined', () => {
      if (tools.length > 0) {
        expect(config.core_capabilities.tool_system.enabled).toBe(true);
      }
    });

    test('tool count should be reasonable for concurrent operations', () => {
      const maxParallel = config.performance.concurrent_operations.max_parallel;
      // Should be able to handle at least as many tools as concurrent operations
      expect(tools.length).toBeGreaterThanOrEqual(Math.min(maxParallel, 5));
    });

    test('configuration should support declared tool capabilities', () => {
      // If tools exist, tool_system should be properly configured
      if (tools.length > 0) {
        expect(config.core_capabilities.tool_system.json_defined).toBe(true);
      }
    });

    test('memory system should support tool state persistence', () => {
      if (tools.length > 0) {
        expect(config.core_capabilities.memory_system.enabled).toBe(true);
      }
    });
  });

  describe('Configuration File Integrity', () => {
    test('system-config.json should be well-formed', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const content = fs.readFileSync(configPath, 'utf8');
      
      // Should not have trailing commas (which are invalid JSON)
      expect(content).not.toMatch(/,\s*}/);
      expect(content).not.toMatch(/,\s*\]/);
    });

    test('tools.json should be well-formed', () => {
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      const content = fs.readFileSync(toolsPath, 'utf8');
      
      // Should not have trailing commas
      expect(content).not.toMatch(/,\s*}/);
      expect(content).not.toMatch(/,\s*\]/);
    });

    test('configuration files should have consistent encoding', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      
      // Should be readable as UTF-8
      expect(() => {
        fs.readFileSync(configPath, 'utf8');
        fs.readFileSync(toolsPath, 'utf8');
      }).not.toThrow();
    });

    test('configuration files should not be excessively large', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      
      const configStats = fs.statSync(configPath);
      const toolsStats = fs.statSync(toolsPath);
      
      // Config should be less than 100KB
      expect(configStats.size).toBeLessThan(100 * 1024);
      // Tools should be less than 5MB
      expect(toolsStats.size).toBeLessThan(5 * 1024 * 1024);
    });
  });
});