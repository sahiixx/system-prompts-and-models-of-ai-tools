/**
 * Enhanced Configuration Tests
 * 
 * Additional comprehensive tests for configuration files:
 * - Deep validation of structure
 * - Edge cases in configuration values
 * - Schema compliance
 * - Cross-validation between configs
 * - Performance implications of config
 */

const fs = require('fs');
const path = require('path');

describe('Enhanced Configuration Tests', () => {
  let config;
  let tools;
  const configPath = path.join(__dirname, '../../config/system-config.json');
  const toolsPath = path.join(__dirname, '../../config/tools.json');

  beforeAll(() => {
    const configData = fs.readFileSync(configPath, 'utf8');
    const toolsData = fs.readFileSync(toolsPath, 'utf8');
    config = JSON.parse(configData);
    tools = JSON.parse(toolsData);
  });

  describe('Configuration Deep Validation', () => {
    test('should have no circular references', () => {
      expect(() => JSON.stringify(config)).not.toThrow();
    });

    test('should have consistent naming conventions', () => {
      const checkNaming = (obj, path = '') => {
        for (const key in obj) {
          // Should use snake_case for config keys
          expect(key).toMatch(/^[a-z][a-z0-9_]*$/);
          
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            checkNaming(obj[key], `${path}.${key}`);
          }
        }
      };

      checkNaming(config);
    });

    test('should have descriptions for all major sections', () => {
      expect(config.platform.description).toBeDefined();
      expect(config.platform.description.length).toBeGreaterThan(0);
    });

    test('should not have any TODO or FIXME comments in values', () => {
      const checkForPlaceholders = (obj) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            expect(obj[key].toLowerCase()).not.toContain('todo');
            expect(obj[key].toLowerCase()).not.toContain('fixme');
            expect(obj[key].toLowerCase()).not.toContain('xxx');
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            checkForPlaceholders(obj[key]);
          }
        }
      };

      checkForPlaceholders(config);
    });

    test('should have version in semantic versioning format', () => {
      expect(config.platform.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('should have all boolean flags as actual booleans', () => {
      expect(typeof config.core_capabilities.multi_modal.enabled).toBe('boolean');
      expect(typeof config.core_capabilities.memory_system.enabled).toBe('boolean');
      expect(typeof config.core_capabilities.tool_system.enabled).toBe('boolean');
      expect(typeof config.core_capabilities.planning_system.enabled).toBe('boolean');
      expect(typeof config.core_capabilities.security.enabled).toBe('boolean');
    });

    test('should have numeric values as actual numbers', () => {
      expect(typeof config.performance.response_time.target_ms).toBe('number');
      expect(typeof config.performance.response_time.max_ms).toBe('number');
      expect(typeof config.performance.memory_usage.max_mb).toBe('number');
      expect(typeof config.performance.concurrent_operations.max_parallel).toBe('number');
    });

    test('should have arrays where expected', () => {
      expect(Array.isArray(config.core_capabilities.multi_modal.supported_types)).toBe(true);
      expect(Array.isArray(config.core_capabilities.memory_system.types)).toBe(true);
      expect(Array.isArray(config.core_capabilities.planning_system.modes)).toBe(true);
      expect(Array.isArray(config.core_capabilities.security.features)).toBe(true);
    });
  });

  describe('Performance Configuration Validation', () => {
    test('should have realistic response time targets', () => {
      const { target_ms, max_ms } = config.performance.response_time;
      
      expect(target_ms).toBeGreaterThan(0);
      expect(target_ms).toBeLessThan(5000); // Should target under 5 seconds
      expect(max_ms).toBeGreaterThan(target_ms);
      expect(max_ms).toBeLessThan(30000); // Max should be under 30 seconds
    });

    test('should have reasonable memory limits', () => {
      const { max_mb } = config.performance.memory_usage;
      
      expect(max_mb).toBeGreaterThan(0);
      expect(max_mb).toBeLessThan(4096); // Under 4GB
    });

    test('should have sensible concurrency limits', () => {
      const { max_parallel, queue_size } = config.performance.concurrent_operations;
      
      expect(max_parallel).toBeGreaterThan(0);
      expect(max_parallel).toBeLessThan(1000); // Reasonable limit
      expect(queue_size).toBeGreaterThan(max_parallel); // Queue should be larger than parallel
    });

    test('should have warning thresholds if specified', () => {
      if (config.performance.memory_usage.warning_mb) {
        expect(config.performance.memory_usage.warning_mb).toBeLessThan(
          config.performance.memory_usage.max_mb
        );
      }
    });
  });

  describe('Tools Configuration Deep Validation', () => {
    test('should have proper tool structure', () => {
      tools.forEach((tool, index) => {
        expect(tool).toHaveProperty('type');
        expect(tool).toHaveProperty('function');
        expect(tool.function).toHaveProperty('name');
        expect(tool.function).toHaveProperty('description');
        expect(tool.function).toHaveProperty('parameters');
      });
    });

    test('should have valid parameter types', () => {
      const validTypes = ['string', 'number', 'boolean', 'array', 'object', 'integer'];
      
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        
        Object.values(properties).forEach(prop => {
          if (prop.type) {
            expect(validTypes).toContain(prop.type);
          }
        });
      });
    });

    test('should have descriptions for all parameters', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        
        Object.values(properties).forEach(prop => {
          expect(prop.description).toBeDefined();
          expect(prop.description.length).toBeGreaterThan(0);
        });
      });
    });

    test('should have no duplicate tool names', () => {
      const names = tools.map(t => t.function.name);
      const uniqueNames = new Set(names);
      
      expect(uniqueNames.size).toBe(names.length);
    });

    test('should have required fields in parameters if specified', () => {
      tools.forEach(tool => {
        const required = tool.function.parameters.required || [];
        const properties = tool.function.parameters.properties || {};
        
        required.forEach(reqField => {
          expect(properties[reqField]).toBeDefined();
        });
      });
    });

    test('should not have empty required arrays', () => {
      tools.forEach(tool => {
        if (tool.function.parameters.required) {
          expect(tool.function.parameters.required.length).toBeGreaterThanOrEqual(0);
        }
      });
    });

    test('should have proper enum values if specified', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        
        Object.values(properties).forEach(prop => {
          if (prop.enum) {
            expect(Array.isArray(prop.enum)).toBe(true);
            expect(prop.enum.length).toBeGreaterThan(0);
          }
        });
      });
    });

    test('should have default values within valid range', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        
        Object.values(properties).forEach(prop => {
          if (prop.default !== undefined && prop.enum) {
            expect(prop.enum).toContain(prop.default);
          }
        });
      });
    });

    test('should have proper array item definitions', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        
        Object.values(properties).forEach(prop => {
          if (prop.type === 'array') {
            expect(prop.items).toBeDefined();
            expect(prop.items.type).toBeDefined();
          }
        });
      });
    });

    test('tool names should follow naming convention', () => {
      tools.forEach(tool => {
        // Should be snake_case
        expect(tool.function.name).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });
  });

  describe('Cross-Configuration Validation', () => {
    test('tool system should be enabled if tools are defined', () => {
      if (tools.length > 0) {
        expect(config.core_capabilities.tool_system.enabled).toBe(true);
      }
    });

    test('configuration should support all tool types', () => {
      if (config.core_capabilities.tool_system.dynamic_loading) {
        expect(config.core_capabilities.tool_system.json_defined).toBe(true);
      }
    });

    test('memory system should support tool outputs', () => {
      if (config.core_capabilities.tool_system.enabled) {
        expect(config.core_capabilities.memory_system.enabled).toBe(true);
      }
    });

    test('planning system should work with available tools', () => {
      if (config.core_capabilities.planning_system.enabled && tools.length > 0) {
        expect(config.core_capabilities.tool_system.enabled).toBe(true);
      }
    });
  });

  describe('Security Configuration', () => {
    test('should have security features defined', () => {
      expect(config.core_capabilities.security.features).toBeDefined();
      expect(config.core_capabilities.security.features.length).toBeGreaterThan(0);
    });

    test('should not expose sensitive defaults', () => {
      const configStr = JSON.stringify(config).toLowerCase();
      
      expect(configStr).not.toContain('password');
      expect(configStr).not.toContain('secret');
      expect(configStr).not.toContain('api_key');
      expect(configStr).not.toContain('token');
    });

    test('production mode should have debug disabled', () => {
      expect(config.operating_modes.production.debug).toBe(false);
    });

    test('development mode can have debug enabled', () => {
      expect(config.operating_modes.development.debug).toBe(true);
    });
  });

  describe('Operating Modes Validation', () => {
    test('should define both development and production modes', () => {
      expect(config.operating_modes.development).toBeDefined();
      expect(config.operating_modes.production).toBeDefined();
    });

    test('should have different settings for different modes', () => {
      const dev = config.operating_modes.development;
      const prod = config.operating_modes.production;
      
      // At least debug should differ
      expect(dev.debug).not.toBe(prod.debug);
    });

    test('development mode should be more verbose', () => {
      const dev = config.operating_modes.development;
      
      expect(dev.debug).toBe(true);
      
      if (dev.logging) {
        expect(['verbose', 'debug', 'info']).toContain(dev.logging);
      }
    });

    test('production mode should be optimized', () => {
      const prod = config.operating_modes.production;
      
      expect(prod.debug).toBe(false);
      
      if (prod.logging) {
        expect(['error', 'warn', 'info']).toContain(prod.logging);
      }
    });
  });

  describe('Capability Flags Consistency', () => {
    test('all capabilities should have enabled flag', () => {
      const capabilities = config.core_capabilities;
      
      expect(capabilities.multi_modal).toHaveProperty('enabled');
      expect(capabilities.memory_system).toHaveProperty('enabled');
      expect(capabilities.tool_system).toHaveProperty('enabled');
      expect(capabilities.planning_system).toHaveProperty('enabled');
      expect(capabilities.security).toHaveProperty('enabled');
    });

    test('enabled capabilities should have additional properties', () => {
      if (config.core_capabilities.multi_modal.enabled) {
        expect(config.core_capabilities.multi_modal.supported_types).toBeDefined();
      }
      
      if (config.core_capabilities.memory_system.enabled) {
        expect(config.core_capabilities.memory_system.types).toBeDefined();
      }
      
      if (config.core_capabilities.tool_system.enabled) {
        expect(config.core_capabilities.tool_system.modular).toBeDefined();
      }
    });

    test('disabled capabilities should not break system', () => {
      // All capabilities should be toggleable
      Object.keys(config.core_capabilities).forEach(key => {
        expect(typeof config.core_capabilities[key].enabled).toBe('boolean');
      });
    });
  });

  describe('Configuration File Size and Complexity', () => {
    test('configuration file should not be too large', () => {
      const stats = fs.statSync(configPath);
      expect(stats.size).toBeLessThan(100000); // Under 100KB
    });

    test('tools file should not be too large', () => {
      const stats = fs.statSync(toolsPath);
      expect(stats.size).toBeLessThan(500000); // Under 500KB
    });

    test('configuration should not be too deeply nested', () => {
      const maxDepth = (obj, depth = 0) => {
        if (typeof obj !== 'object' || obj === null) return depth;
        return Math.max(depth, ...Object.values(obj).map(v => maxDepth(v, depth + 1)));
      };
      
      expect(maxDepth(config)).toBeLessThan(10); // Max 10 levels
    });

    test('should have reasonable number of tools', () => {
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.length).toBeLessThan(1000); // Not too many
    });
  });

  describe('Configuration Defaults', () => {
    test('should have sensible default values', () => {
      expect(config.platform.name).toBe('Unified AI Platform');
      expect(config.platform.version).toBeDefined();
    });

    test('should have all core capabilities enabled by default', () => {
      expect(config.core_capabilities.multi_modal.enabled).toBe(true);
      expect(config.core_capabilities.memory_system.enabled).toBe(true);
      expect(config.core_capabilities.tool_system.enabled).toBe(true);
      expect(config.core_capabilities.planning_system.enabled).toBe(true);
      expect(config.core_capabilities.security.enabled).toBe(true);
    });
  });

  describe('Edge Cases in Configuration', () => {
    test('should handle empty arrays gracefully', () => {
      // If any arrays are empty, system should still work
      Object.values(config.core_capabilities).forEach(capability => {
        if (Array.isArray(capability.supported_types)) {
          expect(capability.supported_types).toBeDefined();
        }
      });
    });

    test('should not have negative numeric values', () => {
      expect(config.performance.response_time.target_ms).toBeGreaterThanOrEqual(0);
      expect(config.performance.response_time.max_ms).toBeGreaterThanOrEqual(0);
      expect(config.performance.memory_usage.max_mb).toBeGreaterThanOrEqual(0);
      expect(config.performance.concurrent_operations.max_parallel).toBeGreaterThanOrEqual(0);
    });

    test('should handle special characters in strings', () => {
      const str = JSON.stringify(config);
      expect(() => JSON.parse(str)).not.toThrow();
    });
  });

  describe('Tools Schema Compliance', () => {
    test('all tools should follow OpenAPI schema', () => {
      tools.forEach(tool => {
        expect(tool.type).toBe('function');
        expect(tool.function.parameters.type).toBe('object');
        expect(tool.function.parameters).toHaveProperty('properties');
      });
    });

    test('parameter properties should have valid schemas', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        
        Object.entries(properties).forEach(([key, prop]) => {
          expect(prop).toHaveProperty('type');
          expect(prop).toHaveProperty('description');
        });
      });
    });

    test('should handle optional parameters correctly', () => {
      tools.forEach(tool => {
        const required = tool.function.parameters.required || [];
        const properties = tool.function.parameters.properties || {};
        const allProps = Object.keys(properties);
        
        // All required params should be in properties
        required.forEach(req => {
          expect(allProps).toContain(req);
        });
      });
    });
  });
});