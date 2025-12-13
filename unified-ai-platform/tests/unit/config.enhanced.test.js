/**
 * Enhanced Unit Tests for Configuration Files
 * 
 * These tests provide additional coverage for:
 * - Configuration schema validation
 * - Value range and boundary testing
 * - Configuration consistency checks
 * - Tools JSON structure validation
 * - Deep configuration object validation
 */

const fs = require('fs');
const path = require('path');

describe('Configuration Files - Enhanced Tests', () => {
  describe('system-config.json - Deep Validation', () => {
    let config;

    beforeAll(() => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(configData);
    });

    describe('Platform Metadata', () => {
      test('should have semantic version format', () => {
        const versionRegex = /^\d+\.\d+\.\d+$/;
        expect(config.platform.version).toMatch(versionRegex);
      });

      test('should have non-empty platform name', () => {
        expect(config.platform.name.length).toBeGreaterThan(0);
        expect(typeof config.platform.name).toBe('string');
      });

      test('should have descriptive platform description', () => {
        expect(config.platform.description.length).toBeGreaterThan(10);
        expect(config.platform.description).toContain('AI');
      });

      test('should have all required platform fields', () => {
        expect(config.platform).toHaveProperty('name');
        expect(config.platform).toHaveProperty('version');
        expect(config.platform).toHaveProperty('description');
      });
    });

    describe('Multi-Modal Capabilities', () => {
      test('should support at least basic types', () => {
        const multiModal = config.core_capabilities.multi_modal;
        const requiredTypes = ['text', 'code'];
        
        requiredTypes.forEach(type => {
          expect(multiModal.supported_types).toContain(type);
        });
      });

      test('should have processors for each supported type', () => {
        const multiModal = config.core_capabilities.multi_modal;
        expect(multiModal.processors).toBeDefined();
        expect(Array.isArray(multiModal.processors)).toBe(true);
        expect(multiModal.processors.length).toBeGreaterThan(0);
      });

      test('should have unique supported types', () => {
        const types = config.core_capabilities.multi_modal.supported_types;
        const uniqueTypes = new Set(types);
        expect(uniqueTypes.size).toBe(types.length);
      });

      test('should have processors as strings', () => {
        const processors = config.core_capabilities.multi_modal.processors;
        processors.forEach(processor => {
          expect(typeof processor).toBe('string');
          expect(processor.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Memory System Configuration', () => {
      test('should define valid persistence strategy', () => {
        const validStrategies = ['in_memory', 'persistent', 'hybrid', 'distributed'];
        const persistence = config.core_capabilities.memory_system.persistence;
        expect(validStrategies).toContain(persistence);
      });

      test('should have at least one memory type', () => {
        const types = config.core_capabilities.memory_system.types;
        expect(types.length).toBeGreaterThan(0);
      });

      test('should have descriptive memory type names', () => {
        const types = config.core_capabilities.memory_system.types;
        types.forEach(type => {
          expect(typeof type).toBe('string');
          expect(type.length).toBeGreaterThan(3);
        });
      });

      test('should have unique memory types', () => {
        const types = config.core_capabilities.memory_system.types;
        const uniqueTypes = new Set(types);
        expect(uniqueTypes.size).toBe(types.length);
      });
    });

    describe('Tool System Configuration', () => {
      test('should have all boolean flags defined', () => {
        const toolSystem = config.core_capabilities.tool_system;
        expect(typeof toolSystem.modular).toBe('boolean');
        expect(typeof toolSystem.json_defined).toBe('boolean');
        expect(typeof toolSystem.dynamic_loading).toBe('boolean');
      });

      test('should enable core tool system features', () => {
        const toolSystem = config.core_capabilities.tool_system;
        expect(toolSystem.enabled).toBe(true);
      });

      test('should have consistent tool system configuration', () => {
        const toolSystem = config.core_capabilities.tool_system;
        // If json_defined, should be modular
        if (toolSystem.json_defined) {
          expect(toolSystem.modular).toBe(true);
        }
      });
    });

    describe('Planning System Configuration', () => {
      test('should define valid planning modes', () => {
        const validModes = ['two_phase', 'execution', 'planning', 'hybrid', 'adaptive'];
        const modes = config.core_capabilities.planning_system.modes;
        
        modes.forEach(mode => {
          expect(validModes).toContain(mode);
        });
      });

      test('should define valid strategies', () => {
        const validStrategies = ['sequential', 'parallel', 'adaptive', 'hybrid'];
        const strategies = config.core_capabilities.planning_system.strategies;
        
        strategies.forEach(strategy => {
          expect(validStrategies).toContain(strategy);
        });
      });

      test('should have at least one mode and strategy', () => {
        const planning = config.core_capabilities.planning_system;
        expect(planning.modes.length).toBeGreaterThan(0);
        expect(planning.strategies.length).toBeGreaterThan(0);
      });

      test('should have unique modes', () => {
        const modes = config.core_capabilities.planning_system.modes;
        const uniqueModes = new Set(modes);
        expect(uniqueModes.size).toBe(modes.length);
      });

      test('should have unique strategies', () => {
        const strategies = config.core_capabilities.planning_system.strategies;
        const uniqueStrategies = new Set(strategies);
        expect(uniqueStrategies.size).toBe(strategies.length);
      });
    });

    describe('Security Configuration', () => {
      test('should define security features', () => {
        const features = config.core_capabilities.security.features;
        expect(Array.isArray(features)).toBe(true);
        expect(features.length).toBeGreaterThan(0);
      });

      test('should include authentication in security features', () => {
        const features = config.core_capabilities.security.features;
        expect(features).toContain('authentication');
      });

      test('should have descriptive feature names', () => {
        const features = config.core_capabilities.security.features;
        features.forEach(feature => {
          expect(typeof feature).toBe('string');
          expect(feature.length).toBeGreaterThan(3);
        });
      });

      test('should have unique security features', () => {
        const features = config.core_capabilities.security.features;
        const uniqueFeatures = new Set(features);
        expect(uniqueFeatures.size).toBe(features.length);
      });
    });

    describe('Operating Modes', () => {
      test('should have development and production modes', () => {
        expect(config.operating_modes.development).toBeDefined();
        expect(config.operating_modes.production).toBeDefined();
      });

      test('should have opposite debug settings', () => {
        const dev = config.operating_modes.development;
        const prod = config.operating_modes.production;
        expect(dev.debug).not.toBe(prod.debug);
      });

      test('should define logging levels', () => {
        const dev = config.operating_modes.development;
        const prod = config.operating_modes.production;
        
        expect(dev.logging).toBeDefined();
        expect(prod.logging).toBeDefined();
        expect(typeof dev.logging).toBe('string');
        expect(typeof prod.logging).toBe('string');
      });

      test('should have valid logging levels', () => {
        const validLevels = ['verbose', 'debug', 'info', 'warn', 'error', 'silent'];
        const dev = config.operating_modes.development;
        const prod = config.operating_modes.production;
        
        expect(validLevels).toContain(dev.logging);
        expect(validLevels).toContain(prod.logging);
      });

      test('should enable hot reload in development', () => {
        expect(config.operating_modes.development.hot_reload).toBe(true);
      });

      test('should optimize for performance in production', () => {
        expect(config.operating_modes.production.performance_optimized).toBe(true);
      });
    });

    describe('Performance Targets', () => {
      test('should have reasonable response time targets', () => {
        const responseTime = config.performance.response_time;
        expect(responseTime.target_ms).toBeGreaterThan(0);
        expect(responseTime.max_ms).toBeGreaterThan(responseTime.target_ms);
        expect(responseTime.target_ms).toBeLessThan(5000);
        expect(responseTime.max_ms).toBeLessThan(30000);
      });

      test('should have positive memory limits', () => {
        const memory = config.performance.memory_usage;
        expect(memory.max_mb).toBeGreaterThan(0);
        expect(memory.max_mb).toBeLessThan(10000);
      });

      test('should enable memory optimization', () => {
        expect(config.performance.memory_usage.optimization).toBe(true);
      });

      test('should have reasonable concurrency limits', () => {
        const concurrent = config.performance.concurrent_operations;
        expect(concurrent.max_parallel).toBeGreaterThan(0);
        expect(concurrent.max_parallel).toBeLessThan(1000);
        expect(concurrent.queue_size).toBeGreaterThan(concurrent.max_parallel);
      });

      test('should have queue size larger than parallel limit', () => {
        const concurrent = config.performance.concurrent_operations;
        expect(concurrent.queue_size).toBeGreaterThan(concurrent.max_parallel);
      });
    });

    describe('Configuration Consistency', () => {
      test('should have all capabilities enabled by default', () => {
        Object.values(config.core_capabilities).forEach(capability => {
          expect(capability.enabled).toBe(true);
        });
      });

      test('should have performance targets aligned across metrics', () => {
        const performance = config.performance;
        expect(performance.response_time).toBeDefined();
        expect(performance.memory_usage).toBeDefined();
        expect(performance.concurrent_operations).toBeDefined();
      });

      test('should have consistent structure across capabilities', () => {
        Object.values(config.core_capabilities).forEach(capability => {
          expect(capability).toHaveProperty('enabled');
          expect(typeof capability.enabled).toBe('boolean');
        });
      });
    });
  });

  describe('tools.json - Structure Validation', () => {
    let tools;

    beforeAll(() => {
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      const toolsData = fs.readFileSync(toolsPath, 'utf8');
      tools = JSON.parse(toolsData);
    });

    test('should be an array', () => {
      expect(Array.isArray(tools)).toBe(true);
    });

    test('should contain at least one tool', () => {
      expect(tools.length).toBeGreaterThan(0);
    });

    test('should have valid tool type for each tool', () => {
      tools.forEach(tool => {
        expect(tool).toHaveProperty('type');
        expect(tool.type).toBe('function');
      });
    });

    test('should have function definition for each tool', () => {
      tools.forEach(tool => {
        expect(tool).toHaveProperty('function');
        expect(typeof tool.function).toBe('object');
      });
    });

    test('should have name and description for each function', () => {
      tools.forEach(tool => {
        expect(tool.function).toHaveProperty('name');
        expect(tool.function).toHaveProperty('description');
        expect(typeof tool.function.name).toBe('string');
        expect(typeof tool.function.description).toBe('string');
      });
    });

    test('should have non-empty names', () => {
      tools.forEach(tool => {
        expect(tool.function.name.length).toBeGreaterThan(0);
      });
    });

    test('should have descriptive descriptions', () => {
      tools.forEach(tool => {
        expect(tool.function.description.length).toBeGreaterThan(10);
      });
    });

    test('should have parameters object', () => {
      tools.forEach(tool => {
        if (tool.function.parameters) {
          expect(typeof tool.function.parameters).toBe('object');
          expect(tool.function.parameters).toHaveProperty('type');
          expect(tool.function.parameters.type).toBe('object');
        }
      });
    });

    test('should have properties in parameters', () => {
      tools.forEach(tool => {
        if (tool.function.parameters) {
          expect(tool.function.parameters).toHaveProperty('properties');
          expect(typeof tool.function.parameters.properties).toBe('object');
        }
      });
    });

    test('should have valid parameter types', () => {
      const validTypes = ['string', 'number', 'integer', 'boolean', 'array', 'object'];
      
      tools.forEach(tool => {
        if (tool.function.parameters && tool.function.parameters.properties) {
          Object.values(tool.function.parameters.properties).forEach(param => {
            expect(param).toHaveProperty('type');
            expect(validTypes).toContain(param.type);
          });
        }
      });
    });

    test('should have descriptions for all parameters', () => {
      tools.forEach(tool => {
        if (tool.function.parameters && tool.function.parameters.properties) {
          Object.values(tool.function.parameters.properties).forEach(param => {
            expect(param).toHaveProperty('description');
            expect(typeof param.description).toBe('string');
            expect(param.description.length).toBeGreaterThan(5);
          });
        }
      });
    });

    test('should have unique tool names', () => {
      const names = tools.map(tool => tool.function.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    test('should have valid required fields in parameters', () => {
      tools.forEach(tool => {
        if (tool.function.parameters && tool.function.parameters.required) {
          expect(Array.isArray(tool.function.parameters.required)).toBe(true);
          
          // All required fields should exist in properties
          tool.function.parameters.required.forEach(reqField => {
            expect(tool.function.parameters.properties).toHaveProperty(reqField);
          });
        }
      });
    });

    test('should have array items definition for array parameters', () => {
      tools.forEach(tool => {
        if (tool.function.parameters && tool.function.parameters.properties) {
          Object.values(tool.function.parameters.properties).forEach(param => {
            if (param.type === 'array') {
              expect(param).toHaveProperty('items');
              expect(typeof param.items).toBe('object');
            }
          });
        }
      });
    });
  });

  describe('Configuration File Integrity', () => {
    test('system-config.json should be valid JSON', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      
      expect(() => JSON.parse(configData)).not.toThrow();
    });

    test('tools.json should be valid JSON', () => {
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      const toolsData = fs.readFileSync(toolsPath, 'utf8');
      
      expect(() => JSON.parse(toolsData)).not.toThrow();
    });

    test('configuration files should be readable', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      
      expect(fs.existsSync(configPath)).toBe(true);
      expect(fs.existsSync(toolsPath)).toBe(true);
    });

    test('configuration files should not be empty', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      
      const configStats = fs.statSync(configPath);
      const toolsStats = fs.statSync(toolsPath);
      
      expect(configStats.size).toBeGreaterThan(0);
      expect(toolsStats.size).toBeGreaterThan(0);
    });
  });

  describe('Cross-Configuration Validation', () => {
    let config;
    let tools;

    beforeAll(() => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
    });

    test('should have tool system enabled if tools are defined', () => {
      if (tools.length > 0) {
        expect(config.core_capabilities.tool_system.enabled).toBe(true);
      }
    });

    test('should have json_defined set to true if tools exist', () => {
      if (tools.length > 0) {
        expect(config.core_capabilities.tool_system.json_defined).toBe(true);
      }
    });

    test('should have consistent capability flags', () => {
      const capabilities = config.core_capabilities;
      
      // If security is enabled, it should have features
      if (capabilities.security.enabled) {
        expect(capabilities.security.features.length).toBeGreaterThan(0);
      }
      
      // If planning is enabled, it should have modes
      if (capabilities.planning_system.enabled) {
        expect(capabilities.planning_system.modes.length).toBeGreaterThan(0);
      }
    });
  });
});