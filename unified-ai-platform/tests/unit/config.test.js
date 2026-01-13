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
  describe('Advanced Tools Validation', () => {
    let tools;

    beforeAll(() => {
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      const toolsData = fs.readFileSync(toolsPath, 'utf8');
      tools = JSON.parse(toolsData);
    });

    test('should have comprehensive tool coverage for all operations', () => {
      const toolNames = tools.map(t => t.function.name);
      
      // File operations
      expect(toolNames).toContain('read_file');
      expect(toolNames).toContain('file_read');
      expect(toolNames).toContain('file_write');
      expect(toolNames).toContain('edit_file');
      expect(toolNames).toContain('delete_file');
      
      // Search operations
      expect(toolNames).toContain('codebase_search');
      expect(toolNames).toContain('grep_search');
      expect(toolNames).toContain('file_search');
      
      // Shell operations
      expect(toolNames).toContain('shell');
      expect(toolNames).toContain('run_terminal_cmd');
      expect(toolNames).toContain('view_shell');
      expect(toolNames).toContain('kill_shell_process');
      
      // Communication
      expect(toolNames).toContain('message_notify_user');
      expect(toolNames).toContain('message_ask_user');
      
      // Memory and thinking
      expect(toolNames).toContain('update_memory');
      expect(toolNames).toContain('think');
    });

    test('all tools with file paths should have string type for path parameters', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        
        // Check various file path parameter names
        const filePathParams = ['target_file', 'file_path', 'file', 'relative_workspace_path'];
        filePathParams.forEach(param => {
          if (properties[param]) {
            expect(properties[param].type).toBe('string');
            expect(properties[param].description).toBeDefined();
            expect(properties[param].description.length).toBeGreaterThan(0);
          }
        });
      });
    });

    test('all tools with boolean flags should have proper type', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        
        Object.entries(properties).forEach(([key, value]) => {
          if (value.type === 'boolean') {
            expect(value.description).toBeDefined();
            // Boolean params often optional, check if in required list
            const required = tool.function.parameters.required || [];
            if (required.includes(key)) {
              expect(value.description).toContain('Whether');
            }
          }
        });
      });
    });

    test('search tools should have query parameters', () => {
      const searchTools = tools.filter(t => 
        t.function.name.includes('search') || 
        t.function.name.includes('grep') ||
        t.function.name.includes('find')
      );
      
      expect(searchTools.length).toBeGreaterThan(0);
      
      searchTools.forEach(tool => {
        const properties = tool.function.parameters.properties;
        expect(properties.query).toBeDefined();
        expect(properties.query.type).toBe('string');
      });
    });

    test('shell tools should have command or exec_dir parameters', () => {
      const shellTools = tools.filter(t => 
        t.function.name.includes('shell') || 
        t.function.name.includes('terminal') ||
        t.function.name === 'run_terminal_cmd'
      );
      
      expect(shellTools.length).toBeGreaterThan(0);
      
      shellTools.forEach(tool => {
        const properties = tool.function.parameters.properties;
        const hasCommand = properties.command !== undefined;
        const hasExecDir = properties.exec_dir !== undefined;
        
        // Should have at least one of these
        expect(hasCommand || hasExecDir).toBe(true);
      });
    });

    test('edit tools should have proper parameters for editing', () => {
      const editTools = tools.filter(t => 
        t.function.name.includes('edit') || 
        t.function.name.includes('write') ||
        t.function.name === 'search_replace'
      );
      
      expect(editTools.length).toBeGreaterThan(0);
      
      editTools.forEach(tool => {
        const properties = tool.function.parameters.properties;
        
        // Should have some form of file specification
        const hasFileParam = 
          properties.target_file !== undefined || 
          properties.file_path !== undefined ||
          properties.file !== undefined;
        
        expect(hasFileParam).toBe(true);
        
        // Should have some form of content or change specification
        const hasContentParam = 
          properties.content !== undefined || 
          properties.code_edit !== undefined ||
          properties.old_string !== undefined ||
          properties.new_string !== undefined ||
          properties.instructions !== undefined;
        
        expect(hasContentParam).toBe(true);
      });
    });

    test('message tools should have text parameter', () => {
      const messageTools = tools.filter(t => t.function.name.startsWith('message_'));
      
      expect(messageTools.length).toBeGreaterThan(0);
      
      messageTools.forEach(tool => {
        const properties = tool.function.parameters.properties;
        expect(properties.text).toBeDefined();
        expect(properties.text.type).toBe('string');
        expect(tool.function.parameters.required).toContain('text');
      });
    });

    test('tools with enum fields should have valid values', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        
        Object.values(properties).forEach(prop => {
          if (prop.enum) {
            expect(Array.isArray(prop.enum)).toBe(true);
            expect(prop.enum.length).toBeGreaterThan(0);
            // All enum values should be strings
            prop.enum.forEach(val => {
              expect(typeof val).toBe('string');
            });
          }
        });
      });
    });

    test('tools should have meaningful descriptions', () => {
      tools.forEach(tool => {
        const desc = tool.function.description;
        
        // Description should exist and be substantial
        expect(desc).toBeDefined();
        expect(desc.length).toBeGreaterThan(20);
        
        // Should start with capital letter
        expect(desc[0]).toBe(desc[0].toUpperCase());
        
        // Should end with proper punctuation
        expect(desc[desc.length - 1]).toMatch(/[.!?]/);
      });
    });

    test('tools with optional parameters should indicate optionality in description', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        const required = tool.function.parameters.required || [];
        
        Object.entries(properties).forEach(([paramName, paramDef]) => {
          if (!required.includes(paramName)) {
            // Optional parameters should often have "(Optional)" in description
            // This is a guideline, not strict requirement
            const desc = paramDef.description || '';
            if (desc.includes('Optional')) {
              expect(desc).toContain('(Optional)');
            }
          }
        });
      });
    });

    test('array parameters should have items schema', () => {
      tools.forEach(tool => {
        const properties = tool.function.parameters.properties || {};
        
        Object.values(properties).forEach(prop => {
          if (prop.type === 'array') {
            expect(prop.items).toBeDefined();
          }
        });
      });
    });

    test('tools should not have duplicate function names', () => {
      const names = tools.map(t => t.function.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    test('complex tools should have appropriate parameters', () => {
      // read_file tool should have line range parameters
      const readFileTool = tools.find(t => t.function.name === 'read_file');
      if (readFileTool) {
        const props = readFileTool.function.parameters.properties;
        expect(props.start_line_one_indexed).toBeDefined();
        expect(props.end_line_one_indexed_inclusive).toBeDefined();
        expect(props.should_read_entire_file).toBeDefined();
        expect(props.should_read_entire_file.type).toBe('boolean');
      }

      // search_replace should have old and new strings
      const searchReplaceTool = tools.find(t => t.function.name === 'search_replace');
      if (searchReplaceTool) {
        const props = searchReplaceTool.function.parameters.properties;
        expect(props.old_string).toBeDefined();
        expect(props.new_string).toBeDefined();
        expect(props.file_path).toBeDefined();
      }

      // update_memory should have action enum
      const memoryTool = tools.find(t => t.function.name === 'update_memory');
      if (memoryTool) {
        const props = memoryTool.function.parameters.properties;
        expect(props.action).toBeDefined();
        expect(props.action.enum).toBeDefined();
        expect(props.action.enum).toContain('create');
        expect(props.action.enum).toContain('update');
        expect(props.action.enum).toContain('delete');
      }
    });
  });

  describe('System Configuration Edge Cases', () => {
    let config;

    beforeAll(() => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(configData);
    });

    test('performance targets should be realistic and achievable', () => {
      const { response_time, memory_usage, concurrent_operations } = config.performance;
      
      // Response time checks
      expect(response_time.target_ms).toBeLessThan(response_time.max_ms);
      expect(response_time.target_ms).toBeGreaterThanOrEqual(100);
      expect(response_time.max_ms).toBeLessThanOrEqual(30000);
      
      // Memory checks
      expect(memory_usage.max_mb).toBeGreaterThan(100);
      expect(memory_usage.max_mb).toBeLessThan(10000);
      
      // Concurrency checks
      expect(concurrent_operations.max_parallel).toBeGreaterThan(0);
      expect(concurrent_operations.max_parallel).toBeLessThan(1000);
      expect(concurrent_operations.queue_size).toBeGreaterThanOrEqual(concurrent_operations.max_parallel);
    });

    test('all capability enabled flags should be boolean', () => {
      Object.values(config.core_capabilities).forEach(capability => {
        if (capability.enabled !== undefined) {
          expect(typeof capability.enabled).toBe('boolean');
        }
      });
    });

    test('operating modes should have distinct configurations', () => {
      const dev = config.operating_modes.development;
      const prod = config.operating_modes.production;
      
      // Debug should differ between modes
      expect(dev.debug).not.toBe(prod.debug);
      
      // Logging levels should differ
      expect(dev.logging).not.toBe(prod.logging);
      
      // Production should be optimized
      if (prod.performance_optimized !== undefined) {
        expect(prod.performance_optimized).toBe(true);
      }
    });

    test('platform version should follow semantic versioning', () => {
      const version = config.platform.version;
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('supported types in multi-modal should be valid', () => {
      const types = config.core_capabilities.multi_modal.supported_types;
      const validTypes = ['text', 'code', 'image', 'audio', 'video', 'json', 'xml'];
      
      types.forEach(type => {
        expect(validTypes).toContain(type);
      });
    });

    test('memory system should have valid persistence strategy', () => {
      const persistence = config.core_capabilities.memory_system.persistence;
      const validStrategies = ['in_memory', 'file', 'database', 'redis', 'persistent'];
      
      expect(validStrategies).toContain(persistence);
    });

    test('planning modes should be valid strategies', () => {
      const modes = config.core_capabilities.planning_system.modes;
      const strategies = config.core_capabilities.planning_system.strategies;
      
      expect(Array.isArray(modes)).toBe(true);
      expect(Array.isArray(strategies)).toBe(true);
      
      // Common valid modes
      const validModes = ['two_phase', 'execution', 'planning', 'interactive', 'autonomous'];
      modes.forEach(mode => {
        expect(validModes).toContain(mode);
      });
      
      // Common valid strategies
      const validStrategies = ['sequential', 'parallel', 'adaptive', 'reactive'];
      strategies.forEach(strategy => {
        expect(validStrategies).toContain(strategy);
      });
    });

    test('security features should be comprehensive', () => {
      const features = config.core_capabilities.security.features;
      
      // Should include essential security features
      expect(features).toContain('authentication');
      expect(features).toContain('authorization');
      
      // Should have data protection
      const hasDataProtection = 
        features.includes('data_encryption') || 
        features.includes('encryption') ||
        features.includes('data_protection');
      expect(hasDataProtection).toBe(true);
      
      // Should have input validation
      const hasValidation = 
        features.includes('input_validation') ||
        features.includes('validation');
      expect(hasValidation).toBe(true);
    });

    test('configuration should not contain sensitive data', () => {
      const configStr = JSON.stringify(config);
      
      // Should not contain passwords, keys, tokens
      expect(configStr).not.toMatch(/password/i);
      expect(configStr).not.toMatch(/api[_-]?key/i);
      expect(configStr).not.toMatch(/secret/i);
      expect(configStr).not.toMatch(/token/i);
      expect(configStr).not.toMatch(/credential/i);
    });

    test('all array fields should be arrays', () => {
      const checkArrays = (obj) => {
        Object.entries(obj).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            expect(Array.isArray(value)).toBe(true);
          } else if (typeof value === 'object' && value !== null) {
            checkArrays(value);
          }
        });
      };
      
      checkArrays(config);
    });
  });

  describe('Tools and Config Integration Tests', () => {
    let config;
    let tools;
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

    test('tool count should be reasonable for the platform capabilities', () => {
      // Platform should have adequate tools for its capabilities
      expect(tools.length).toBeGreaterThanOrEqual(10);
      expect(tools.length).toBeLessThan(100);
    });

    test('if tool system is enabled, tools should be available', () => {
      if (config.core_capabilities.tool_system.enabled) {
        expect(tools.length).toBeGreaterThan(0);
      }
    });

    test('tool system configuration should match tools structure', () => {
      if (config.core_capabilities.tool_system.json_defined) {
        // All tools should follow JSON schema
        tools.forEach(tool => {
          expect(tool.type).toBe('function');
          expect(tool.function).toBeDefined();
          expect(tool.function.name).toBeDefined();
          expect(tool.function.parameters).toBeDefined();
        });
      }
    });

    test('if memory system is enabled, memory tools should exist', () => {
      if (config.core_capabilities.memory_system.enabled) {
        const memoryTools = tools.filter(t => 
          t.function.name.includes('memory') ||
          t.function.description.toLowerCase().includes('memory')
        );
        expect(memoryTools.length).toBeGreaterThan(0);
      }
    });

    test('performance targets should align with tool complexity', () => {
      const complexTools = tools.filter(t => {
        const paramCount = Object.keys(t.function.parameters.properties || {}).length;
        return paramCount > 5;
      });
      
      // If we have complex tools, we should have reasonable performance targets
      if (complexTools.length > 0) {
        expect(config.performance.response_time.max_ms).toBeGreaterThan(1000);
      }
    });
  });
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
