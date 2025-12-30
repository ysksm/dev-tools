/**
 * Domain models for TypeScript ER diagram generation
 */

/** Property type information */
export interface PropertyType {
  /** Base type name (string, number, UserType, etc.) */
  name: string;
  /** Whether this is an array type */
  isArray: boolean;
  /** Whether this property is optional */
  isOptional: boolean;
  /** Generic type arguments */
  typeArguments?: PropertyType[];
  /** Whether this references another entity */
  isReference: boolean;
  /** Referenced entity name */
  referenceTo?: string;
  /** Whether this is a primitive type */
  isPrimitive: boolean;
  /** Union type members */
  unionTypes?: PropertyType[];
  /** Literal value for literal types */
  literalValue?: string | number | boolean;
}

/** JSDoc tag */
export interface JSDocTag {
  name: string;
  text?: string;
}

/** JSDoc comment information */
export interface JSDocInfo {
  description?: string;
  tags: JSDocTag[];
}

/** Property definition */
export interface Property {
  name: string;
  type: PropertyType;
  /** Key type (PK, FK, UK) - inferred from JSDoc or naming convention */
  keyType?: 'PK' | 'FK' | 'UK';
  jsdoc?: JSDocInfo;
}

/** Type parameter for generics */
export interface TypeParameter {
  name: string;
  constraint?: string;
  default?: string;
}

/** Entity definition (interface or type alias) */
export interface Entity {
  name: string;
  kind: 'interface' | 'type';
  properties: Property[];
  /** Parent types (extends) */
  extends?: string[];
  /** Implemented interfaces */
  implements?: string[];
  /** Generic type parameters */
  typeParameters?: TypeParameter[];
  jsdoc?: JSDocInfo;
  /** Source file path */
  sourceFile?: string;
}

/** Relationship cardinality */
export type RelationshipCardinality =
  | 'one-to-one'       // ||--||
  | 'one-to-many'      // ||--|{
  | 'many-to-one'      // }|--||
  | 'many-to-many'     // }|--|{
  | 'zero-or-one-to-one'    // |o--||
  | 'zero-or-one-to-many'   // |o--|{
  | 'one-to-zero-or-one'    // ||--o|
  | 'one-to-zero-or-more';  // ||--o{

/** Relationship between entities */
export interface Relationship {
  from: string;
  to: string;
  cardinality: RelationshipCardinality;
  /** Property name that defines this relationship */
  label: string;
  /** Whether this is an identifying relationship */
  isIdentifying: boolean;
}

/** ER diagram metadata */
export interface ERDiagramMetadata {
  sourceFiles: string[];
  generatedAt: Date;
  parserEngine: 'swc' | 'tsc';
}

/** Complete ER diagram */
export interface ERDiagram {
  entities: Entity[];
  relationships: Relationship[];
  metadata: ERDiagramMetadata;
}

/** Primitive type names */
export const PRIMITIVE_TYPES = new Set([
  'string',
  'number',
  'boolean',
  'null',
  'undefined',
  'void',
  'never',
  'unknown',
  'any',
  'bigint',
  'symbol',
  'object',
]);

/** Check if a type name is primitive */
export function isPrimitiveType(typeName: string): boolean {
  return PRIMITIVE_TYPES.has(typeName);
}
