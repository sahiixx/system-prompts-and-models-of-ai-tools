const fs = require('fs');
const path = require('path');

describe('system-config.json', () => {
  let config;
  
  beforeAll(() => {
    const configPath = path.join(__dirname, '../../config/system-config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configData);
  });

  describe('Structure Validation', () => {
    test('should have required top-level properties', () => {
      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('description');
    });

    test('should have valid version format', () => {
      expect(config.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('should have non-empty name and description', () => {
      expect(config.name).toBeTruthy();
      expect(typeof config.name).toBe('string');
      expect(config.name.length).toBeGreaterThan(0);
      
      expect(config.description).toBeTruthy();
      expect(typeof config.description).toBe('string');
      expect(config.description.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Properties', () => {
    test('should have valid configuration structure', () => {
      if (config.settings) {
        expect(typeof config.settings).toBe('object');
      }
      
      if (config.features) {
        expect(typeof config.features).toBe('object');
      }
    });

    test('should not contain sensitive data patterns', () => {
      const configStr = JSON.stringify(config);
      
      expect(configStr).not.toMatch(/password/i);
      expect(configStr).not.toMatch(/api[_-]?key/i);
      expect(configStr).not.toMatch(/secret/i);
      expect(configStr).not.toMatch(/token/i);
      expect(configStr).not.toMatch(/credential/i);
    });

    test('should have consistent data types for all values', () => {
      const validateObject = (obj, path = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (value === null) {
            return;
          }
          
          if (typeof value === 'object' && !Array.isArray(value)) {
            validateObject(value, currentPath);
          } else {
            expect(['string', 'number', 'boolean', 'object']).toContain(typeof value);
          }
        });
      };
      
      validateObject(config);
    });
  });

  describe('Array Validations', () => {
    test('should have valid array structures if present', () => {
      const checkArrays = (obj) => {
        Object.values(obj).forEach(value => {
          if (Array.isArray(value)) {
            expect(Array.isArray(value)).toBe(true);
            
            if (value.length > 0) {
              const firstType = typeof value[0];
              value.forEach(item => {
                expect(typeof item).toBe(firstType);
              });
            }
          } else if (typeof value === 'object' && value !== null) {
            checkArrays(value);
          }
        });
      };
      
      checkArrays(config);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty optional fields gracefully', () => {
      expect(() => {
        Object.keys(config).forEach(key => {
          if (config[key] === '' || config[key] === null) {
            expect(['', null]).toContain(config[key]);
          }
        });
      }).not.toThrow();
    });

    test('should not have circular references', () => {
      expect(() => JSON.stringify(config)).not.toThrow();
    });

    test('should be serializable and deserializable', () => {
      const serialized = JSON.stringify(config);
      const deserialized = JSON.parse(serialized);
      expect(deserialized).toEqual(config);
    });
  });
});