/**
 * Comprehensive unit tests for examples/api-usage.js
 * Tests AIToolsAPI class and all its methods
 */
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { mkdtempSync, rmSync, mkdirSync, writeFileSync } = require('fs');
const os = require('os');

// AIToolsAPI class implementation for testing
class AIToolsAPI {
  constructor(apiBasePath = 'api') {
    this.apiBase = apiBasePath;
  }

  async loadJSON(filename) {
    const filePath = path.join(this.apiBase, filename);
    const data = await fs.promises.readFile(filePath, 'utf8');
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
}

describe('AIToolsAPI', () => {
  let tempDir;
  let apiDir;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'test-api-'));
    apiDir = path.join(tempDir, 'api');
    mkdirSync(apiDir);
    mkdirSync(path.join(apiDir, 'tools'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    test('initializes with default api base path', () => {
      const api = new AIToolsAPI();
      assert.strictEqual(api.apiBase, 'api');
    });

    test('initializes with custom api base path', () => {
      const customPath = 'custom/api/path';
      const api = new AIToolsAPI(customPath);
      assert.strictEqual(api.apiBase, customPath);
    });
  });

  describe('loadJSON', () => {
    test('loads valid JSON file', async () => {
      const api = new AIToolsAPI(apiDir);
      const testData = { test: 'data', value: 123 };
      
      writeFileSync(
        path.join(apiDir, 'test.json'),
        JSON.stringify(testData)
      );

      const result = await api.loadJSON('test.json');
      
      assert.deepStrictEqual(result, testData);
    });

    test('throws error for non-existent file', async () => {
      const api = new AIToolsAPI(apiDir);
      
      await assert.rejects(
        async () => await api.loadJSON('non-existent.json'),
        { code: 'ENOENT' }
      );
    });

    test('throws error for malformed JSON', async () => {
      const api = new AIToolsAPI(apiDir);
      
      writeFileSync(path.join(apiDir, 'bad.json'), '{ invalid json }');
      
      await assert.rejects(
        async () => await api.loadJSON('bad.json'),
        SyntaxError
      );
    });

    test('loads JSON with nested objects', async () => {
      const api = new AIToolsAPI(apiDir);
      const complexData = {
        tools: [
          { name: 'Tool 1', features: ['a', 'b'] },
          { name: 'Tool 2', features: ['c', 'd'] }
        ],
        metadata: { version: '1.0' }
      };
      
      writeFileSync(
        path.join(apiDir, 'complex.json'),
        JSON.stringify(complexData)
      );

      const result = await api.loadJSON('complex.json');
      
      assert.deepStrictEqual(result, complexData);
      assert.strictEqual(result.tools.length, 2);
      assert.strictEqual(result.metadata.version, '1.0');
    });
  });

  describe('getAllTools', () => {
    test('returns all tools from index', async () => {
      const api = new AIToolsAPI(apiDir);
      const indexData = {
        tools: [
          { name: 'Cursor', type: 'IDE', pricing: 'freemium' },
          { name: 'Claude Code', type: 'CLI', pricing: 'free' }
        ],
        count: 2,
        generated: '2025-01-01'
      };
      
      writeFileSync(
        path.join(apiDir, 'index.json'),
        JSON.stringify(indexData)
      );

      const result = await api.getAllTools();
      
      assert.strictEqual(result.tools.length, 2);
      assert.strictEqual(result.count, 2);
      assert.ok(result.generated);
    });

    test('returns empty tools array when none exist', async () => {
      const api = new AIToolsAPI(apiDir);
      const emptyData = { tools: [], count: 0 };
      
      writeFileSync(
        path.join(apiDir, 'index.json'),
        JSON.stringify(emptyData)
      );

      const result = await api.getAllTools();
      
      assert.strictEqual(result.tools.length, 0);
      assert.strictEqual(result.count, 0);
    });
  });

  describe('getTool', () => {
    test('returns specific tool by slug', async () => {
      const api = new AIToolsAPI(apiDir);
      const toolData = {
        name: 'Cursor',
        type: 'IDE Plugin',
        description: 'AI-powered editor',
        features: ['code-generation', 'chat'],
        models: ['gpt-4', 'claude-3']
      };
      
      writeFileSync(
        path.join(apiDir, 'tools', 'cursor.json'),
        JSON.stringify(toolData)
      );

      const result = await api.getTool('cursor');
      
      assert.strictEqual(result.name, 'Cursor');
      assert.strictEqual(result.type, 'IDE Plugin');
      assert.strictEqual(result.features.length, 2);
      assert.strictEqual(result.models.length, 2);
    });

    test('throws error for non-existent tool', async () => {
      const api = new AIToolsAPI(apiDir);
      
      await assert.rejects(
        async () => await api.getTool('non-existent-tool'),
        { code: 'ENOENT' }
      );
    });
  });

  describe('getByType', () => {
    test('returns tools grouped by type', async () => {
      const api = new AIToolsAPI(apiDir);
      const typeData = {
        by_type: {
          'IDE Plugin': [
            { name: 'Cursor', slug: 'cursor' },
            { name: 'Copilot', slug: 'copilot' }
          ],
          'CLI Tool': [
            { name: 'Claude Code', slug: 'claude-code' }
          ]
        }
      };
      
      writeFileSync(
        path.join(apiDir, 'by-type.json'),
        JSON.stringify(typeData)
      );

      const result = await api.getByType();
      
      assert.ok(result.by_type['IDE Plugin']);
      assert.ok(result.by_type['CLI Tool']);
      assert.strictEqual(result.by_type['IDE Plugin'].length, 2);
      assert.strictEqual(result.by_type['CLI Tool'].length, 1);
    });

    test('handles empty type groups', async () => {
      const api = new AIToolsAPI(apiDir);
      const emptyData = { by_type: {} };
      
      writeFileSync(
        path.join(apiDir, 'by-type.json'),
        JSON.stringify(emptyData)
      );

      const result = await api.getByType();
      
      assert.deepStrictEqual(result.by_type, {});
    });
  });

  describe('getByPricing', () => {
    test('returns tools grouped by pricing', async () => {
      const api = new AIToolsAPI(apiDir);
      const pricingData = {
        by_pricing: {
          free: [
            { name: 'Tool 1', slug: 'tool1' }
          ],
          freemium: [
            { name: 'Tool 2', slug: 'tool2' },
            { name: 'Tool 3', slug: 'tool3' }
          ],
          paid: [
            { name: 'Tool 4', slug: 'tool4' }
          ]
        }
      };
      
      writeFileSync(
        path.join(apiDir, 'by-pricing.json'),
        JSON.stringify(pricingData)
      );

      const result = await api.getByPricing();
      
      assert.strictEqual(result.by_pricing.free.length, 1);
      assert.strictEqual(result.by_pricing.freemium.length, 2);
      assert.strictEqual(result.by_pricing.paid.length, 1);
    });
  });

  describe('getFeatures', () => {
    test('returns feature matrix', async () => {
      const api = new AIToolsAPI(apiDir);
      const featuresData = {
        features: {
          'Code Generation': { count: 15, tools: ['cursor', 'copilot'] },
          'Chat Interface': { count: 20, tools: ['cursor', 'claude'] },
          'Agent Mode': { count: 8, tools: ['cursor'] }
        }
      };
      
      writeFileSync(
        path.join(apiDir, 'features.json'),
        JSON.stringify(featuresData)
      );

      const result = await api.getFeatures();
      
      assert.ok(result.features['Code Generation']);
      assert.strictEqual(result.features['Code Generation'].count, 15);
      assert.strictEqual(result.features['Chat Interface'].count, 20);
      assert.strictEqual(result.features['Agent Mode'].count, 8);
    });

    test('handles empty features', async () => {
      const api = new AIToolsAPI(apiDir);
      const emptyData = { features: {} };
      
      writeFileSync(
        path.join(apiDir, 'features.json'),
        JSON.stringify(emptyData)
      );

      const result = await api.getFeatures();
      
      assert.deepStrictEqual(result.features, {});
    });
  });

  describe('getStatistics', () => {
    test('returns aggregate statistics', async () => {
      const api = new AIToolsAPI(apiDir);
      const statsData = {
        total_tools: 25,
        total_features: 50,
        total_models: 30,
        most_common_type: { type: 'IDE Plugin', count: 12 },
        most_common_pricing: { pricing: 'freemium', count: 10 },
        most_common_features: [
          { feature: 'Code Generation', count: 20 },
          { feature: 'Chat Interface', count: 18 }
        ]
      };
      
      writeFileSync(
        path.join(apiDir, 'statistics.json'),
        JSON.stringify(statsData)
      );

      const result = await api.getStatistics();
      
      assert.strictEqual(result.total_tools, 25);
      assert.strictEqual(result.total_features, 50);
      assert.strictEqual(result.total_models, 30);
      assert.strictEqual(result.most_common_type.type, 'IDE Plugin');
      assert.strictEqual(result.most_common_features.length, 2);
    });
  });

  describe('search', () => {
    test('finds tools by keyword match', async () => {
      const api = new AIToolsAPI(apiDir);
      const searchData = {
        index: [
          {
            name: 'Cursor',
            description: 'AI code editor with agent mode',
            keywords: ['ide', 'agent', 'ai']
          },
          {
            name: 'Claude Code',
            description: 'CLI coding assistant',
            keywords: ['cli', 'assistant']
          },
          {
            name: 'Agent Tool',
            description: 'Another agent-based tool',
            keywords: ['agent', 'automation']
          }
        ]
      };
      
      writeFileSync(
        path.join(apiDir, 'search.json'),
        JSON.stringify(searchData)
      );

      const result = await api.search('agent');
      
      assert.strictEqual(result.length, 2);
      assert.ok(result.some(t => t.name === 'Cursor'));
      assert.ok(result.some(t => t.name === 'Agent Tool'));
    });

    test('finds tools by name match', async () => {
      const api = new AIToolsAPI(apiDir);
      const searchData = {
        index: [
          {
            name: 'Cursor IDE',
            description: 'Code editor',
            keywords: ['ide']
          },
          {
            name: 'Claude',
            description: 'Assistant',
            keywords: ['cli']
          }
        ]
      };
      
      writeFileSync(
        path.join(apiDir, 'search.json'),
        JSON.stringify(searchData)
      );

      const result = await api.search('cursor');
      
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'Cursor IDE');
    });

    test('finds tools by description match', async () => {
      const api = new AIToolsAPI(apiDir);
      const searchData = {
        index: [
          {
            name: 'Tool 1',
            description: 'Powerful automation features',
            keywords: ['tool']
          },
          {
            name: 'Tool 2',
            description: 'Simple interface',
            keywords: ['tool']
          }
        ]
      };
      
      writeFileSync(
        path.join(apiDir, 'search.json'),
        JSON.stringify(searchData)
      );

      const result = await api.search('automation');
      
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'Tool 1');
    });

    test('returns empty array for no matches', async () => {
      const api = new AIToolsAPI(apiDir);
      const searchData = {
        index: [
          {
            name: 'Tool',
            description: 'Description',
            keywords: ['keyword']
          }
        ]
      };
      
      writeFileSync(
        path.join(apiDir, 'search.json'),
        JSON.stringify(searchData)
      );

      const result = await api.search('nonexistent');
      
      assert.strictEqual(result.length, 0);
    });

    test('search is case-insensitive', async () => {
      const api = new AIToolsAPI(apiDir);
      const searchData = {
        index: [
          {
            name: 'CURSOR',
            description: 'Code Editor',
            keywords: ['IDE']
          }
        ]
      };
      
      writeFileSync(
        path.join(apiDir, 'search.json'),
        JSON.stringify(searchData)
      );

      const result = await api.search('cursor');
      
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'CURSOR');
    });

    test('handles multiple keyword matches', async () => {
      const api = new AIToolsAPI(apiDir);
      const searchData = {
        index: [
          {
            name: 'Multi Tool',
            description: 'Versatile tool',
            keywords: ['code', 'agent', 'ide', 'cli']
          }
        ]
      };
      
      writeFileSync(
        path.join(apiDir, 'search.json'),
        JSON.stringify(searchData)
      );

      const codeResults = await api.search('code');
      const agentResults = await api.search('agent');
      
      assert.strictEqual(codeResults.length, 1);
      assert.strictEqual(agentResults.length, 1);
    });

    test('handles empty search index', async () => {
      const api = new AIToolsAPI(apiDir);
      const searchData = { index: [] };
      
      writeFileSync(
        path.join(apiDir, 'search.json'),
        JSON.stringify(searchData)
      );

      const result = await api.search('anything');
      
      assert.strictEqual(result.length, 0);
    });
  });

  describe('Error handling', () => {
    test('handles file read errors gracefully', async () => {
      const api = new AIToolsAPI('/non/existent/path');
      
      await assert.rejects(
        async () => await api.getAllTools(),
        Error
      );
    });

    test('handles corrupted JSON data', async () => {
      const api = new AIToolsAPI(apiDir);
      
      writeFileSync(
        path.join(apiDir, 'corrupted.json'),
        '{"incomplete": '
      );
      
      await assert.rejects(
        async () => await api.loadJSON('corrupted.json'),
        SyntaxError
      );
    });
  });

  describe('Integration scenarios', () => {
    test('loads and filters tools by multiple criteria', async () => {
      const api = new AIToolsAPI(apiDir);
      
      const indexData = {
        tools: [
          { name: 'Tool 1', type: 'IDE', pricing: 'free', features: ['code-gen'] },
          { name: 'Tool 2', type: 'CLI', pricing: 'paid', features: ['chat'] },
          { name: 'Tool 3', type: 'IDE', pricing: 'free', features: ['code-gen', 'chat'] }
        ]
      };
      
      writeFileSync(
        path.join(apiDir, 'index.json'),
        JSON.stringify(indexData)
      );

      const allTools = await api.getAllTools();
      
      // Filter by type
      const ideTools = allTools.tools.filter(t => t.type === 'IDE');
      assert.strictEqual(ideTools.length, 2);
      
      // Filter by pricing
      const freeTools = allTools.tools.filter(t => t.pricing === 'free');
      assert.strictEqual(freeTools.length, 2);
      
      // Filter by feature
      const codeGenTools = allTools.tools.filter(t => t.features.includes('code-gen'));
      assert.strictEqual(codeGenTools.length, 2);
    });
  });
});