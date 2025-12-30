import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TscParser } from '../../src/core/parser/tsc/TscParser.ts';
import type { ITypeScriptParser, ERDiagram } from '../../src/core/parser/index.ts';

const FIXTURES_DIR = path.join(__dirname, '../fixtures');

// Test TscParser
const parsers: [string, () => ITypeScriptParser][] = [
  ['TSC', () => new TscParser()],
];

describe.each(parsers)('%s Parser', (name, createParser) => {
  let parser: ITypeScriptParser;

  beforeAll(() => {
    parser = createParser();
  });

  describe('Simple fixtures', () => {
    let diagram: ERDiagram;

    beforeAll(async () => {
      const source = fs.readFileSync(
        path.join(FIXTURES_DIR, 'simple.ts'),
        'utf-8'
      );
      diagram = await parser.parseSource(source, 'simple.ts');
    });

    it('should extract all entities', () => {
      expect(diagram.entities.length).toBe(3);
      const names = diagram.entities.map(e => e.name).sort();
      expect(names).toEqual(['Comment', 'Post', 'User']);
    });

    it('should identify interface vs type alias', () => {
      const user = diagram.entities.find(e => e.name === 'User');
      const comment = diagram.entities.find(e => e.name === 'Comment');

      expect(user?.kind).toBe('interface');
      expect(comment?.kind).toBe('type');
    });

    it('should extract properties correctly', () => {
      const user = diagram.entities.find(e => e.name === 'User');
      expect(user?.properties.length).toBe(4);

      const idProp = user?.properties.find(p => p.name === 'id');
      expect(idProp?.type.name).toBe('string');
      expect(idProp?.type.isPrimitive).toBe(true);
      expect(idProp?.keyType).toBe('PK');

      const ageProp = user?.properties.find(p => p.name === 'age');
      expect(ageProp?.type.isOptional).toBe(true);
    });

    it('should detect foreign keys', () => {
      const post = diagram.entities.find(e => e.name === 'Post');
      const authorIdProp = post?.properties.find(p => p.name === 'authorId');

      expect(authorIdProp?.keyType).toBe('FK');
    });
  });

  describe('Complex fixtures', () => {
    let diagram: ERDiagram;

    beforeAll(async () => {
      const source = fs.readFileSync(
        path.join(FIXTURES_DIR, 'complex.ts'),
        'utf-8'
      );
      diagram = await parser.parseSource(source, 'complex.ts');
    });

    it('should handle extends', () => {
      const user = diagram.entities.find(e => e.name === 'User');
      expect(user?.extends).toContain('BaseEntity');
    });

    it('should detect array relationships', () => {
      const user = diagram.entities.find(e => e.name === 'User');
      const postsProp = user?.properties.find(p => p.name === 'posts');

      expect(postsProp?.type.isArray).toBe(true);
      expect(postsProp?.type.isReference).toBe(true);
      expect(postsProp?.type.referenceTo).toBe('Post');
    });

    it('should detect optional relationships', () => {
      const user = diagram.entities.find(e => e.name === 'User');
      const profileProp = user?.properties.find(p => p.name === 'profile');

      expect(profileProp?.type.isOptional).toBe(true);
      expect(profileProp?.type.isReference).toBe(true);
    });

    it('should extract relationships', () => {
      // Check for User -> Post relationship
      const userPostRel = diagram.relationships.find(
        r => r.from === 'User' && r.to === 'Post'
      );
      expect(userPostRel).toBeDefined();
      expect(userPostRel?.cardinality).toBe('one-to-many');
      expect(userPostRel?.label).toBe('posts');
    });

    it('should handle union literal types', () => {
      const post = diagram.entities.find(e => e.name === 'Post');
      const statusProp = post?.properties.find(p => p.name === 'status');

      expect(statusProp?.type.unionTypes?.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    let diagram: ERDiagram;

    beforeAll(async () => {
      const source = fs.readFileSync(
        path.join(FIXTURES_DIR, 'edge-cases.ts'),
        'utf-8'
      );
      diagram = await parser.parseSource(source, 'edge-cases.ts');
    });

    it('should handle empty interface', () => {
      const empty = diagram.entities.find(e => e.name === 'Empty');
      expect(empty).toBeDefined();
      expect(empty?.properties.length).toBe(0);
    });

    it('should handle all optional properties', () => {
      const allOptional = diagram.entities.find(e => e.name === 'AllOptional');
      expect(allOptional?.properties.every(p => p.type.isOptional)).toBe(true);
    });

    it('should handle self-referencing types', () => {
      const treeNode = diagram.entities.find(e => e.name === 'TreeNode');
      expect(treeNode).toBeDefined();

      const parentProp = treeNode?.properties.find(p => p.name === 'parent');
      expect(parentProp?.type.referenceTo).toBe('TreeNode');

      const childrenProp = treeNode?.properties.find(p => p.name === 'children');
      expect(childrenProp?.type.isArray).toBe(true);
      expect(childrenProp?.type.referenceTo).toBe('TreeNode');
    });

    it('should handle multiple extends', () => {
      const entity = diagram.entities.find(e => e.name === 'Entity');
      expect(entity?.extends).toContain('Timestamped');
      expect(entity?.extends).toContain('Identifiable');
    });
  });

  describe('Inline source parsing', () => {
    it('should parse inline source code', async () => {
      const source = `
        interface Product {
          id: string;
          name: string;
          price: number;
        }
      `;

      const diagram = await parser.parseSource(source);

      expect(diagram.entities.length).toBe(1);
      expect(diagram.entities[0].name).toBe('Product');
      expect(diagram.entities[0].properties.length).toBe(3);
    });
  });

  describe('FK type inference', () => {
    it('should infer relationship from UserId type to User entity', async () => {
      const source = `
        type UserId = string & { __brand: 'UserId' };
        interface User {
          /** @pk */
          id: UserId;
          name: string;
        }
        interface Todo {
          /** @pk */
          id: string;
          /** @fk */
          assigneeId: UserId;
          title: string;
        }
      `;
      const diagram = await parser.parseSource(source);
      expect(diagram.relationships).toContainEqual(
        expect.objectContaining({ from: 'Todo', to: 'User', label: 'assigneeId' })
      );
    });

    it('should detect optional FK as zero-or-one cardinality', async () => {
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
          assigneeId?: UserId;
        }
      `;
      const diagram = await parser.parseSource(source);
      const rel = diagram.relationships.find(r => r.label === 'assigneeId');
      expect(rel).toBeDefined();
      expect(rel?.cardinality).toBe('one-to-zero-or-one');
    });

    it('should detect required FK as one-to-one cardinality', async () => {
      const source = `
        type UserStoryId = string & { __brand: 'UserStoryId' };
        interface UserStory {
          /** @pk */
          id: UserStoryId;
        }
        interface Todo {
          /** @pk */
          id: string;
          /** @fk */
          userStoryId: UserStoryId;
        }
      `;
      const diagram = await parser.parseSource(source);
      const rel = diagram.relationships.find(r => r.label === 'userStoryId');
      expect(rel).toBeDefined();
      expect(rel?.from).toBe('Todo');
      expect(rel?.to).toBe('UserStory');
      expect(rel?.cardinality).toBe('one-to-one');
    });

    it('should not infer if target entity does not exist', async () => {
      const source = `
        type UserId = string & { __brand: 'UserId' };
        interface Todo {
          /** @pk */
          id: string;
          /** @fk */
          assigneeId: UserId;
        }
      `;
      const diagram = await parser.parseSource(source);
      // No User entity exists, so no relationship should be inferred
      expect(diagram.relationships.length).toBe(0);
    });

    it('should handle multiple FK fields to different entities', async () => {
      const source = `
        type UserId = string & { __brand: 'UserId' };
        type UserStoryId = string & { __brand: 'UserStoryId' };
        interface User {
          /** @pk */
          id: UserId;
        }
        interface UserStory {
          /** @pk */
          id: UserStoryId;
          /** @fk */
          reporterId: UserId;
          /** @fk */
          assigneeId?: UserId;
        }
        interface Todo {
          /** @pk */
          id: string;
          /** @fk */
          userStoryId: UserStoryId;
          /** @fk */
          assigneeId?: UserId;
        }
      `;
      const diagram = await parser.parseSource(source);

      // UserStory -> User (reporterId)
      expect(diagram.relationships).toContainEqual(
        expect.objectContaining({ from: 'UserStory', to: 'User', label: 'reporterId' })
      );
      // UserStory -> User (assigneeId)
      expect(diagram.relationships).toContainEqual(
        expect.objectContaining({ from: 'UserStory', to: 'User', label: 'assigneeId' })
      );
      // Todo -> UserStory (userStoryId)
      expect(diagram.relationships).toContainEqual(
        expect.objectContaining({ from: 'Todo', to: 'UserStory', label: 'userStoryId' })
      );
      // Todo -> User (assigneeId)
      expect(diagram.relationships).toContainEqual(
        expect.objectContaining({ from: 'Todo', to: 'User', label: 'assigneeId' })
      );
    });
  });
});
