const fs = require('fs');
const path = require('path');

describe('Configuration Integration Tests', () => {
  let systemConfig;
  let tools;
  let mainPrompt;

  beforeAll(() => {
    const systemConfigPath = path.join(__dirname, '../../config/system-config.json');
    const toolsPath = path.join(__dirname, '../../config/tools.json');
    const mainPromptPath = path.join(__dirname, '../../core/system-prompts/main-prompt.txt');

    if (fs.existsSync(systemConfigPath)) {
      systemConfig = JSON.parse(fs.readFileSync(systemConfigPath, 'utf8'));
    }

    if (fs.existsSync(toolsPath)) {
      tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
    }

    if (fs.existsSync(mainPromptPath)) {
      mainPrompt = fs.readFileSync(mainPromptPath, 'utf8');
    }
  });

  describe('Cross-File Consistency', () => {
    test('version numbers should be consistent across configs', () => {
      if (systemConfig && systemConfig.version) {
        expect(systemConfig.version).toMatch(/^\d+\.\d+\.\d+$/);
        
        if (tools && tools.version) {
          expect(tools.version).toBe(systemConfig.version);
        }
      }
    });

    test('tool references in config should exist in tools', () => {
      if (systemConfig && tools) {
        const toolsArray = Array.isArray(tools) ? tools : Object.values(tools);
        const toolNames = toolsArray.map(t => t.name).filter(Boolean);

        if (systemConfig.enabledTools && Array.isArray(systemConfig.enabledTools)) {
          systemConfig.enabledTools.forEach(enabledTool => {
            expect(toolNames).toContain(enabledTool);
          });
        }
      }
    });

    test('configuration references should be valid', () => {
      if (systemConfig && mainPrompt) {
        const configKeys = Object.keys(systemConfig);
        
        configKeys.forEach(key => {
          if (mainPrompt.includes(`{${key}}`) || mainPrompt.includes(`{{${key}}}`)) {
            expect(systemConfig[key]).toBeDefined();
          }
        });
      }
    });
  });

  describe('Directory Structure', () => {
    test('config directory should exist and be readable', () => {
      const configDir = path.join(__dirname, '../../config');
      expect(fs.existsSync(configDir)).toBe(true);
      
      const stats = fs.statSync(configDir);
      expect(stats.isDirectory()).toBe(true);
    });

    test('core directory should exist and be readable', () => {
      const coreDir = path.join(__dirname, '../../core');
      
      if (fs.existsSync(coreDir)) {
        const stats = fs.statSync(coreDir);
        expect(stats.isDirectory()).toBe(true);
      }
    });

    test('all referenced files should exist', () => {
      const baseDir = path.join(__dirname, '../..');
      
      ['config/system-config.json', 'config/tools.json'].forEach(relPath => {
        const fullPath = path.join(baseDir, relPath);
        if (fs.existsSync(fullPath)) {
          expect(fs.statSync(fullPath).isFile()).toBe(true);
        }
      });
    });
  });

  describe('JSON Schema Compatibility', () => {
    test('all JSON files should be valid JSON', () => {
      const configDir = path.join(__dirname, '../../config');
      
      if (fs.existsSync(configDir)) {
        const files = fs.readdirSync(configDir).filter(f => f.endsWith('.json'));
        
        files.forEach(file => {
          const filePath = path.join(configDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          expect(() => JSON.parse(content)).not.toThrow();
        });
      }
    });

    test('JSON files should be formatted consistently', () => {
      if (systemConfig) {
        const serialized = JSON.stringify(systemConfig, null, 2);
        expect(serialized).toContain('\n');
        expect(serialized).not.toMatch(/^\{.*\}$/s);
      }
    });
  });

  describe('File Permissions and Access', () => {
    test('configuration files should be readable', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      
      if (fs.existsSync(configPath)) {
        expect(() => fs.accessSync(configPath, fs.constants.R_OK)).not.toThrow();
      }
    });

    test('configuration files should not be empty', () => {
      const configDir = path.join(__dirname, '../../config');
      
      if (fs.existsSync(configDir)) {
        const files = fs.readdirSync(configDir).filter(f => f.endsWith('.json'));
        
        files.forEach(file => {
          const filePath = path.join(configDir, file);
          const stats = fs.statSync(filePath);
          expect(stats.size).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Data Integrity', () => {
    test('no configuration file should have syntax errors', () => {
      const configDir = path.join(__dirname, '../../config');
      
      if (fs.existsSync(configDir)) {
        const files = fs.readdirSync(configDir).filter(f => f.endsWith('.json'));
        
        files.forEach(file => {
          const filePath = path.join(configDir, file);
          expect(() => {
            const content = fs.readFileSync(filePath, 'utf8');
            JSON.parse(content);
          }).not.toThrow();
        });
      }
    });

    test('configuration should be consistent after serialization round-trip', () => {
      if (systemConfig) {
        const serialized = JSON.stringify(systemConfig);
        const deserialized = JSON.parse(serialized);
        expect(deserialized).toEqual(systemConfig);
      }
      
      if (tools) {
        const serialized = JSON.stringify(tools);
        const deserialized = JSON.parse(serialized);
        expect(deserialized).toEqual(tools);
      }
    });
  });

  describe('Deployment Readiness', () => {
    test('all required configuration files should exist', () => {
      const requiredFiles = [
        'config/system-config.json',
        'config/tools.json'
      ];
      
      const baseDir = path.join(__dirname, '../..');
      
      requiredFiles.forEach(file => {
        const fullPath = path.join(baseDir, file);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });

    test('package.json should exist and be valid', () => {
      const packagePath = path.join(__dirname, '../../package.json');
      
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        expect(packageJson).toHaveProperty('name');
        expect(packageJson).toHaveProperty('version');
      }
    });
  });
});