import { describe, it, expect } from 'vitest';
import { D2Generator } from '../../src/core/generator/D2Generator.ts';
import { TscParser } from '../../src/core/parser/tsc/TscParser.ts';
import type { ERDiagram } from '../../src/models/index.ts';

describe('D2Generator', () => {
  const parser = new TscParser();

  describe('Basic generation', () => {
    it('should generate D2 diagram with entities and relationships', async () => {
      const source = `
        interface User {
          /** @pk */
          id: string;
          name: string;
        }
        interface Post {
          /** @pk */
          id: string;
          /** @fk */
          authorId: string;
          title: string;
        }
      `;
      const diagram = await parser.parseSource(source);
      const generator = new D2Generator();
      const output = generator.generate(diagram);

      expect(output).toContain('direction: right');
      expect(output).toContain('User: {');
      expect(output).toContain('shape: sql_table');
      expect(output).toContain('id: string {constraint: primary_key}');
      expect(output).toContain('Post: {');
      expect(output).toContain('authorId: string {constraint: foreign_key}');
    });

    it('should generate relationships with labels', async () => {
      const source = `
        type UserId = string & { __brand: 'UserId' };
        interface User {
          /** @pk */
          id: UserId;
        }
        interface Todo {
          /** @pk */
          id: string;
          /** @fk */
          assigneeId: UserId;
        }
      `;
      const diagram = await parser.parseSource(source);
      const generator = new D2Generator();
      const output = generator.generate(diagram);

      expect(output).toContain('Todo -> User: assigneeId');
    });
  });

  describe('Options', () => {
    it('should support direction option', async () => {
      const source = `interface User { id: string; }`;
      const diagram = await parser.parseSource(source);

      const generator = new D2Generator({ direction: 'down' });
      const output = generator.generate(diagram);

      expect(output).toContain('direction: down');
    });

    it('should support class shape', async () => {
      const source = `interface User { id: string; }`;
      const diagram = await parser.parseSource(source);

      const generator = new D2Generator({ shape: 'class' });
      const output = generator.generate(diagram);

      expect(output).toContain('shape: class');
    });

    it('should hide properties when showProperties is false', async () => {
      const source = `interface User { id: string; name: string; }`;
      const diagram = await parser.parseSource(source);

      const generator = new D2Generator({ showProperties: false });
      const output = generator.generate(diagram);

      expect(output).toContain('User');
      expect(output).not.toContain('shape: sql_table');
      expect(output).not.toContain('id: string');
    });

    it('should hide constraints when showConstraints is false', async () => {
      const source = `
        interface User {
          /** @pk */
          id: string;
        }
      `;
      const diagram = await parser.parseSource(source);

      const generator = new D2Generator({ showConstraints: false });
      const output = generator.generate(diagram);

      expect(output).toContain('id: string');
      expect(output).not.toContain('{constraint: primary_key}');
    });
  });

  describe('Type formatting', () => {
    it('should handle array types', async () => {
      const source = `interface User { tags: string[]; }`;
      const diagram = await parser.parseSource(source);
      const generator = new D2Generator();
      const output = generator.generate(diagram);

      expect(output).toContain('tags: string[]');
    });

    it('should handle optional types', async () => {
      const source = `interface User { email?: string; }`;
      const diagram = await parser.parseSource(source);
      const generator = new D2Generator();
      const output = generator.generate(diagram);

      expect(output).toContain('email: string?');
    });
  });
});
