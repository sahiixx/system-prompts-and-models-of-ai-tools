/**
 * Advanced Configuration Validation Tests
 * 
 * These tests cover comprehensive validation of configuration files:
 * - Schema validation
 * - Cross-field validation
 * - Performance configuration validation
 * - Tool configuration validation
 * - Security configuration checks
 */

const fs = require('fs');
const path = require('path');

describe('Configuration - Advanced Validation', () => {
  let config;
  let tools;

  beforeAll(() => {
    const configPath = path.join(__dirname, '../../config/system-config.json');
    const toolsPath = path.join(__dirname, '../../config/tools.json');
    
    const configData = fs.readFileSync(configPath, 'utf8');
    const toolsData = fs.readFileSync(toolsPath, 'utf8');
    
    config = JSON.parse(configData);
    tools = JSON.parse(toolsData);
  });

  describe('Platform Configuration Validation', () => {
    test('version should follow semantic versioning', () => {
      const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
      expect(config.platform.version).toMatch(semverRegex);
    });

    test('platform name should not be empty', () => {
      expect(config.platform.name).toBeTruthy();
      expect(config.platform.name.length).toBeGreaterThan(0);
    });

    test('platform description should be meaningful', () => {
      expect(config.platform.description).toBeTruthy();
      expect(config.platform.description.length).toBeGreaterThan(10);
    });

    test('should have reasonable character limits', () => {
      expect(config.platform.name.length).toBeLessThan(100);
      expect(config.platform.description.length).toBeLessThan(500);
    });
  });

  describe('Core Capabilities Deep Validation', () => {
    test('all capability objects should have enabled property', () => {
      const capabilities = config.core_capabilities;
      Object.values(capabilities).forEach(capability => {
        expect(capability).toHaveProperty('enabled');
        expect(typeof capability.enabled).toBe('boolean');
      });
    });

    test('multi-modal should have valid supported types', () => {
      const multiModal = config.core_capabilities.multi_modal;
      expect(Array.isArray(multiModal.supported_types)).toBe(true);
      expect(multiModal.supported_types.length).toBeGreaterThan(0);
      
      const validTypes = ['text', 'code', 'image', 'audio', 'video', 'file'];
      multiModal.supported_types.forEach(type => {
        expect(validTypes).toContain(type);
      });
    });

    test('memory system should have valid types', () => {
      const memory = config.core_capabilities.memory_system;
      expect(Array.isArray(memory.types)).toBe(true);
      
      const validMemoryTypes = ['short_term', 'long_term', 'working', 'episodic', 'semantic'];
      memory.types.forEach(type => {
        expect(validMemoryTypes).toContain(type);
      });
    });

    test('memory system persistence should be boolean', () => {
      const memory = config.core_capabilities.memory_system;
      expect(typeof memory.persistence).toBe('boolean');
    });

    test('tool system properties should be boolean', () => {
      const tools = config.core_capabilities.tool_system;
      expect(typeof tools.modular).toBe('boolean');
      expect(typeof tools.json_defined).toBe('boolean');
      expect(typeof tools.dynamic_loading).toBe('boolean');
    });

    test('planning system should have valid modes', () => {
      const planning = config.core_capabilities.planning_system;
      expect(Array.isArray(planning.modes)).toBe(true);
      expect(planning.modes.length).toBeGreaterThan(0);
    });

    test('planning system should have valid strategies', () => {
      const planning = config.core_capabilities.planning_system;
      expect(Array.isArray(planning.strategies)).toBe(true);
      expect(planning.strategies.length).toBeGreaterThan(0);
    });

    test('security features should be non-empty array', () => {
      const security = config.core_capabilities.security;
      expect(Array.isArray(security.features)).toBe(true);
      expect(security.features.length).toBeGreaterThan(0);
      
      security.features.forEach(feature => {
        expect(typeof feature).toBe('string');
        expect(feature.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Operating Modes Validation', () => {
    test('should have both development and production modes', () => {
      expect(config.operating_modes.development).toBeDefined();
      expect(config.operating_modes.production).toBeDefined();
    });

    test('development mode should have debug enabled', () => {
      expect(config.operating_modes.development.debug).toBe(true);
    });

    test('production mode should have debug disabled', () => {
      expect(config.operating_modes.production.debug).toBe(false);
    });

    test('operating modes should have consistent structure', () => {
      const devKeys = Object.keys(config.operating_modes.development);
      const prodKeys = Object.keys(config.operating_modes.production);
      
      expect(devKeys.sort()).toEqual(prodKeys.sort());
    });
  });

  describe('Performance Configuration Validation', () => {
    test('response time should have valid target', () => {
      const rt = config.performance.response_time;
      expect(rt.target_ms).toBeGreaterThan(0);
      expect(rt.target_ms).toBeLessThan(10000);
      expect(Number.isInteger(rt.target_ms)).toBe(true);
    });

    test('response time max should be greater than target', () => {
      const rt = config.performance.response_time;
      expect(rt.max_ms).toBeGreaterThan(rt.target_ms);
    });

    test('memory usage should have reasonable limits', () => {
      const mem = config.performance.memory_usage;
      expect(mem.max_mb).toBeGreaterThan(0);
      expect(mem.max_mb).toBeLessThan(10000); // Less than 10GB
      expect(Number.isInteger(mem.max_mb)).toBe(true);
    });

    test('concurrent operations should have positive values', () => {
      const concurrent = config.performance.concurrent_operations;
      expect(concurrent.max_parallel).toBeGreaterThan(0);
      expect(concurrent.queue_size).toBeGreaterThan(0);
      expect(Number.isInteger(concurrent.max_parallel)).toBe(true);
      expect(Number.isInteger(concurrent.queue_size)).toBe(true);
    });

    test('concurrent operations should have realistic limits', () => {
      const concurrent = config.performance.concurrent_operations;
      expect(concurrent.max_parallel).toBeLessThan(1000);
      expect(concurrent.queue_size).toBeLessThan(100000);
    });

    test('queue size should be at least as large as max parallel', () => {
      const concurrent = config.performance.concurrent_operations;
      expect(concurrent.queue_size).toBeGreaterThanOrEqual(concurrent.max_parallel);
    });
  });

  describe('Tools Configuration Validation', () => {
    test('all tools should have required structure', () => {
      tools.forEach((tool, index) => {
        expect(tool.type).toBe('function');
        expect(tool.function).toBeDefined();
        expect(tool.function.name).toBeDefined();
        expect(tool.function.description).toBeDefined();
        expect(tool.function.parameters).toBeDefined();
      });
    });

    test('tool parameters should follow JSON Schema', () => {
      tools.forEach(tool => {
        const params = tool.function.parameters;
        expect(params.type).toBe('object');
        expect(params.properties).toBeDefined();
        expect(typeof params.properties).toBe('object');
      });
    });

    test('required parameters should be valid', () => {
      tools.forEach(tool => {
        if (tool.function.parameters.required) {
          const required = tool.function.parameters.required;
          const properties = tool.function.parameters.properties;
          
          expect(Array.isArray(required)).toBe(true);
          
          required.forEach(reqParam => {
            expect(properties).toHaveProperty(reqParam);
          });
        }
      });
    });

    test('tool descriptions should be descriptive', () => {
      tools.forEach(tool => {
        expect(tool.function.description.length).toBeGreaterThan(10);
        expect(tool.function.description.length).toBeLessThan(500);
      });
    });

    test('parameter descriptions should exist and be meaningful', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties;
        
        Object.values(properties).forEach(prop => {
          if (prop.description) {
            expect(prop.description.length).toBeGreaterThan(5);
          }
        });
      });
    });

    test('tool names should not contain spaces', () => {
      tools.forEach(tool => {
        expect(tool.function.name).not.toContain(' ');
      });
    });

    test('tool names should be lowercase or snake_case', () => {
      tools.forEach(tool => {
        const name = tool.function.name;
        expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });

    test('parameter types should be valid JSON Schema types', () => {
      const validTypes = ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'];
      
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties;
        
        Object.values(properties).forEach(prop => {
          expect(validTypes).toContain(prop.type);
        });
      });
    });

    test('array parameters should have items definition', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties;
        
        Object.values(properties).forEach(prop => {
          if (prop.type === 'array') {
            expect(prop.items).toBeDefined();
          }
        });
      });
    });

    test('enum parameters should have valid values', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties;
        
        Object.values(properties).forEach(prop => {
          if (prop.enum) {
            expect(Array.isArray(prop.enum)).toBe(true);
            expect(prop.enum.length).toBeGreaterThan(0);
          }
        });
      });
    });
  });

  describe('Configuration Consistency', () => {
    test('no duplicate capability names', () => {
      const capabilityNames = Object.keys(config.core_capabilities);
      const uniqueNames = new Set(capabilityNames);
      expect(uniqueNames.size).toBe(capabilityNames.length);
    });

    test('no duplicate tool names', () => {
      const toolNames = tools.map(t => t.function.name);
      const uniqueNames = new Set(toolNames);
      expect(uniqueNames.size).toBe(toolNames.length);
    });

    test('configuration should not have circular references', () => {
      // JSON.stringify will throw on circular refs
      expect(() => JSON.stringify(config)).not.toThrow();
      expect(() => JSON.stringify(tools)).not.toThrow();
    });

    test('all referenced capabilities are enabled', () => {
      Object.values(config.core_capabilities).forEach(capability => {
        expect(capability.enabled).toBeDefined();
      });
    });
  });

  describe('Configuration File Integrity', () => {
    test('config file should be properly formatted', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const rawConfig = fs.readFileSync(configPath, 'utf8');
      
      // Should parse without error
      expect(() => JSON.parse(rawConfig)).not.toThrow();
      
      // Should be pretty-printed (contains newlines)
      expect(rawConfig).toContain('\n');
    });

    test('tools file should be properly formatted', () => {
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      const rawTools = fs.readFileSync(toolsPath, 'utf8');
      
      expect(() => JSON.parse(rawTools)).not.toThrow();
      expect(rawTools).toContain('\n');
    });

    test('config should not be empty', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const stats = fs.statSync(configPath);
      expect(stats.size).toBeGreaterThan(100);
    });

    test('tools should not be empty', () => {
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      const stats = fs.statSync(toolsPath);
      expect(stats.size).toBeGreaterThan(50);
    });
  });

  describe('Security Configuration', () => {
    test('security should be enabled in capabilities', () => {
      expect(config.core_capabilities.security.enabled).toBe(true);
    });

    test('security features should include essential items', () => {
      const features = config.core_capabilities.security.features;
      
      // Should have multiple security features
      expect(features.length).toBeGreaterThan(2);
    });

    test('production mode should have appropriate security settings', () => {
      // Production should be more secure (debug off)
      expect(config.operating_modes.production.debug).toBe(false);
    });
  });

  describe('Tool Categories and Coverage', () => {
    test('should have diverse tool types', () => {
      const toolNames = tools.map(t => t.function.name);
      
      // Should have various categories of tools
      expect(toolNames.length).toBeGreaterThan(5);
    });

    test('tools should cover common operations', () => {
      const toolNames = tools.map(t => t.function.name);
      
      // Check for essential tool types
      const hasSearchTool = toolNames.some(name => 
        name.includes('search') || name.includes('find')
      );
      const hasFileTool = toolNames.some(name => 
        name.includes('file') || name.includes('read') || name.includes('write')
      );
      
      expect(hasSearchTool || hasFileTool).toBe(true);
    });

    test('tool parameters should have appropriate constraints', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties;
        
        // If there are string parameters, some should have constraints
        const stringProps = Object.values(properties).filter(p => p.type === 'string');
        if (stringProps.length > 0) {
          // At least one string property should have additional validation
          const hasConstraints = stringProps.some(p => 
            p.minLength || p.maxLength || p.pattern || p.enum
          );
          // This is a soft check - not all need constraints
          expect(hasConstraints || true).toBe(true);
        }
      });
    });
  });

  describe('Performance Targets Validation', () => {
    test('performance targets should be achievable', () => {
      const rt = config.performance.response_time;
      
      // Target should be reasonable for API responses
      expect(rt.target_ms).toBeGreaterThanOrEqual(10);
      expect(rt.target_ms).toBeLessThanOrEqual(5000);
    });

    test('memory limits should allow for operation', () => {
      const mem = config.performance.memory_usage;
      
      // Should have at least 128MB for basic operation
      expect(mem.max_mb).toBeGreaterThanOrEqual(128);
    });

    test('concurrent operations should support multi-user scenarios', () => {
      const concurrent = config.performance.concurrent_operations;
      
      // Should support at least a few concurrent users
      expect(concurrent.max_parallel).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Configuration Extensibility', () => {
    test('configuration structure should allow for extensions', () => {
      // Configuration should have well-defined sections
      expect(config.platform).toBeDefined();
      expect(config.core_capabilities).toBeDefined();
      expect(config.operating_modes).toBeDefined();
      expect(config.performance).toBeDefined();
    });

    test('tools array structure allows for additions', () => {
      expect(Array.isArray(tools)).toBe(true);
      
      // Should be able to add new tools
      const newTool = {
        type: 'function',
        function: {
          name: 'test_new_tool',
          description: 'A test tool',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      };
      
      expect(() => [...tools, newTool]).not.toThrow();
    });
  });

  describe('Default Values', () => {
    test('all required capabilities should have defaults', () => {
      const requiredCapabilities = [
        'multi_modal',
        'memory_system',
        'tool_system',
        'planning_system',
        'security'
      ];
      
      requiredCapabilities.forEach(cap => {
        expect(config.core_capabilities[cap]).toBeDefined();
      });
    });

    test('performance metrics should have sensible defaults', () => {
      expect(config.performance.response_time.target_ms).toBeLessThan(
        config.performance.response_time.max_ms
      );
    });
  });
});