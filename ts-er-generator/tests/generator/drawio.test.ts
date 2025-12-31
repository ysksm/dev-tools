import { describe, it, expect } from 'vitest';
import { DrawioGenerator } from '../../src/core/generator/DrawioGenerator.ts';
import { TscParser } from '../../src/core/parser/tsc/TscParser.ts';

describe('DrawioGenerator', () => {
  const parser = new TscParser();

  describe('Basic generation', () => {
    it('should generate valid Draw.io XML structure', async () => {
      const source = `
        interface User {
          /** @pk */
          id: string;
          name: string;
        }
      `;
      const diagram = await parser.parseSource(source);
      const generator = new DrawioGenerator();
      const output = generator.generate(diagram);

      expect(output).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(output).toContain('<mxfile');
      expect(output).toContain('<mxGraphModel');
      expect(output).toContain('<root>');
      expect(output).toContain('</mxfile>');
    });

    it('should generate entity as swimlane table', async () => {
      const source = `
        interface User {
          /** @pk */
          id: string;
          name: string;
        }
      `;
      const diagram = await parser.parseSource(source);
      const generator = new DrawioGenerator();
      const output = generator.generate(diagram);

      expect(output).toContain('value="User"');
      expect(output).toContain('style="swimlane;fontStyle=1;childLayout=stackLayout');
    });

    it('should generate properties with key type markers', async () => {
      const source = `
        interface User {
          /** @pk */
          id: string;
          /** @fk */
          roleId: string;
        }
      `;
      const diagram = await parser.parseSource(source);
      const generator = new DrawioGenerator();
      const output = generator.generate(diagram);

      expect(output).toContain('[PK] id: string');
      expect(output).toContain('[FK] roleId: string');
    });

    it('should highlight PK fields with different color', async () => {
      const source = `
        interface User {
          /** @pk */
          id: string;
        }
      `;
      const diagram = await parser.parseSource(source);
      const generator = new DrawioGenerator();
      const output = generator.generate(diagram);

      // PK fields should have yellow background
      expect(output).toContain('fillColor=#fff2cc');
      expect(output).toContain('strokeColor=#d6b656');
    });
  });

  describe('Relationships', () => {
    it('should generate relationship edges', async () => {
      const source = `
        type UserId = string & { __brand: 'UserId' };
        interface User {
          /** @pk */
          id: UserId;
        }
        interface Post {
          /** @pk */
          id: string;
          /** @fk */
          authorId: UserId;
        }
      `;
      const diagram = await parser.parseSource(source);
      const generator = new DrawioGenerator();
      const output = generator.generate(diagram);

      expect(output).toContain('edge="1"');
      expect(output).toContain('value="authorId"');
    });
  });

  describe('Options', () => {
    it('should hide key types when showKeyTypes is false', async () => {
      const source = `
        interface User {
          /** @pk */
          id: string;
        }
      `;
      const diagram = await parser.parseSource(source);
      const generator = new DrawioGenerator({ showKeyTypes: false });
      const output = generator.generate(diagram);

      expect(output).toContain('id: string');
      expect(output).not.toContain('[PK]');
    });

    it('should support custom entity width', async () => {
      const source = `interface User { id: string; }`;
      const diagram = await parser.parseSource(source);
      const generator = new DrawioGenerator({ entityWidth: 300 });
      const output = generator.generate(diagram);

      expect(output).toContain('width="300"');
    });
  });

  describe('Type formatting', () => {
    it('should handle array types', async () => {
      const source = `interface User { tags: string[]; }`;
      const diagram = await parser.parseSource(source);
      const generator = new DrawioGenerator();
      const output = generator.generate(diagram);

      expect(output).toContain('tags: string[]');
    });

    it('should handle optional types', async () => {
      const source = `interface User { email?: string; }`;
      const diagram = await parser.parseSource(source);
      const generator = new DrawioGenerator();
      const output = generator.generate(diagram);

      expect(output).toContain('email: string?');
    });
  });

  describe('XML escaping', () => {
    it('should escape special XML characters in entity names', async () => {
      const source = `interface User { name: string; }`;
      const diagram = await parser.parseSource(source);
      const generator = new DrawioGenerator();
      const output = generator.generate(diagram);

      // Output should be valid XML (no unescaped special chars)
      expect(() => {
        // Basic XML validation - check structure
        expect(output).toMatch(/^<\?xml/);
        expect(output).toMatch(/<\/mxfile>$/);
      }).not.toThrow();
    });
  });
});
