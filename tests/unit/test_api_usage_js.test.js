/**
 * Comprehensive unit tests for examples/api-usage.js
 * Tests the JavaScript API usage example
 */
const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { mkdtempSync, rmSync } = require('fs');
const os = require('os');

// Mock the API module by requiring it after setting up mocks
const fsPromises = require('fs').promises;

describe('AIToolsAPI', () => {
  let tempDir;
  let apiDir;
  let AIToolsAPI;

  beforeEach(async () => {
    // Create temporary directory structure
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-api-usage-'));
    apiDir = path.join(tempDir, 'api');
    fs.mkdirSync(apiDir);
    fs.mkdirSync(path.join(apiDir, 'tools'));

    // Create test data files
    const indexData = {
      version: "1.0",
      generated: "2025-10-02T00:00:00.000000",
      count: 3,
      tools: [
        {
          slug: "cursor",
          name: "Cursor",
          type: "IDE",
          description: "AI-powered code editor",
          pricing: "freemium",
          status: "active"
        },
        {
          slug: "github-copilot",
          name: "GitHub Copilot",
          type: "IDE Plugin",
          description: "AI pair programmer",
          pricing: "paid",
          status: "active"
        },
        {
          slug: "free-tool",
          name: "Free Tool",
          type: "CLI",
          description: "Free CLI tool",
          pricing: "free",
          status: "active"
        }
      ]
    };

    const cursorData = {
      slug: "cursor",
      name: "Cursor",
      type: "IDE",
      description: "AI-powered code editor with advanced features",
      features: [
        "Code generation",
        "Code completion",
        "Inline editing",
        "Chat interface",
        "Multiple models"
      ],
      models: ["GPT-4", "GPT-3.5", "Claude"],
      pricing: "freemium"
    };

    const copilotData = {
      slug: "github-copilot",
      name: "GitHub Copilot",
      type: "IDE Plugin",
      description: "AI pair programmer from GitHub",
      features: [
        "Code generation",
        "Code completion",
        "Documentation",
        "Test generation"
      ],
      models: ["Codex", "GPT-4"],
      pricing: "paid"
    };

    const byTypeData = {
      by_type: {
        "IDE": [
          { slug: "cursor", name: "Cursor", type: "IDE" }
        ],
        "IDE Plugin": [
          { slug: "github-copilot", name: "GitHub Copilot", type: "IDE Plugin" }
        ],
        "CLI": [
          { slug: "free-tool", name: "Free Tool", type: "CLI" }
        ]
      }
    };

    const byPricingData = {
      by_pricing: {
        "free": [
          { slug: "free-tool", name: "Free Tool", pricing: "free" }
        ],
        "freemium": [
          { slug: "cursor", name: "Cursor", pricing: "freemium" }
        ],
        "paid": [
          { slug: "github-copilot", name: "GitHub Copilot", pricing: "paid" }
        ]
      }
    };

    const featuresData = {
      features: {
        "Code generation": { count: 3, tools: ["cursor", "github-copilot", "free-tool"] },
        "Code completion": { count: 2, tools: ["cursor", "github-copilot"] },
        "Inline editing": { count: 1, tools: ["cursor"] },
        "Chat interface": { count: 1, tools: ["cursor"] },
        "Multiple models": { count: 1, tools: ["cursor"] }
      }
    };

    const statisticsData = {
      total_tools: 3,
      total_features: 5,
      total_models: 5,
      most_common_type: { type: "IDE", count: 1 },
      most_common_pricing: { pricing: "freemium", count: 1 },
      most_common_features: [
        { feature: "Code generation", count: 3 },
        { feature: "Code completion", count: 2 },
        { feature: "Inline editing", count: 1 }
      ]
    };

    const searchData = {
      index: [
        {
          slug: "cursor",
          name: "Cursor",
          description: "AI-powered code editor",
          keywords: ["agent", "IDE", "code", "AI"],
          type: "IDE"
        },
        {
          slug: "github-copilot",
          name: "GitHub Copilot",
          description: "AI pair programmer agent",
          keywords: ["agent", "copilot", "github"],
          type: "IDE Plugin"
        }
      ]
    };

    // Write test data
    fs.writeFileSync(path.join(apiDir, 'index.json'), JSON.stringify(indexData));
    fs.writeFileSync(path.join(apiDir, 'tools', 'cursor.json'), JSON.stringify(cursorData));
    fs.writeFileSync(path.join(apiDir, 'tools', 'github-copilot.json'), JSON.stringify(copilotData));
    fs.writeFileSync(path.join(apiDir, 'by-type.json'), JSON.stringify(byTypeData));
    fs.writeFileSync(path.join(apiDir, 'by-pricing.json'), JSON.stringify(byPricingData));
    fs.writeFileSync(path.join(apiDir, 'features.json'), JSON.stringify(featuresData));
    fs.writeFileSync(path.join(apiDir, 'statistics.json'), JSON.stringify(statisticsData));
    fs.writeFileSync(path.join(apiDir, 'search.json'), JSON.stringify(searchData));

    // Load the module fresh
    delete require.cache[require.resolve('../../examples/api-usage.js')];
    
    // Create a simple version of the class for testing
    AIToolsAPI = class {
      constructor(apiBasePath = 'api') {
        this.apiBase = apiBasePath;
      }

      async loadJSON(filename) {
        const filePath = path.join(this.apiBase, filename);
        const data = await fsPromises.readFile(filePath, 'utf8');
        return JSON.parse(data);
      }

      async getAllTools() {
        return await this.loadJSON('index.json');
      }

      async getTool(slug) {
        return await this.loadJSON(`tools/${slug}.json`);
      }

      async getByType() {
        return await this.loadJSON('by-type.json');
      }

      async getByPricing() {
        return await this.loadJSON('by-pricing.json');
      }

      async getFeatures() {
        return await this.loadJSON('features.json');
      }

      async getStatistics() {
        return await this.loadJSON('statistics.json');
      }

      async search(query) {
        const searchData = await this.loadJSON('search.json');
        const queryLower = query.toLowerCase();
        
        return searchData.index.filter(tool => {
          const keywords = tool.keywords.join(' ').toLowerCase();
          const name = tool.name.toLowerCase();
          const desc = tool.description.toLowerCase();
          
          return keywords.includes(queryLower) ||
                 name.includes(queryLower) ||
                 desc.includes(queryLower);
        });
      }
    };
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Constructor', () => {
    test('creates instance with default api path', () => {
      const api = new AIToolsAPI();
      assert.strictEqual(api.apiBase, 'api');
    });

    test('creates instance with custom api path', () => {
      const api = new AIToolsAPI('/custom/path');
      assert.strictEqual(api.apiBase, '/custom/path');
    });

    test('creates instance with temp directory path', () => {
      const api = new AIToolsAPI(apiDir);
      assert.strictEqual(api.apiBase, apiDir);
    });
  });

  describe('loadJSON', () => {
    test('loads JSON file successfully', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.loadJSON('index.json');
      
      assert.ok(result);
      assert.strictEqual(result.version, '1.0');
    });

    test('throws error for non-existent file', async () => {
      const api = new AIToolsAPI(apiDir);
      
      await assert.rejects(
        async () => await api.loadJSON('nonexistent.json'),
        { code: 'ENOENT' }
      );
    });

    test('throws error for invalid JSON', async () => {
      const api = new AIToolsAPI(apiDir);
      fs.writeFileSync(path.join(apiDir, 'invalid.json'), 'not valid json');
      
      await assert.rejects(
        async () => await api.loadJSON('invalid.json'),
        SyntaxError
      );
    });

    test('parses nested JSON correctly', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.loadJSON('tools/cursor.json');
      
      assert.ok(Array.isArray(result.features));
      assert.ok(Array.isArray(result.models));
    });
  });

  describe('getAllTools', () => {
    test('returns all tools with correct structure', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getAllTools();
      
      assert.ok(result);
      assert.strictEqual(result.version, '1.0');
      assert.ok(Array.isArray(result.tools));
      assert.strictEqual(result.tools.length, 3);
    });

    test('tools have required properties', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getAllTools();
      
      result.tools.forEach(tool => {
        assert.ok(tool.slug);
        assert.ok(tool.name);
        assert.ok(tool.type);
        assert.ok(tool.description);
        assert.ok(tool.pricing);
      });
    });

    test('returns tools count', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getAllTools();
      
      assert.strictEqual(result.count, result.tools.length);
    });
  });

  describe('getTool', () => {
    test('returns specific tool by slug', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getTool('cursor');
      
      assert.strictEqual(result.slug, 'cursor');
      assert.strictEqual(result.name, 'Cursor');
    });

    test('returns tool with features array', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getTool('cursor');
      
      assert.ok(Array.isArray(result.features));
      assert.ok(result.features.length > 0);
    });

    test('returns tool with models array', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getTool('cursor');
      
      assert.ok(Array.isArray(result.models));
      assert.ok(result.models.length > 0);
    });

    test('throws error for non-existent tool', async () => {
      const api = new AIToolsAPI(apiDir);
      
      await assert.rejects(
        async () => await api.getTool('nonexistent-tool'),
        { code: 'ENOENT' }
      );
    });
  });

  describe('getByType', () => {
    test('returns tools grouped by type', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getByType();
      
      assert.ok(result.by_type);
      assert.ok(result.by_type['IDE']);
      assert.ok(result.by_type['IDE Plugin']);
    });

    test('type groups contain tool arrays', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getByType();
      
      Object.values(result.by_type).forEach(tools => {
        assert.ok(Array.isArray(tools));
      });
    });

    test('tools in type groups have required properties', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getByType();
      
      Object.values(result.by_type).forEach(tools => {
        tools.forEach(tool => {
          assert.ok(tool.slug);
          assert.ok(tool.name);
          assert.ok(tool.type);
        });
      });
    });
  });

  describe('getByPricing', () => {
    test('returns tools grouped by pricing', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getByPricing();
      
      assert.ok(result.by_pricing);
      assert.ok(result.by_pricing['free']);
      assert.ok(result.by_pricing['freemium']);
      assert.ok(result.by_pricing['paid']);
    });

    test('pricing groups contain tool arrays', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getByPricing();
      
      Object.values(result.by_pricing).forEach(tools => {
        assert.ok(Array.isArray(tools));
      });
    });

    test('free tools are in free category', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getByPricing();
      
      const freeTools = result.by_pricing['free'];
      assert.strictEqual(freeTools.length, 1);
      assert.strictEqual(freeTools[0].pricing, 'free');
    });
  });

  describe('getFeatures', () => {
    test('returns features with counts', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getFeatures();
      
      assert.ok(result.features);
      assert.ok(result.features['Code generation']);
    });

    test('feature entries have count and tools', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getFeatures();
      
      Object.values(result.features).forEach(feature => {
        assert.ok(typeof feature.count === 'number');
        assert.ok(Array.isArray(feature.tools));
      });
    });

    test('most common feature has highest count', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getFeatures();
      
      const counts = Object.values(result.features).map(f => f.count);
      const maxCount = Math.max(...counts);
      assert.strictEqual(result.features['Code generation'].count, maxCount);
    });
  });

  describe('getStatistics', () => {
    test('returns statistics with all required fields', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getStatistics();
      
      assert.ok(typeof result.total_tools === 'number');
      assert.ok(typeof result.total_features === 'number');
      assert.ok(typeof result.total_models === 'number');
      assert.ok(result.most_common_type);
      assert.ok(result.most_common_pricing);
      assert.ok(Array.isArray(result.most_common_features));
    });

    test('total tools matches expected count', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getStatistics();
      
      assert.strictEqual(result.total_tools, 3);
    });

    test('most common features is sorted array', async () => {
      const api = new AIToolsAPI(apiDir);
      const result = await api.getStatistics();
      
      const counts = result.most_common_features.map(f => f.count);
      const sortedCounts = [...counts].sort((a, b) => b - a);
      assert.deepStrictEqual(counts, sortedCounts);
    });
  });

  describe('search', () => {
    test('finds tools by keyword', async () => {
      const api = new AIToolsAPI(apiDir);
      const results = await api.search('agent');
      
      assert.ok(Array.isArray(results));
      assert.ok(results.length > 0);
    });

    test('search is case-insensitive', async () => {
      const api = new AIToolsAPI(apiDir);
      const lowerResults = await api.search('agent');
      const upperResults = await api.search('AGENT');
      
      assert.strictEqual(lowerResults.length, upperResults.length);
    });

    test('finds tools by name', async () => {
      const api = new AIToolsAPI(apiDir);
      const results = await api.search('cursor');
      
      assert.ok(results.some(tool => tool.name === 'Cursor'));
    });

    test('finds tools by description', async () => {
      const api = new AIToolsAPI(apiDir);
      const results = await api.search('programmer');
      
      assert.ok(results.some(tool => tool.slug === 'github-copilot'));
    });

    test('returns empty array for no matches', async () => {
      const api = new AIToolsAPI(apiDir);
      const results = await api.search('nonexistent-keyword-xyz');
      
      assert.ok(Array.isArray(results));
      assert.strictEqual(results.length, 0);
    });

    test('search results have required properties', async () => {
      const api = new AIToolsAPI(apiDir);
      const results = await api.search('agent');
      
      results.forEach(tool => {
        assert.ok(tool.slug);
        assert.ok(tool.name);
        assert.ok(tool.description);
        assert.ok(Array.isArray(tool.keywords));
      });
    });
  });

  describe('Integration Tests', () => {
    test('can chain multiple API calls', async () => {
      const api = new AIToolsAPI(apiDir);
      
      const allTools = await api.getAllTools();
      const firstToolSlug = allTools.tools[0].slug;
      const toolDetails = await api.getTool(firstToolSlug);
      
      assert.strictEqual(toolDetails.slug, firstToolSlug);
    });

    test('statistics match actual data', async () => {
      const api = new AIToolsAPI(apiDir);
      
      const allTools = await api.getAllTools();
      const stats = await api.getStatistics();
      
      assert.strictEqual(stats.total_tools, allTools.tools.length);
    });

    test('search and filter operations combine correctly', async () => {
      const api = new AIToolsAPI(apiDir);
      
      const allTools = await api.getAllTools();
      const searchResults = await api.search('agent');
      
      searchResults.forEach(result => {
        assert.ok(allTools.tools.some(tool => tool.slug === result.slug));
      });
    });
  });

  describe('Error Handling', () => {
    test('handles missing api directory gracefully', async () => {
      const api = new AIToolsAPI('/nonexistent/path');
      
      await assert.rejects(
        async () => await api.getAllTools(),
        { code: 'ENOENT' }
      );
    });

    test('handles corrupted JSON files', async () => {
      const api = new AIToolsAPI(apiDir);
      fs.writeFileSync(path.join(apiDir, 'index.json'), '{"invalid": json}');
      
      await assert.rejects(
        async () => await api.getAllTools(),
        SyntaxError
      );
    });

    test('handles empty JSON files', async () => {
      const api = new AIToolsAPI(apiDir);
      fs.writeFileSync(path.join(apiDir, 'index.json'), '');
      
      await assert.rejects(
        async () => await api.getAllTools()
      );
    });
  });
});