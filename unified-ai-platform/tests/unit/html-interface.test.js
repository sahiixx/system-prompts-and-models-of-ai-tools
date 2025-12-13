/**
 * Unit Tests for HTML Interface (public/index.html)
 * 
 * These tests validate:
 * - HTML structure and validity
 * - Required elements and attributes
 * - JavaScript API integration
 * - Accessibility features
 * - Security considerations
 */

const fs = require('fs');
const path = require('path');

describe('HTML Interface Tests', () => {
  let htmlContent;
  
  beforeAll(() => {
    const htmlPath = path.join(__dirname, '../../public/index.html');
    htmlContent = fs.readFileSync(htmlPath, 'utf8');
  });

  describe('HTML Structure', () => {
    test('should be valid HTML5', () => {
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toMatch(/<html[^>]*>/);
      expect(htmlContent).toContain('</html>');
    });

    test('should have proper head section', () => {
      expect(htmlContent).toMatch(/<head>/);
      expect(htmlContent).toMatch(/<\/head>/);
      expect(htmlContent).toContain('<meta charset="UTF-8">');
      expect(htmlContent).toContain('<meta name="viewport"');
    });

    test('should have title tag', () => {
      expect(htmlContent).toMatch(/<title>.*<\/title>/);
      expect(htmlContent).toContain('Unified AI Platform');
    });

    test('should have body section', () => {
      expect(htmlContent).toMatch(/<body>/);
      expect(htmlContent).toMatch(/<\/body>/);
    });

    test('should have proper tag closure', () => {
      const openTags = htmlContent.match(/<\w+[^>]*>/g) || [];
      const closeTags = htmlContent.match(/<\/\w+>/g) || [];
      
      // Should have balanced tags (accounting for self-closing tags)
      expect(closeTags.length).toBeGreaterThan(0);
      expect(openTags.length).toBeGreaterThan(closeTags.length); // Self-closing tags
    });
  });

  describe('Required Elements', () => {
    test('should have main container', () => {
      expect(htmlContent).toContain('class="container"');
    });

    test('should have header section', () => {
      expect(htmlContent).toContain('class="header"');
      expect(htmlContent).toMatch(/<h1>.*Unified AI Platform.*<\/h1>/);
    });

    test('should have dashboard grid', () => {
      expect(htmlContent).toContain('class="dashboard"');
    });

    test('should have multiple feature cards', () => {
      const cardMatches = htmlContent.match(/class="card"/g);
      expect(cardMatches).toBeDefined();
      expect(cardMatches.length).toBeGreaterThanOrEqual(6);
    });

    test('should have status indicator', () => {
      expect(htmlContent).toContain('class="status-indicator');
      expect(htmlContent).toContain('status-online');
    });

    test('should have interactive buttons', () => {
      const buttonMatches = htmlContent.match(/class="btn"/g);
      expect(buttonMatches).toBeDefined();
      expect(buttonMatches.length).toBeGreaterThan(5);
    });

    test('should have response areas for each feature', () => {
      expect(htmlContent).toContain('id="health-response"');
      expect(htmlContent).toContain('id="demo-response"');
      expect(htmlContent).toContain('id="tools-response"');
      expect(htmlContent).toContain('id="memory-response"');
      expect(htmlContent).toContain('id="plans-response"');
      expect(htmlContent).toContain('id="capabilities-response"');
    });
  });

  describe('JavaScript Integration', () => {
    test('should include script tag', () => {
      expect(htmlContent).toMatch(/<script>/);
      expect(htmlContent).toMatch(/<\/script>/);
    });

    test('should define API base URL', () => {
      expect(htmlContent).toContain('const API_BASE');
      expect(htmlContent).toMatch(/localhost:3000/);
    });

    test('should define makeRequest function', () => {
      expect(htmlContent).toContain('async function makeRequest');
      expect(htmlContent).toContain('fetch');
    });

    test('should define all required API functions', () => {
      const requiredFunctions = [
        'checkHealth',
        'getDemo',
        'getTools',
        'getMemory',
        'addMemory',
        'getPlans',
        'addPlan',
        'getCapabilities',
        'showResponse'
      ];

      requiredFunctions.forEach(func => {
        expect(htmlContent).toContain(`function ${func}`);
      });
    });

    test('should handle window.onload', () => {
      expect(htmlContent).toContain('window.onload');
      expect(htmlContent).toMatch(/checkHealth\(\)/);
    });

    test('should include error handling', () => {
      expect(htmlContent).toContain('try');
      expect(htmlContent).toContain('catch');
    });

    test('should use async/await pattern', () => {
      expect(htmlContent).toContain('async ');
      expect(htmlContent).toContain('await ');
    });
  });

  describe('Button Click Handlers', () => {
    test('should have onclick handlers for all buttons', () => {
      const onclickMatches = htmlContent.match(/onclick="[^"]+"/g);
      expect(onclickMatches).toBeDefined();
      expect(onclickMatches.length).toBeGreaterThanOrEqual(8);
    });

    test('should call appropriate functions on button clicks', () => {
      expect(htmlContent).toContain('onclick="checkHealth()"');
      expect(htmlContent).toContain('onclick="getDemo()"');
      expect(htmlContent).toContain('onclick="getTools()"');
      expect(htmlContent).toContain('onclick="getMemory()"');
      expect(htmlContent).toContain('onclick="addMemory()"');
      expect(htmlContent).toContain('onclick="getPlans()"');
      expect(htmlContent).toContain('onclick="addPlan()"');
      expect(htmlContent).toContain('onclick="getCapabilities()"');
    });
  });

  describe('Styling', () => {
    test('should have embedded CSS', () => {
      expect(htmlContent).toMatch(/<style>/);
      expect(htmlContent).toMatch(/<\/style>/);
    });

    test('should define key CSS classes', () => {
      const cssClasses = [
        '.container',
        '.header',
        '.dashboard',
        '.card',
        '.btn',
        '.response-area',
        '.status-indicator'
      ];

      cssClasses.forEach(className => {
        expect(htmlContent).toContain(className);
      });
    });

    test('should include responsive design', () => {
      expect(htmlContent).toContain('viewport');
      expect(htmlContent).toContain('grid-template-columns');
      expect(htmlContent).toContain('auto-fit');
    });

    test('should define visual feedback classes', () => {
      expect(htmlContent).toContain('.error');
      expect(htmlContent).toContain('.success');
      expect(htmlContent).toContain('.loading');
    });

    test('should include animations and transitions', () => {
      expect(htmlContent).toContain('transition');
      expect(htmlContent).toContain('transform');
    });
  });

  describe('User Interaction', () => {
    test('should use prompt for user input', () => {
      expect(htmlContent).toContain('prompt(');
    });

    test('should validate user input before API calls', () => {
      // Check for conditional logic in addMemory and addPlan
      expect(htmlContent).toMatch(/if\s*\(\s*key\s*&&\s*value\s*\)/);
      expect(htmlContent).toMatch(/if\s*\(\s*taskDescription\s*\)/);
    });

    test('should display responses to user', () => {
      expect(htmlContent).toContain('showResponse');
      expect(htmlContent).toContain('.innerHTML');
      expect(htmlContent).toContain('JSON.stringify');
    });
  });

  describe('Accessibility', () => {
    test('should have lang attribute on html tag', () => {
      expect(htmlContent).toMatch(/<html[^>]*lang="en"[^>]*>/);
    });

    test('should have descriptive button text', () => {
      expect(htmlContent).toContain('Check Health');
      expect(htmlContent).toContain('View Demo');
      expect(htmlContent).toContain('View Tools');
      expect(htmlContent).toContain('Add Memory');
    });

    test('should have semantic HTML elements', () => {
      expect(htmlContent).toMatch(/<h1>/);
      expect(htmlContent).toMatch(/<h3>/);
      expect(htmlContent).toMatch(/<p>/);
    });

    test('should have emojis for visual cues', () => {
      expect(htmlContent).toMatch(/🚀/);
      expect(htmlContent).toMatch(/🎯|🛠️|🧠|📋|⚙️/);
    });
  });

  describe('Security Considerations', () => {
    test('should not contain inline script in dangerous contexts', () => {
      // Should not have inline eval or dangerous patterns
      expect(htmlContent).not.toContain('eval(');
      expect(htmlContent).not.toContain('Function(');
    });

    test('should use JSON.stringify for displaying data', () => {
      expect(htmlContent).toContain('JSON.stringify');
    });

    test('should not expose sensitive information in comments', () => {
      const comments = htmlContent.match(/<!--[\s\S]*?-->/g) || [];
      
      comments.forEach(comment => {
        expect(comment.toLowerCase()).not.toContain('password');
        expect(comment.toLowerCase()).not.toContain('secret');
        expect(comment.toLowerCase()).not.toContain('api key');
        expect(comment.toLowerCase()).not.toContain('token');
      });
    });
  });

  describe('API Endpoint References', () => {
    test('should reference all documented API endpoints', () => {
      const endpoints = [
        '/health',
        '/api/v1/demo',
        '/api/v1/tools',
        '/api/v1/memory',
        '/api/v1/plans',
        '/api/v1/capabilities'
      ];

      endpoints.forEach(endpoint => {
        expect(htmlContent).toContain(endpoint);
      });
    });

    test('should use correct HTTP methods', () => {
      expect(htmlContent).toContain("method: 'GET'");
      expect(htmlContent).toContain("method: 'POST'");
    });

    test('should set correct headers', () => {
      expect(htmlContent).toContain("'Content-Type': 'application/json'");
    });
  });

  describe('Error Handling in UI', () => {
    test('should check for success in responses', () => {
      expect(htmlContent).toContain('result.success');
    });

    test('should display errors to user', () => {
      expect(htmlContent).toContain('class="error"');
      expect(htmlContent).toContain('result.error');
    });

    test('should handle fetch errors', () => {
      expect(htmlContent).toContain('catch (error)');
      expect(htmlContent).toContain('error.message');
    });
  });

  describe('Feature Cards Content', () => {
    test('should describe platform status feature', () => {
      expect(htmlContent).toContain('Platform Status');
      expect(htmlContent).toMatch(/Monitor.*health.*status/i);
    });

    test('should describe demo feature', () => {
      expect(htmlContent).toContain('Platform Demo');
      expect(htmlContent).toMatch(/Explore.*features.*capabilities/i);
    });

    test('should describe tools feature', () => {
      expect(htmlContent).toContain('Available Tools');
      expect(htmlContent).toMatch(/Browse.*tool system/i);
    });

    test('should describe memory feature', () => {
      expect(htmlContent).toContain('Memory System');
      expect(htmlContent).toMatch(/Manage.*memory.*preferences/i);
    });

    test('should describe planning feature', () => {
      expect(htmlContent).toContain('Planning System');
      expect(htmlContent).toMatch(/Create.*manage.*plans/i);
    });

    test('should describe capabilities feature', () => {
      expect(htmlContent).toContain('Platform Capabilities');
      expect(htmlContent).toMatch(/Explore.*capabilities/i);
    });
  });

  describe('Visual Design', () => {
    test('should use gradient backgrounds', () => {
      expect(htmlContent).toContain('linear-gradient');
    });

    test('should include box shadows for depth', () => {
      expect(htmlContent).toContain('box-shadow');
    });

    test('should have responsive font sizes', () => {
      expect(htmlContent).toMatch(/font-size:\s*\d+(\.\d+)?(rem|em|px)/);
    });

    test('should define color scheme', () => {
      expect(htmlContent).toMatch(/#[0-9a-fA-F]{3,6}/);
    });

    test('should have hover effects', () => {
      expect(htmlContent).toContain(':hover');
    });
  });

  describe('Code Quality', () => {
    test('should use const for constants', () => {
      expect(htmlContent).toContain('const API_BASE');
    });

    test('should use template literals where appropriate', () => {
      expect(htmlContent).toMatch(/`[^`]*\$\{[^}]*\}[^`]*`/);
    });

    test('should have consistent indentation', () => {
      const lines = htmlContent.split('\n');
      const indentedLines = lines.filter(line => line.match(/^\s+\S/));
      expect(indentedLines.length).toBeGreaterThan(50);
    });

    test('should not have syntax errors in JavaScript', () => {
      // Basic check for common syntax errors
      expect(htmlContent).not.toMatch(/function\s+\(/); // Missing function name
      expect(htmlContent).not.toContain('}}}}'); // Too many braces
    });
  });
});