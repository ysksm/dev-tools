/**
 * Edge case test fixtures
 */

/** Empty interface */
interface Empty {}

/** Interface with only optional properties */
interface AllOptional {
  name?: string;
  value?: number;
}

/** Interface with union types */
interface UnionTypes {
  id: string | number;
  status: 'active' | 'inactive' | null;
  data: string | number | boolean;
}

/** Interface with nested arrays */
interface NestedArrays {
  matrix: number[][];
  users: Array<Array<User>>;
}

/** Simple User for reference */
interface User {
  id: string;
  name: string;
}

/** Interface with literal types */
interface LiteralTypes {
  type: 'user';
  count: 42;
  active: true;
}

/** Interface with Record and Map-like types */
interface MapTypes {
  settings: Record<string, string>;
  data: Map<string, number>;
}

/** Deeply nested type */
interface DeepNested {
  level1: {
    level2: {
      level3: {
        value: string;
      };
    };
  };
}

/** Self-referencing type (tree structure) */
interface TreeNode {
  id: string;
  value: string;
  parent?: TreeNode;
  children: TreeNode[];
}

/** Multiple inheritance (extends multiple interfaces) */
interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

interface Identifiable {
  id: string;
}

interface Entity extends Timestamped, Identifiable {
  name: string;
}
