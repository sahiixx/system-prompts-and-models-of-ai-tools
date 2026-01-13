/**
 * Test Utilities and Helper Function Tests
 * 
 * These tests verify utility functions and test infrastructure:
 * - Test helpers
 * - Mock validation
 * - Configuration loading
 * - Test data generation
 */

const fs = require('fs');
const path = require('path');

describe('Test Utilities and Infrastructure', () => {
  describe('Configuration Files', () => {
    test('should have valid system-config.json', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      expect(fs.existsSync(configPath)).toBe(true);
      
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(config.platform).toBeDefined();
      expect(config.core_capabilities).toBeDefined();
    });

    test('should have valid tools.json', () => {
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      expect(fs.existsSync(toolsPath)).toBe(true);
      
      const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
      expect(Array.isArray(tools)).toBe(true);
    });

    test('should have consistent configuration structure', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Required top-level keys
      expect(config).toHaveProperty('platform');
      expect(config).toHaveProperty('core_capabilities');
      expect(config).toHaveProperty('operating_modes');
      expect(config).toHaveProperty('performance');
    });
  });

  describe('Source Files', () => {
    test('should have main index.js file', () => {
      const indexPath = path.join(__dirname, '../../src/index.js');
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    test('should have simple-server.js file', () => {
      const serverPath = path.join(__dirname, '../../src/simple-server.js');
      expect(fs.existsSync(serverPath)).toBe(true);
    });

    test('should export required classes', () => {
      const { UnifiedAIPlatform } = require('../../src/index');
      const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');

      expect(UnifiedAIPlatform).toBeDefined();
      expect(SimpleUnifiedAIPlatform).toBeDefined();
      expect(typeof UnifiedAIPlatform).toBe('function');
      expect(typeof SimpleUnifiedAIPlatform).toBe('function');
    });
  });

  describe('Test Coverage', () => {
    test('should have test files for all source files', () => {
      const sourceFiles = ['index.js', 'simple-server.js'];
      const testDir = path.join(__dirname);

      for (const sourceFile of sourceFiles) {
        const baseName = sourceFile.replace('.js', '');
        const testPattern = new RegExp(`${baseName}.*\\.test\\.js`);
        
        const testFiles = fs.readdirSync(testDir)
          .filter(file => testPattern.test(file));
        
        expect(testFiles.length).toBeGreaterThan(0);
      }
    });

    test('should have configuration tests', () => {
      const testDir = path.join(__dirname);
      const configTests = fs.readdirSync(testDir)
        .filter(file => file.includes('config') && file.endsWith('.test.js'));
      
      expect(configTests.length).toBeGreaterThan(0);
    });

    test('should have integration tests', () => {
      const testDir = path.join(__dirname);
      const integrationTests = fs.readdirSync(testDir)
        .filter(file => file.includes('integration') && file.endsWith('.test.js'));
      
      expect(integrationTests.length).toBeGreaterThan(0);
    });

    test('should have security tests', () => {
      const testDir = path.join(__dirname);
      const securityTests = fs.readdirSync(testDir)
        .filter(file => file.includes('security') && file.endsWith('.test.js'));
      
      expect(securityTests.length).toBeGreaterThan(0);
    });

    test('should have performance tests', () => {
      const testDir = path.join(__dirname);
      const performanceTests = fs.readdirSync(testDir)
        .filter(file => file.includes('performance') && file.endsWith('.test.js'));
      
      expect(performanceTests.length).toBeGreaterThan(0);
    });
  });

  describe('Package Configuration', () => {
    test('should have valid package.json', () => {
      const packagePath = path.join(__dirname, '../../package.json');
      expect(fs.existsSync(packagePath)).toBe(true);
      
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      expect(pkg.name).toBeDefined();
      expect(pkg.version).toBeDefined();
      expect(pkg.scripts).toBeDefined();
      expect(pkg.scripts.test).toBeDefined();
    });

    test('should have Jest configuration', () => {
      const jestConfigPath = path.join(__dirname, '../../jest.config.js');
      expect(fs.existsSync(jestConfigPath)).toBe(true);
    });

    test('should have required dependencies', () => {
      const packagePath = path.join(__dirname, '../../package.json');
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      // Check for key dependencies
      expect(pkg.dependencies).toHaveProperty('express');
      expect(pkg.dependencies).toHaveProperty('cors');
      expect(pkg.devDependencies).toHaveProperty('jest');
      expect(pkg.devDependencies).toHaveProperty('supertest');
    });
  });

  describe('Project Structure', () => {
    test('should have required directories', () => {
      const requiredDirs = [
        'src',
        'config',
        'tests',
        'tests/unit',
        'public'
      ];

      for (const dir of requiredDirs) {
        const dirPath = path.join(__dirname, '../..', dir);
        expect(fs.existsSync(dirPath)).toBe(true);
      }
    });

    test('should have documentation files', () => {
      const docsFiles = ['README.md', 'TESTING.md'];
      
      for (const file of docsFiles) {
        const filePath = path.join(__dirname, '../..', file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          expect(content.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Test Data Helpers', () => {
    test('should generate valid memory test data', () => {
      const generateMemoryData = (count) => {
        return Array.from({ length: count }, (_, i) => ({
          key: `test_key_${i}`,
          value: `test_value_${i}`
        }));
      };

      const testData = generateMemoryData(5);
      expect(testData).toHaveLength(5);
      expect(testData[0]).toHaveProperty('key');
      expect(testData[0]).toHaveProperty('value');
    });

    test('should generate valid plan test data', () => {
      const generatePlanData = (count) => {
        return Array.from({ length: count }, (_, i) => ({
          task_description: `Test task ${i}`,
          steps: [`Step 1`, `Step 2`, `Step 3`]
        }));
      };

      const testData = generatePlanData(3);
      expect(testData).toHaveLength(3);
      expect(testData[0]).toHaveProperty('task_description');
      expect(testData[0]).toHaveProperty('steps');
      expect(Array.isArray(testData[0].steps)).toBe(true);
    });
  });

  describe('Mock Validation', () => {
    test('should properly mock configuration files', () => {
      jest.resetModules();
      
      jest.mock('../../config/system-config.json', () => ({
        platform: { name: 'Test', version: '1.0.0' },
        core_capabilities: { test: true }
      }));

      const config = require('../../config/system-config.json');
      expect(config.platform.name).toBe('Test');
    });
  });

  describe('Environment Variables', () => {
    test('should handle missing PORT variable', () => {
      const originalPort = process.env.PORT;
      delete process.env.PORT;

      const { UnifiedAIPlatform } = require('../../src/index');
      const platform = new UnifiedAIPlatform();
      
      expect(platform.port).toBe(3000); // default
      
      process.env.PORT = originalPort;
    });

    test('should respect custom PORT variable', () => {
      const originalPort = process.env.PORT;
      process.env.PORT = '8080';

      jest.resetModules();
      const { UnifiedAIPlatform } = require('../../src/index');
      const platform = new UnifiedAIPlatform();
      
      expect(platform.port).toBe('8080');
      
      process.env.PORT = originalPort;
    });
  });
});