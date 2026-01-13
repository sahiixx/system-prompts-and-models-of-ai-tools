/**
 * Unit Tests for Configuration Files
 * 
 * These tests validate the structure and content of:
 * - config/system-config.json
 * - config/tools.json
 */

const fs = require('fs');
const path = require('path');

describe('Configuration Files', () => {
  describe('system-config.json', () => {
    let config;

    beforeAll(() => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(configData);
    });

    test('should be valid JSON', () => {
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    test('should have platform information', () => {
      expect(config.platform).toBeDefined();
      expect(config.platform.name).toBe('Unified AI Platform');
      expect(config.platform.version).toBeDefined();
      expect(config.platform.description).toBeDefined();
    });

    test('should have core capabilities defined', () => {
      expect(config.core_capabilities).toBeDefined();
      expect(config.core_capabilities.multi_modal).toBeDefined();
      expect(config.core_capabilities.memory_system).toBeDefined();
      expect(config.core_capabilities.tool_system).toBeDefined();
      expect(config.core_capabilities.planning_system).toBeDefined();
      expect(config.core_capabilities.security).toBeDefined();
    });

    test('should have all capabilities enabled by default', () => {
      expect(config.core_capabilities.multi_modal.enabled).toBe(true);
      expect(config.core_capabilities.memory_system.enabled).toBe(true);
      expect(config.core_capabilities.tool_system.enabled).toBe(true);
      expect(config.core_capabilities.planning_system.enabled).toBe(true);
      expect(config.core_capabilities.security.enabled).toBe(true);
    });

    test('should define multi-modal supported types', () => {
      const multiModal = config.core_capabilities.multi_modal;
      expect(Array.isArray(multiModal.supported_types)).toBe(true);
      expect(multiModal.supported_types).toContain('text');
      expect(multiModal.supported_types).toContain('code');
    });

    test('should define memory system types', () => {
      const memory = config.core_capabilities.memory_system;
      expect(Array.isArray(memory.types)).toBe(true);
      expect(memory.persistence).toBeDefined();
    });

    test('should define tool system properties', () => {
      const tools = config.core_capabilities.tool_system;
      expect(tools.modular).toBe(true);
      expect(tools.json_defined).toBe(true);
      expect(tools.dynamic_loading).toBe(true);
    });

    test('should define planning system modes', () => {
      const planning = config.core_capabilities.planning_system;
      expect(Array.isArray(planning.modes)).toBe(true);
      expect(Array.isArray(planning.strategies)).toBe(true);
    });

    test('should define security features', () => {
      const security = config.core_capabilities.security;
      expect(Array.isArray(security.features)).toBe(true);
      expect(security.features.length).toBeGreaterThan(0);
    });

    test('should have operating modes', () => {
      expect(config.operating_modes).toBeDefined();
      expect(config.operating_modes.development).toBeDefined();
      expect(config.operating_modes.production).toBeDefined();
    });

    test('should have different debug settings for modes', () => {
      expect(config.operating_modes.development.debug).toBe(true);
      expect(config.operating_modes.production.debug).toBe(false);
    });

    test('should have performance targets', () => {
      expect(config.performance).toBeDefined();
      expect(config.performance.response_time).toBeDefined();
      expect(config.performance.memory_usage).toBeDefined();
      expect(config.performance.concurrent_operations).toBeDefined();
    });

    test('should have reasonable performance targets', () => {
      const { response_time, memory_usage, concurrent_operations } = config.performance;
      
      expect(response_time.target_ms).toBeGreaterThan(0);
      expect(response_time.max_ms).toBeGreaterThan(response_time.target_ms);
      expect(memory_usage.max_mb).toBeGreaterThan(0);
      expect(concurrent_operations.max_parallel).toBeGreaterThan(0);
      expect(concurrent_operations.queue_size).toBeGreaterThan(0);
    });

    test('should not have any null or undefined required fields', () => {
      expect(config.platform.name).not.toBeNull();
      expect(config.platform.version).not.toBeNull();
      expect(config.core_capabilities).not.toBeNull();
      expect(config.performance).not.toBeNull();
    });
  });

  describe('tools.json', () => {
    let tools;

    beforeAll(() => {
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      const toolsData = fs.readFileSync(toolsPath, 'utf8');
      tools = JSON.parse(toolsData);
    });

    test('should be valid JSON array', () => {
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
    });

    test('should have at least one tool defined', () => {
      expect(tools.length).toBeGreaterThan(0);
    });

    test('all tools should have type property', () => {
      tools.forEach(tool => {
        expect(tool.type).toBeDefined();
        expect(tool.type).toBe('function');
      });
    });

    test('all tools should have function definition', () => {
      tools.forEach(tool => {
        expect(tool.function).toBeDefined();
        expect(tool.function.name).toBeDefined();
        expect(tool.function.description).toBeDefined();
      });
    });

    test('all tools should have parameters', () => {
      tools.forEach(tool => {
        expect(tool.function.parameters).toBeDefined();
        expect(tool.function.parameters.type).toBe('object');
        expect(tool.function.parameters.properties).toBeDefined();
      });
    });

    test('tool names should be unique', () => {
      const names = tools.map(t => t.function.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    test('tool names should follow naming convention', () => {
      tools.forEach(tool => {
        const name = tool.function.name;
        // Should be snake_case
        expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });

    test('tool descriptions should not be empty', () => {
      tools.forEach(tool => {
        expect(tool.function.description.length).toBeGreaterThan(0);
      });
    });

    test('required parameters should be defined', () => {
      tools.forEach(tool => {
        if (tool.function.parameters.required) {
          expect(Array.isArray(tool.function.parameters.required)).toBe(true);
        }
      });
    });

    test('required parameters should exist in properties', () => {
      tools.forEach(tool => {
        const required = tool.function.parameters.required || [];
        const properties = tool.function.parameters.properties || {};
        
        required.forEach(reqParam => {
          expect(properties[reqParam]).toBeDefined();
        });
      });
    });

    test('parameter properties should have types', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        
        Object.values(properties).forEach(prop => {
          expect(prop.type).toBeDefined();
        });
      });
    });

    test('should include common tool types', () => {
      const toolNames = tools.map(t => t.function.name);
      
      // Check for expected common tools based on the first 100 lines we saw
      const expectedTools = ['codebase_search', 'read_file', 'run_terminal_cmd', 'list_dir'];
      expectedTools.forEach(expectedTool => {
        expect(toolNames).toContain(expectedTool);
      });
    });

    test('tools should have explanation parameter where appropriate', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        
        // Many tools should have explanation for clarity
        if (properties.explanation) {
          expect(properties.explanation.type).toBe('string');
          expect(properties.explanation.description).toBeDefined();
        }
      });
    });
  });

  describe('Configuration Integration', () => {
    test('system-config and tools should be loadable together', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
      
      expect(config).toBeDefined();
      expect(tools).toBeDefined();
      expect(config.core_capabilities.tool_system.enabled).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    test('configuration files should not have syntax errors', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      
      expect(() => {
        JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }).not.toThrow();
      
      expect(() => {
        JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
      }).not.toThrow();
    });
  });
});
  describe('Configuration Schema Validation', () => {
    let config;

    beforeAll(() => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(configData);
    });

    test('should have all required top-level keys', () => {
      const requiredKeys = ['platform', 'core_capabilities', 'performance'];
      requiredKeys.forEach(key => {
        expect(config).toHaveProperty(key);
        expect(config[key]).not.toBeNull();
        expect(config[key]).not.toBeUndefined();
      });
    });

    test('platform should have semantic version format', () => {
      const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;
      expect(config.platform.version).toMatch(versionRegex);
    });

    test('all capability flags should be boolean', () => {
      const capabilities = config.core_capabilities;
      Object.values(capabilities).forEach(cap => {
        if (cap.enabled !== undefined) {
          expect(typeof cap.enabled).toBe('boolean');
        }
      });
    });

    test('performance targets should be positive numbers', () => {
      const perf = config.performance;
      expect(perf.response_time.target_ms).toBeGreaterThan(0);
      expect(perf.response_time.max_ms).toBeGreaterThan(0);
      expect(perf.memory_usage.max_mb).toBeGreaterThan(0);
      expect(perf.concurrent_operations.max_parallel).toBeGreaterThan(0);
    });

    test('should not contain environment-specific secrets', () => {
      const configString = JSON.stringify(config);
      expect(configString).not.toMatch(/password/i);
      expect(configString).not.toMatch(/api[_-]?key/i);
      expect(configString).not.toMatch(/secret/i);
      expect(configString).not.toMatch(/token(?!_ms)/i);
    });
  });

  describe('Tools Configuration Deep Validation', () => {
    let tools;

    beforeAll(() => {
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      const toolsData = fs.readFileSync(toolsPath, 'utf8');
      tools = JSON.parse(toolsData);
    });

    test('all tools should have unique names', () => {
      const names = tools.map(t => t.function.name);
      const uniqueNames = new Set(names);
      expect(names.length).toBe(uniqueNames.size);
    });

    test('all tool descriptions should be meaningful', () => {
      tools.forEach(tool => {
        expect(tool.function.description.length).toBeGreaterThan(10);
        expect(tool.function.description).not.toMatch(/^(test|TODO|placeholder)/i);
      });
    });

    test('required parameters should exist in properties', () => {
      tools.forEach(tool => {
        const params = tool.function.parameters;
        if (params.required && params.required.length > 0) {
          params.required.forEach(reqParam => {
            expect(params.properties).toHaveProperty(reqParam);
          });
        }
      });
    });
  });

  describe('Security and Compliance', () => {
    let config, tools;

    beforeAll(() => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
    });

    test('security capability should be enabled', () => {
      expect(config.core_capabilities.security.enabled).toBe(true);
    });

    test('security features should be defined', () => {
      const security = config.core_capabilities.security;
      expect(Array.isArray(security.features)).toBe(true);
      expect(security.features.length).toBeGreaterThan(0);
    });

    test('configuration should not expose internal paths', () => {
      const configString = JSON.stringify(config);
      expect(configString).not.toMatch(/\/home\//);
      expect(configString).not.toMatch(/C:\\Users\\/);
      expect(configString).not.toMatch(/\/root\//);
    });
  });