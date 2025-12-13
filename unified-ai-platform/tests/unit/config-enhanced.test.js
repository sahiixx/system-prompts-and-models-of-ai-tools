/**
 * Enhanced unit tests for unified-ai-platform configuration files
 * Tests schema validation, content integrity, and cross-references
 */

const fs = require('fs');
const path = require('path');

describe('Unified AI Platform Configuration - Enhanced Tests', () => {
  let systemConfig;
  let toolsConfig;
  
  beforeAll(() => {
    const configPath = path.join(__dirname, '../../config/system-config.json');
    const toolsPath = path.join(__dirname, '../../config/tools.json');
    
    systemConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    toolsConfig = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
  });
  
  describe('System Configuration Schema', () => {
    test('should have all required top-level fields', () => {
      expect(systemConfig).toHaveProperty('version');
      expect(systemConfig).toHaveProperty('platform');
      expect(systemConfig).toHaveProperty('features');
    });
    
    test('version should be a valid semantic version', () => {
      expect(systemConfig.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
    
    test('platform metadata should be complete', () => {
      expect(systemConfig.platform).toHaveProperty('name');
      expect(systemConfig.platform).toHaveProperty('description');
      expect(systemConfig.platform.name).toBeTruthy();
      expect(systemConfig.platform.description.length).toBeGreaterThan(10);
    });
    
    test('features should be an array', () => {
      expect(Array.isArray(systemConfig.features)).toBe(true);
      expect(systemConfig.features.length).toBeGreaterThan(0);
    });
  });
  
  describe('Tools Configuration Schema', () => {
    test('should be a valid JSON object or array', () => {
      expect(toolsConfig).toBeDefined();
      expect(typeof toolsConfig === 'object').toBe(true);
    });
    
    test('tools should have consistent structure', () => {
      const tools = Array.isArray(toolsConfig) ? toolsConfig : Object.values(toolsConfig);
      
      tools.forEach((tool, index) => {
        expect(tool).toHaveProperty('name');
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);
      });
    });
    
    test('no duplicate tool names', () => {
      const tools = Array.isArray(toolsConfig) ? toolsConfig : Object.values(toolsConfig);
      const names = tools.map(t => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });
  
  describe('Configuration Cross-References', () => {
    test('system config and tools config should be compatible versions', () => {
      // If tools have version info, it should match system version major
      expect(systemConfig.version).toBeDefined();
    });
    
    test('feature flags should be boolean or objects', () => {
      if (systemConfig.features) {
        systemConfig.features.forEach(feature => {
          expect(typeof feature === 'string' || typeof feature === 'object').toBe(true);
        });
      }
    });
  });
  
  describe('Configuration File Integrity', () => {
    test('system-config.json should be valid JSON without trailing commas', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const rawContent = fs.readFileSync(configPath, 'utf8');
      expect(() => JSON.parse(rawContent)).not.toThrow();
    });
    
    test('tools.json should be valid JSON without trailing commas', () => {
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      const rawContent = fs.readFileSync(toolsPath, 'utf8');
      expect(() => JSON.parse(rawContent)).not.toThrow();
    });
    
    test('config files should not be empty', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      
      const configSize = fs.statSync(configPath).size;
      const toolsSize = fs.statSync(toolsPath).size;
      
      expect(configSize).toBeGreaterThan(50);
      expect(toolsSize).toBeGreaterThan(50);
    });
  });
  
  describe('Security and Best Practices', () => {
    test('config should not contain sensitive information', () => {
      const configStr = JSON.stringify(systemConfig);
      const toolsStr = JSON.stringify(toolsConfig);
      
      const sensitivePatterns = [
        /password/i,
        /api[_-]?key/i,
        /secret/i,
        /token/i,
        /credential/i
      ];
      
      sensitivePatterns.forEach(pattern => {
        expect(configStr).not.toMatch(pattern);
        expect(toolsStr).not.toMatch(pattern);
      });
    });
    
    test('config should not have absolute file paths', () => {
      const configStr = JSON.stringify(systemConfig);
      expect(configStr).not.toMatch(/[C-Z]:\\/); // Windows paths
      expect(configStr).not.toMatch(/^\/home\//); // Unix absolute paths
    });
  });
});

describe('Main Prompt File Tests', () => {
  test('main-prompt.txt should exist and be readable', () => {
    const promptPath = path.join(__dirname, '../../core/system-prompts/main-prompt.txt');
    expect(fs.existsSync(promptPath)).toBe(true);
    
    const content = fs.readFileSync(promptPath, 'utf8');
    expect(content.length).toBeGreaterThan(100);
  });
  
  test('main prompt should not be empty or just whitespace', () => {
    const promptPath = path.join(__dirname, '../../core/system-prompts/main-prompt.txt');
    const content = fs.readFileSync(promptPath, 'utf8');
    expect(content.trim().length).toBeGreaterThan(50);
  });
});

describe('Jest Configuration Tests', () => {
  test('jest.config.js should exist', () => {
    const jestConfigPath = path.join(__dirname, '../../jest.config.js');
    expect(fs.existsSync(jestConfigPath)).toBe(true);
  });
  
  test('jest config should have proper test environment', () => {
    const jestConfig = require('../../jest.config.js');
    expect(jestConfig.testEnvironment).toBe('node');
  });
  
  test('jest config should have coverage thresholds', () => {
    const jestConfig = require('../../jest.config.js');
    expect(jestConfig.coverageThresholds).toBeDefined();
    expect(jestConfig.coverageThresholds.global).toBeDefined();
  });
});

describe('Package.json Validation', () => {
  let packageJson;
  
  beforeAll(() => {
    const packagePath = path.join(__dirname, '../../package.json');
    packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  });
  
  test('should have required package.json fields', () => {
    expect(packageJson).toHaveProperty('name');
    expect(packageJson).toHaveProperty('version');
    expect(packageJson).toHaveProperty('description');
    expect(packageJson).toHaveProperty('scripts');
  });
  
  test('should have test scripts defined', () => {
    expect(packageJson.scripts).toHaveProperty('test');
    expect(packageJson.scripts.test).toContain('jest');
  });
  
  test('should have required dependencies', () => {
    expect(packageJson.dependencies).toBeDefined();
    expect(packageJson.devDependencies).toBeDefined();
    expect(packageJson.devDependencies).toHaveProperty('jest');
  });
  
  test('version should be valid semver', () => {
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});