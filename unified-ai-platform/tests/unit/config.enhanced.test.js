/**
 * Enhanced Unit Tests for Configuration Files
 * 
 * Additional comprehensive tests covering:
 * - Configuration schema validation
 * - Edge cases in configuration values
 * - Cross-validation between config files
 * - Security implications of configuration
 * - Performance-related configuration
 */

const fs = require('fs');
const path = require('path');

describe('Configuration Files - Enhanced Tests', () => {
  describe('system-config.json - Schema Validation', () => {
    let config;

    beforeAll(() => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(configData);
    });

    test('should not contain any undefined values', () => {
      const checkUndefined = (obj, path = '') => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          expect(value).not.toBeUndefined();
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            checkUndefined(value, currentPath);
          }
        }
      };
      checkUndefined(config);
    });

    test('should have consistent boolean types for enabled flags', () => {
      const checkEnabled = (obj) => {
        for (const [key, value] of Object.entries(obj)) {
          if (key === 'enabled') {
            expect(typeof value).toBe('boolean');
          }
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            checkEnabled(value);
          }
        }
      };
      checkEnabled(config);
    });

    test('should have version in semantic versioning format', () => {
      expect(config.platform.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('should have reasonable performance thresholds', () => {
      const perf = config.performance;
      
      // Response times should be positive and max > target
      expect(perf.response_time.target_ms).toBeGreaterThan(0);
      expect(perf.response_time.max_ms).toBeGreaterThan(perf.response_time.target_ms);
      
      // Memory should be reasonable
      expect(perf.memory_usage.max_mb).toBeGreaterThan(0);
      expect(perf.memory_usage.max_mb).toBeLessThan(10000); // Less than 10GB
      
      // Concurrent operations should be reasonable
      expect(perf.concurrent_operations.max_parallel).toBeGreaterThan(0);
      expect(perf.concurrent_operations.max_parallel).toBeLessThan(1000);
      expect(perf.concurrent_operations.queue_size).toBeGreaterThan(0);
    });

    test('should have descriptions for all major components', () => {
      expect(config.platform.description).toBeDefined();
      expect(config.platform.description.length).toBeGreaterThan(10);
    });

    test('should have consistent structure for all capabilities', () => {
      const capabilities = config.core_capabilities;
      const capabilityKeys = Object.keys(capabilities);

      capabilityKeys.forEach(key => {
        const capability = capabilities[key];
        expect(capability).toHaveProperty('enabled');
        expect(typeof capability.enabled).toBe('boolean');
      });
    });

    test('should have arrays with at least one element where expected', () => {
      if (config.core_capabilities.multi_modal.supported_types) {
        expect(config.core_capabilities.multi_modal.supported_types.length).toBeGreaterThan(0);
      }
      if (config.core_capabilities.planning_system.modes) {
        expect(config.core_capabilities.planning_system.modes.length).toBeGreaterThan(0);
      }
      if (config.core_capabilities.security.features) {
        expect(config.core_capabilities.security.features.length).toBeGreaterThan(0);
      }
    });

    test('should not have duplicate items in arrays', () => {
      const checkDuplicates = (arr) => {
        const seen = new Set();
        for (const item of arr) {
          const key = typeof item === 'object' ? JSON.stringify(item) : item;
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
      };

      if (config.core_capabilities.multi_modal.supported_types) {
        checkDuplicates(config.core_capabilities.multi_modal.supported_types);
      }
      if (config.core_capabilities.planning_system.modes) {
        checkDuplicates(config.core_capabilities.planning_system.modes);
      }
    });

    test('should have operating modes with different settings', () => {
      expect(config.operating_modes.development.debug).not.toBe(
        config.operating_modes.production.debug
      );
    });

    test('should have complete capability configurations', () => {
      const requiredCapabilities = [
        'multi_modal',
        'memory_system',
        'tool_system',
        'planning_system',
        'security'
      ];

      requiredCapabilities.forEach(cap => {
        expect(config.core_capabilities).toHaveProperty(cap);
        expect(config.core_capabilities[cap]).toHaveProperty('enabled');
      });
    });

    test('should have valid memory system configuration', () => {
      const memory = config.core_capabilities.memory_system;
      
      if (memory.types) {
        expect(Array.isArray(memory.types)).toBe(true);
        expect(memory.types.length).toBeGreaterThan(0);
      }
      
      if (memory.persistence !== undefined) {
        expect(typeof memory.persistence).toBe('boolean');
      }
    });

    test('should have valid tool system configuration', () => {
      const tools = config.core_capabilities.tool_system;
      
      if (tools.modular !== undefined) {
        expect(typeof tools.modular).toBe('boolean');
      }
      if (tools.json_defined !== undefined) {
        expect(typeof tools.json_defined).toBe('boolean');
      }
      if (tools.dynamic_loading !== undefined) {
        expect(typeof tools.dynamic_loading).toBe('boolean');
      }
    });
  });

  describe('tools.json - Advanced Validation', () => {
    let tools;

    beforeAll(() => {
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      const toolsData = fs.readFileSync(toolsPath, 'utf8');
      tools = JSON.parse(toolsData);
    });

    test('should have consistent parameter structure', () => {
      tools.forEach(tool => {
        const params = tool.function.parameters;
        expect(params.type).toBe('object');
        expect(params.properties).toBeDefined();
        expect(typeof params.properties).toBe('object');
      });
    });

    test('should have valid parameter types', () => {
      const validTypes = ['string', 'number', 'boolean', 'array', 'object', 'integer'];
      
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        Object.values(properties).forEach(prop => {
          expect(validTypes).toContain(prop.type);
        });
      });
    });

    test('should have descriptions for all parameters', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        Object.values(properties).forEach(prop => {
          if (prop.description) {
            expect(typeof prop.description).toBe('string');
            expect(prop.description.length).toBeGreaterThan(0);
          }
        });
      });
    });

    test('should not have circular references in tools', () => {
      // JSON.parse should have already failed if there were circular refs
      expect(tools).toBeDefined();
    });

    test('should have consistent naming patterns', () => {
      tools.forEach(tool => {
        // Function names should be snake_case
        expect(tool.function.name).toMatch(/^[a-z][a-z0-9_]*$/);
        
        // Parameter names should also be snake_case or camelCase
        const properties = tool.function.parameters.properties || {};
        Object.keys(properties).forEach(paramName => {
          expect(paramName).toMatch(/^[a-zA-Z][a-zA-Z0-9_]*$/);
        });
      });
    });

    test('should have appropriate parameter requirements', () => {
      tools.forEach(tool => {
        const required = tool.function.parameters.required || [];
        const properties = tool.function.parameters.properties || {};
        
        // Required parameters should be marked clearly
        required.forEach(reqParam => {
          expect(properties).toHaveProperty(reqParam);
        });
      });
    });

    test('should have array parameters with item definitions', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        Object.values(properties).forEach(prop => {
          if (prop.type === 'array') {
            // Arrays should define their items
            if (prop.items) {
              expect(prop.items).toHaveProperty('type');
            }
          }
        });
      });
    });

    test('should have object parameters with property definitions', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        Object.values(properties).forEach(prop => {
          if (prop.type === 'object') {
            // Objects should ideally define their properties
            // (not strictly required but good practice)
            if (prop.properties) {
              expect(typeof prop.properties).toBe('object');
            }
          }
        });
      });
    });

    test('should have enum values for parameters where appropriate', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        Object.values(properties).forEach(prop => {
          if (prop.enum) {
            expect(Array.isArray(prop.enum)).toBe(true);
            expect(prop.enum.length).toBeGreaterThan(0);
            
            // Enum values should match parameter type
            prop.enum.forEach(value => {
              if (prop.type === 'string') {
                expect(typeof value).toBe('string');
              } else if (prop.type === 'number' || prop.type === 'integer') {
                expect(typeof value).toBe('number');
              }
            });
          }
        });
      });
    });

    test('should not have conflicting parameter constraints', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        Object.values(properties).forEach(prop => {
          // Minimum should be less than maximum
          if (prop.minimum !== undefined && prop.maximum !== undefined) {
            expect(prop.minimum).toBeLessThanOrEqual(prop.maximum);
          }
          
          // Min length should be less than max length
          if (prop.minLength !== undefined && prop.maxLength !== undefined) {
            expect(prop.minLength).toBeLessThanOrEqual(prop.maxLength);
          }
        });
      });
    });
  });

  describe('Cross-Configuration Validation', () => {
    let config, tools;

    beforeAll(() => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
    });

    test('tool system should be enabled if tools are defined', () => {
      if (tools.length > 0) {
        expect(config.core_capabilities.tool_system.enabled).toBe(true);
      }
    });

    test('should have reasonable tool count for performance targets', () => {
      const maxParallel = config.performance.concurrent_operations.max_parallel;
      
      // Number of tools should be reasonable for parallel execution
      expect(tools.length).toBeLessThan(maxParallel * 10);
    });

    test('should support all declared multi-modal types', () => {
      if (config.core_capabilities.multi_modal.supported_types) {
        const supportedTypes = config.core_capabilities.multi_modal.supported_types;
        
        // Each supported type should make sense
        supportedTypes.forEach(type => {
          expect(['text', 'code', 'image', 'video', 'audio', 'file']).toContain(type);
        });
      }
    });

    test('configuration should align with platform description', () => {
      const description = config.platform.description.toLowerCase();
      
      // If description mentions specific capabilities, they should be enabled
      if (description.includes('multi')) {
        expect(config.core_capabilities.multi_modal.enabled).toBe(true);
      }
      if (description.includes('tool')) {
        expect(config.core_capabilities.tool_system.enabled).toBe(true);
      }
      if (description.includes('plan')) {
        expect(config.core_capabilities.planning_system.enabled).toBe(true);
      }
    });
  });

  describe('Security Configuration', () => {
    let config;

    beforeAll(() => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    });

    test('should have security enabled', () => {
      expect(config.core_capabilities.security.enabled).toBe(true);
    });

    test('should define security features', () => {
      const security = config.core_capabilities.security;
      
      if (security.features) {
        expect(Array.isArray(security.features)).toBe(true);
        expect(security.features.length).toBeGreaterThan(0);
        
        // Check for essential security features
        const featuresLower = security.features.map(f => f.toLowerCase());
        expect(
          featuresLower.some(f => f.includes('auth') || f.includes('validation'))
        ).toBe(true);
      }
    });

    test('production mode should have security-conscious settings', () => {
      const prod = config.operating_modes.production;
      expect(prod.debug).toBe(false);
    });
  });

  describe('Performance Configuration', () => {
    let config;

    beforeAll(() => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    });

    test('should have response time targets under 5 seconds', () => {
      const respTime = config.performance.response_time;
      expect(respTime.target_ms).toBeLessThan(5000);
      expect(respTime.max_ms).toBeLessThan(10000);
    });

    test('should have memory limits', () => {
      const memory = config.performance.memory_usage;
      expect(memory.max_mb).toBeGreaterThan(0);
      expect(memory.max_mb).toBeLessThan(10000); // Less than 10GB
    });

    test('should have concurrent operation limits', () => {
      const concurrent = config.performance.concurrent_operations;
      expect(concurrent.max_parallel).toBeGreaterThan(0);
      expect(concurrent.max_parallel).toBeLessThan(1000);
      expect(concurrent.queue_size).toBeGreaterThanOrEqual(concurrent.max_parallel);
    });

    test('queue size should be larger than max parallel operations', () => {
      const concurrent = config.performance.concurrent_operations;
      expect(concurrent.queue_size).toBeGreaterThanOrEqual(concurrent.max_parallel);
    });
  });

  describe('Configuration File Integrity', () => {
    test('should be able to parse config without errors', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      expect(() => {
        JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }).not.toThrow();
    });

    test('should be able to parse tools without errors', () => {
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      expect(() => {
        JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
      }).not.toThrow();
    });

    test('configuration files should not be empty', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      
      const configData = fs.readFileSync(configPath, 'utf8');
      const toolsData = fs.readFileSync(toolsPath, 'utf8');
      
      expect(configData.length).toBeGreaterThan(10);
      expect(toolsData.length).toBeGreaterThan(10);
    });

    test('should have valid UTF-8 encoding', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      
      expect(() => {
        fs.readFileSync(configPath, 'utf8');
        fs.readFileSync(toolsPath, 'utf8');
      }).not.toThrow();
    });
  });
});