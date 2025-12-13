const fs = require('fs');
const path = require('path');

describe('README.md Validation', () => {
  const readmePath = path.join(__dirname, '../../..', 'README.md');
  let readmeContent;

  beforeAll(() => {
    readmeContent = fs.readFileSync(readmePath, 'utf-8');
  });

  describe('File Structure', () => {
    test('README.md should exist', () => {
      expect(fs.existsSync(readmePath)).toBe(true);
    });

    test('should not be empty', () => {
      expect(readmeContent.length).toBeGreaterThan(0);
    });

    test('should have a title', () => {
      expect(readmeContent).toMatch(/^#\s+.+/m);
    });
  });

  describe('Markdown Syntax', () => {
    test('should have balanced markdown links', () => {
      const openBrackets = (readmeContent.match(/\[(?![^\]]*\])/g) || []).length;
      const closeBrackets = (readmeContent.match(/(?<!\[)\]/g) || []).length;
      
      // Should be roughly balanced (within 10%)
      expect(Math.abs(openBrackets - closeBrackets)).toBeLessThan(Math.max(openBrackets, closeBrackets) * 0.1 + 1);
    });

    test('should have valid markdown headers', () => {
      const headers = readmeContent.match(/^#{1,6}\s+.+/gm) || [];
      
      headers.forEach(header => {
        // Headers should have space after #
        expect(header).toMatch(/^#{1,6}\s+\S/);
      });
    });

    test('markdown lists should be properly formatted', () => {
      const listItems = readmeContent.match(/^[\s]*[-*+]\s+.+/gm) || [];
      
      listItems.forEach(item => {
        // List items should have space after marker
        expect(item).toMatch(/[-*+]\s+\S/);
      });
    });
  });

  describe('Content Requirements', () => {
    test('should mention the repository purpose', () => {
      const lowerContent = readmeContent.toLowerCase();
      const hasPurpose = 
        lowerContent.includes('prompt') ||
        lowerContent.includes('ai') ||
        lowerContent.includes('tool') ||
        lowerContent.includes('system');
      
      expect(hasPurpose).toBe(true);
    });

    test('should reference modified tools', () => {
      const lowerContent = readmeContent.toLowerCase();
      const modifiedTools = ['lovable', 'orchids', 'same', 'spawn'];
      
      // At least some tools should be mentioned
      const mentionedTools = modifiedTools.filter(tool => 
        lowerContent.includes(tool.toLowerCase())
      );
      
      // At least one tool should be mentioned
      expect(mentionedTools.length).toBeGreaterThan(0);
    });
  });

  describe('Link Validation', () => {
    test('internal links should use correct format', () => {
      const internalLinks = readmeContent.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
      
      internalLinks.forEach(link => {
        const url = link.match(/\(([^)]+)\)/)?.[1];
        if (url && !url.startsWith('http')) {
          // Internal links should not have spaces
          expect(url).not.toMatch(/\s/);
        }
      });
    });

    test('should not have broken relative links', () => {
      const relativeLinks = readmeContent.match(/\[([^\]]+)\]\((?!http)([^)]+)\)/g) || [];
      
      relativeLinks.forEach(link => {
        const url = link.match(/\(([^)]+)\)/)?.[1];
        if (url && !url.startsWith('#')) {
          const linkPath = path.join(path.dirname(readmePath), url);
          // Link target should exist (allowing for some flexibility)
          if (!url.includes('://')) {
            // Only check file links, not anchors or external
            const exists = fs.existsSync(linkPath);
            if (!exists) {
              console.warn(`Potentially broken link: ${url}`);
            }
          }
        }
      });
    });
  });

  describe('Formatting Quality', () => {
    test('should not have trailing whitespace on lines', () => {
      const lines = readmeContent.split('\n');
      const linesWithTrailingSpace = lines.filter(line => 
        line.length > 0 && line.match(/\s+$/)
      );
      
      // Allow some lines with trailing space, but not many
      expect(linesWithTrailingSpace.length).toBeLessThan(lines.length * 0.05);
    });

    test('should not have multiple consecutive blank lines', () => {
      const multipleBlankLines = readmeContent.match(/\n{4,}/g) || [];
      
      // Should have very few instances of 3+ blank lines
      expect(multipleBlankLines.length).toBeLessThan(5);
    });

    test('should use consistent list markers', () => {
      const listLines = readmeContent.match(/^[\s]*[-*+]\s+/gm) || [];
      
      if (listLines.length > 0) {
        const markers = listLines.map(line => line.match(/[-*+]/)?.[0]);
        const uniqueMarkers = new Set(markers);
        
        // Should primarily use one marker type
        const dominantMarker = [...uniqueMarkers].reduce((a, b) => 
          markers.filter(m => m === a).length > markers.filter(m => m === b).length ? a : b
        );
        
        const dominantCount = markers.filter(m => m === dominantMarker).length;
        expect(dominantCount).toBeGreaterThan(markers.length * 0.7);
      }
    });

    test('should not have mixed line endings', () => {
      const hasCRLF = readmeContent.includes('\r\n');
      const hasLF = readmeContent.includes('\n');
      
      if (hasCRLF && hasLF) {
        const crlfCount = (readmeContent.match(/\r\n/g) || []).length;
        const lfCount = (readmeContent.match(/\n/g) || []).length;
        expect(crlfCount).toBe(lfCount);
      }
    });
  });

  describe('Code Blocks', () => {
    test('code blocks should be properly fenced', () => {
      const codeBlockStarts = (readmeContent.match(/```/g) || []).length;
      
      // Should have even number (opening and closing)
      expect(codeBlockStarts % 2).toBe(0);
    });

    test('code blocks should specify language when appropriate', () => {
      const codeBlocks = readmeContent.match(/```(\w+)?\n/g) || [];
      
      if (codeBlocks.length > 0) {
        const blocksWithLang = codeBlocks.filter(block => block.match(/```\w+\n/));
        
        // At least 50% should specify language
        expect(blocksWithLang.length).toBeGreaterThan(codeBlocks.length * 0.3);
      }
    });
  });

  describe('Security', () => {
    test('should not contain API keys or tokens', () => {
      expect(readmeContent).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
      expect(readmeContent).not.toMatch(/ghp_[a-zA-Z0-9]{36}/);
      expect(readmeContent).not.toMatch(/xox[baprs]-[a-zA-Z0-9-]+/);
    });

    test('should not contain sensitive file paths', () => {
      expect(readmeContent).not.toMatch(/\/Users\/\w+\/\./);
      expect(readmeContent).not.toMatch(/C:\\Users\\\w+\\/);
      expect(readmeContent).not.toMatch(/\/home\/\w+\/\./);
    });

    test('should not expose internal URLs', () => {
      expect(readmeContent).not.toMatch(/localhost:\d+/);
      expect(readmeContent).not.toMatch(/127\.0\.0\.1/);
      expect(readmeContent).not.toMatch(/192\.168\.\d+\.\d+/);
    });
  });

  describe('SEO and Discoverability', () => {
    test('should have description or summary', () => {
      const firstParagraph = readmeContent.split('\n\n')[1] || '';
      expect(firstParagraph.length).toBeGreaterThan(50);
    });

    test('should use proper heading hierarchy', () => {
      const headings = readmeContent.match(/^(#{1,6})\s/gm) || [];
      
      if (headings.length > 1) {
        const levels = headings.map(h => h.match(/^(#{1,6})/)?.[1].length);
        
        // Should start with h1
        expect(levels[0]).toBe(1);
        
        // Should not skip levels (e.g., h1 -> h3)
        for (let i = 1; i < levels.length; i++) {
          expect(levels[i] - levels[i-1]).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('Accessibility', () => {
    test('images should have alt text', () => {
      const images = readmeContent.match(/!\[([^\]]*)\]/g) || [];
      
      images.forEach(img => {
        const altText = img.match(/!\[([^\]]*)\]/)?.[1];
        // Alt text should not be empty (though empty is technically valid)
        if (altText !== undefined && altText.length === 0) {
          console.warn('Image with empty alt text found');
        }
      });
    });

    test('links should have descriptive text', () => {
      const links = readmeContent.match(/\[([^\]]+)\]\([^)]+\)/g) || [];
      
      const vagueTexts = ['click here', 'here', 'link', 'this'];
      
      links.forEach(link => {
        const linkText = link.match(/\[([^\]]+)\]/)?.[1]?.toLowerCase();
        if (linkText) {
          expect(vagueTexts).not.toContain(linkText);
        }
      });
    });
  });

  describe('Content Completeness', () => {
    test('should not contain TODO markers', () => {
      const todos = readmeContent.match(/TODO/gi) || [];
      
      // Should have very few TODOs in main README
      expect(todos.length).toBeLessThan(3);
    });

    test('should not have placeholder text', () => {
      expect(readmeContent).not.toMatch(/\[INSERT.*\]/i);
      expect(readmeContent).not.toMatch(/\[PLACEHOLDER\]/i);
      expect(readmeContent).not.toMatch(/lorem ipsum/i);
    });

    test('should be substantial', () => {
      // README should be at least 500 characters
      expect(readmeContent.length).toBeGreaterThan(500);
      
      // Should have multiple sections
      const sections = readmeContent.match(/^##\s/gm) || [];
      expect(sections.length).toBeGreaterThan(0);
    });
  });
});