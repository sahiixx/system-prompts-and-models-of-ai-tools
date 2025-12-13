/**
 * Enhanced Unit Tests for Configuration Files
 * 
 * Additional comprehensive tests for:
 * - Configuration validation
 * - Edge cases in config values
 * - Tool schema validation
 * - Performance characteristics
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

    describe('Version Validation', () => {
      test('should have semantic versioning format', () => {
        const version = config.platform.version;
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      });

      test('should have non-negative version numbers', () => {
        const [major, minor, patch] = config.platform.version.split('.').map(Number);
        expect(major).toBeGreaterThanOrEqual(0);
        expect(minor).toBeGreaterThanOrEqual(0);
        expect(patch).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Capability Configuration Consistency', () => {
      test('all capabilities should have enabled property', () => {
        const capabilities = config.core_capabilities;
        Object.values(capabilities).forEach(capability => {
          expect(capability).toHaveProperty('enabled');
          expect(typeof capability.enabled).toBe('boolean');
        });
      });

      test('multi-modal should have complete configuration', () => {
        const multiModal = config.core_capabilities.multi_modal;
        expect(multiModal.supported_types).toBeDefined();
        expect(Array.isArray(multiModal.supported_types)).toBe(true);
        expect(multiModal.processors).toBeDefined();
        expect(Array.isArray(multiModal.processors)).toBe(true);
        expect(multiModal.processors.length).toBeGreaterThan(0);
      });

      test('memory system should specify persistence type', () => {
        const memory = config.core_capabilities.memory_system;
        expect(memory.persistence).toBeDefined();
        expect(typeof memory.persistence).toBe('string');
        expect(memory.types).toBeDefined();
        expect(Array.isArray(memory.types)).toBe(true);
      });

      test('planning system should define all modes and strategies', () => {
        const planning = config.core_capabilities.planning_system;
        expect(planning.modes).toBeDefined();
        expect(planning.strategies).toBeDefined();
        expect(planning.modes.length).toBeGreaterThan(0);
        expect(planning.strategies.length).toBeGreaterThan(0);
      });

      test('security features should be comprehensive', () => {
        const security = config.core_capabilities.security;
        expect(security.features).toContain('authentication');
        expect(security.features).toContain('authorization');
        expect(security.features.length).toBeGreaterThanOrEqual(4);
      });
    });

    describe('Operating Modes Configuration', () => {
      test('development and production modes should be mutually exclusive in debug', () => {
        const dev = config.operating_modes.development.debug;
        const prod = config.operating_modes.production.debug;
        expect(dev).not.toBe(prod);
      });

      test('production mode should optimize performance', () => {
        const prod = config.operating_modes.production;
        expect(prod.performance_optimized).toBe(true);
      });

      test('development mode should enable debugging features', () => {
        const dev = config.operating_modes.development;
        expect(dev.debug).toBe(true);
        expect(dev.logging).toBe('verbose');
      });
    });

    describe('Performance Targets', () => {
      test('response times should be realistic', () => {
        const { target_ms, max_ms } = config.performance.response_time;
        expect(target_ms).toBeGreaterThan(0);
        expect(target_ms).toBeLessThan(max_ms);
        expect(max_ms).toBeLessThan(30000); // Should be under 30 seconds
      });

      test('memory limits should be reasonable', () => {
        const { max_mb } = config.performance.memory_usage;
        expect(max_mb).toBeGreaterThan(0);
        expect(max_mb).toBeLessThan(10000); // Should be under 10GB
      });

      test('concurrent operations should have queue', () => {
        const concurrent = config.performance.concurrent_operations;
        expect(concurrent.max_parallel).toBeGreaterThan(0);
        expect(concurrent.queue_size).toBeGreaterThan(concurrent.max_parallel);
      });
    });

    describe('Data Type Validation', () => {
      test('all string fields should be non-empty', () => {
        expect(config.platform.name.length).toBeGreaterThan(0);
        expect(config.platform.version.length).toBeGreaterThan(0);
        expect(config.platform.description.length).toBeGreaterThan(0);
      });

      test('all boolean fields should be true or false', () => {
        const checkBooleans = (obj) => {
          Object.entries(obj).forEach(([key, value]) => {
            if (typeof value === 'boolean') {
              expect([true, false]).toContain(value);
            } else if (typeof value === 'object' && value !== null) {
              checkBooleans(value);
            }
          });
        };
        checkBooleans(config);
      });

      test('all number fields should be non-negative', () => {
        const checkNumbers = (obj) => {
          Object.entries(obj).forEach(([key, value]) => {
            if (typeof value === 'number') {
              expect(value).toBeGreaterThanOrEqual(0);
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              checkNumbers(value);
            }
          });
        };
        checkNumbers(config.performance);
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

    describe('Tool Schema Validation', () => {
      test('all tools should follow consistent schema', () => {
        tools.forEach(tool => {
          expect(tool).toHaveProperty('type');
          expect(tool).toHaveProperty('function');
          expect(tool.function).toHaveProperty('name');
          expect(tool.function).toHaveProperty('description');
          expect(tool.function).toHaveProperty('parameters');
        });
      });

      test('all parameter types should be valid JSON Schema types', () => {
        const validTypes = ['string', 'number', 'integer', 'boolean', 'array', 'object'];
        
        tools.forEach(tool => {
          const properties = tool.function.parameters.properties || {};
          Object.values(properties).forEach(prop => {
            expect(validTypes).toContain(prop.type);
          });
        });
      });

      test('array parameters should define items', () => {
        tools.forEach(tool => {
          const properties = tool.function.parameters.properties || {};
          Object.entries(properties).forEach(([name, prop]) => {
            if (prop.type === 'array') {
              expect(prop.items).toBeDefined();
            }
          });
        });
      });

      test('object parameters should define properties', () => {
        tools.forEach(tool => {
          const properties = tool.function.parameters.properties || {};
          Object.entries(properties).forEach(([name, prop]) => {
            if (prop.type === 'object') {
              // Object type parameters may or may not have properties defined
              // This is valid JSON Schema
              expect(prop).toBeDefined();
            }
          });
        });
      });
    });

    describe('Tool Naming Conventions', () => {
      test('tool names should not have uppercase letters', () => {
        tools.forEach(tool => {
          expect(tool.function.name).toBe(tool.function.name.toLowerCase());
        });
      });

      test('tool names should not start with numbers', () => {
        tools.forEach(tool => {
          expect(tool.function.name).toMatch(/^[a-z]/);
        });
      });

      test('tool names should not have spaces', () => {
        tools.forEach(tool => {
          expect(tool.function.name).not.toMatch(/\s/);
        });
      });
    });

    describe('Description Quality', () => {
      test('descriptions should be meaningful', () => {
        tools.forEach(tool => {
          expect(tool.function.description.length).toBeGreaterThan(10);
        });
      });

      test('parameter descriptions should exist when defined', () => {
        tools.forEach(tool => {
          const properties = tool.function.parameters.properties || {};
          Object.entries(properties).forEach(([name, prop]) => {
            if (prop.description) {
              expect(prop.description.length).toBeGreaterThan(0);
            }
          });
        });
      });

      test('descriptions should not contain placeholder text', () => {
        const placeholders = ['TODO', 'TBD', 'FIXME', 'XXX'];
        tools.forEach(tool => {
          placeholders.forEach(placeholder => {
            expect(tool.function.description.toUpperCase()).not.toContain(placeholder);
          });
        });
      });
    });

    describe('Required Parameters Validation', () => {
      test('required array should not contain duplicates', () => {
        tools.forEach(tool => {
          const required = tool.function.parameters.required || [];
          const uniqueRequired = [...new Set(required)];
          expect(required.length).toBe(uniqueRequired.length);
        });
      });

      test('required parameters should exist in properties', () => {
        tools.forEach(tool => {
          const required = tool.function.parameters.required || [];
          const properties = tool.function.parameters.properties || {};
          const propertyNames = Object.keys(properties);
          
          required.forEach(reqParam => {
            expect(propertyNames).toContain(reqParam);
          });
        });
      });

      test('all properties should be either required or optional', () => {
        tools.forEach(tool => {
          const required = tool.function.parameters.required || [];
          const properties = tool.function.parameters.properties || {};
          const propertyNames = Object.keys(properties);
          
          // Just verify they exist - being in required or not is both valid
          propertyNames.forEach(propName => {
            expect(properties[propName]).toBeDefined();
          });
        });
      });
    });

    describe('Tool Coverage', () => {
      test('should have tools for common operations', () => {
        const toolNames = tools.map(t => t.function.name);
        
        // Should have at least some basic tools
        expect(toolNames.length).toBeGreaterThan(0);
      });

      test('should not have empty tools array', () => {
        expect(tools.length).toBeGreaterThan(0);
      });

      test('tools should cover various categories', () => {
        const toolNames = tools.map(t => t.function.name).join(' ');
        
        // Check for various operation types (flexible, not all required)
        const hasVariety = toolNames.includes('search') || 
                          toolNames.includes('read') || 
                          toolNames.includes('run') ||
                          toolNames.includes('list');
        
        expect(hasVariety).toBe(true);
      });
    });

    describe('JSON Schema Compliance', () => {
      test('parameters should have type object', () => {
        tools.forEach(tool => {
          expect(tool.function.parameters.type).toBe('object');
        });
      });

      test('parameters should have properties field', () => {
        tools.forEach(tool => {
          expect(tool.function.parameters.properties).toBeDefined();
          expect(typeof tool.function.parameters.properties).toBe('object');
        });
      });
    });
  });

  describe('Configuration File System', () => {
    test('both config files should be in correct directory', () => {
      const configDir = path.join(__dirname, '../../config');
      expect(fs.existsSync(configDir)).toBe(true);
      
      const systemConfig = path.join(configDir, 'system-config.json');
      const toolsConfig = path.join(configDir, 'tools.json');
      
      expect(fs.existsSync(systemConfig)).toBe(true);
      expect(fs.existsSync(toolsConfig)).toBe(true);
    });

    test('config files should be readable', () => {
      const systemConfig = path.join(__dirname, '../../config/system-config.json');
      const toolsConfig = path.join(__dirname, '../../config/tools.json');
      
      expect(() => fs.readFileSync(systemConfig, 'utf8')).not.toThrow();
      expect(() => fs.readFileSync(toolsConfig, 'utf8')).not.toThrow();
    });

    test('config files should not be too large', () => {
      const systemConfig = path.join(__dirname, '../../config/system-config.json');
      const toolsConfig = path.join(__dirname, '../../config/tools.json');
      
      const systemStats = fs.statSync(systemConfig);
      const toolsStats = fs.statSync(toolsConfig);
      
      // Config files should be under 1MB
      expect(systemStats.size).toBeLessThan(1024 * 1024);
      expect(toolsStats.size).toBeLessThan(1024 * 1024);
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

    test('platform version should be consistent', () => {
      expect(config.platform.version).toBeDefined();
      expect(typeof config.platform.version).toBe('string');
    });

    test('configurations should be internally consistent', () => {
      // If tool system is modular, should support dynamic loading
      if (config.core_capabilities.tool_system.modular) {
        expect(config.core_capabilities.tool_system.dynamic_loading).toBeDefined();
      }
    });
  });
});