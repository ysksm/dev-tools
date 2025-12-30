import { parseSync, type Module, type TsInterfaceDeclaration, type TsTypeAliasDeclaration, type TsPropertySignature, type TsType, type TsTypeAnnotation } from '@swc/core';
import * as fs from 'fs';
import type { ITypeScriptParser } from '../index.js';
import type {
  ERDiagram,
  Entity,
  Property,
  PropertyType,
  Relationship,
  JSDocInfo,
  RelationshipCardinality
} from '../../../models/index.js';
import { isPrimitiveType } from '../../../models/index.js';

/**
 * TypeScript parser using SWC
 */
export class SwcParser implements ITypeScriptParser {
  private entityMap: Map<string, Entity> = new Map();

  async parseFiles(filePaths: string[]): Promise<ERDiagram> {
    const entities: Entity[] = [];

    for (const filePath of filePaths) {
      const source = fs.readFileSync(filePath, 'utf-8');
      const fileEntities = this.parseSourceInternal(source, filePath);
      entities.push(...fileEntities);
    }

    // Build entity map for relationship resolution
    this.entityMap = new Map(entities.map(e => [e.name, e]));

    // Resolve relationships
    const relationships = this.resolveRelationships(entities);

    return {
      entities,
      relationships,
      metadata: {
        sourceFiles: filePaths,
        generatedAt: new Date(),
        parserEngine: 'swc',
      },
    };
  }

  async parseSource(source: string, fileName = 'virtual.ts'): Promise<ERDiagram> {
    const entities = this.parseSourceInternal(source, fileName);

    // Build entity map for relationship resolution
    this.entityMap = new Map(entities.map(e => [e.name, e]));

    // Resolve relationships
    const relationships = this.resolveRelationships(entities);

    return {
      entities,
      relationships,
      metadata: {
        sourceFiles: [fileName],
        generatedAt: new Date(),
        parserEngine: 'swc',
      },
    };
  }

  private parseSourceInternal(source: string, fileName: string): Entity[] {
    const ast = parseSync(source, {
      syntax: 'typescript',
      tsx: false,
      comments: true,
    });

    return this.extractEntities(ast, fileName);
  }

  private extractEntities(ast: Module, sourceFile: string): Entity[] {
    const entities: Entity[] = [];

    for (const item of ast.body) {
      if (item.type === 'TsInterfaceDeclaration') {
        const entity = this.extractInterface(item, sourceFile);
        entities.push(entity);
      } else if (item.type === 'TsTypeAliasDeclaration') {
        const entity = this.extractTypeAlias(item, sourceFile);
        if (entity) {
          entities.push(entity);
        }
      }
    }

    return entities;
  }

  private extractInterface(decl: TsInterfaceDeclaration, sourceFile: string): Entity {
    const name = decl.id.value;
    const properties: Property[] = [];

    for (const member of decl.body.body) {
      if (member.type === 'TsPropertySignature') {
        const prop = this.extractProperty(member);
        if (prop) {
          properties.push(prop);
        }
      }
    }

    // Extract extends
    const extendsNames = decl.extends?.map(ext => {
      if (ext.expression.type === 'Identifier') {
        return ext.expression.value;
      }
      return null;
    }).filter((n): n is string => n !== null);

    // Extract type parameters
    const typeParameters = decl.typeParams?.parameters.map(param => ({
      name: param.name.value,
      constraint: param.constraint ? this.typeToString(param.constraint) : undefined,
      default: param.default ? this.typeToString(param.default) : undefined,
    }));

    return {
      name,
      kind: 'interface',
      properties,
      extends: extendsNames?.length ? extendsNames : undefined,
      typeParameters: typeParameters?.length ? typeParameters : undefined,
      sourceFile,
    };
  }

  private extractTypeAlias(decl: TsTypeAliasDeclaration, sourceFile: string): Entity | null {
    const name = decl.id.value;

    // Only handle object types (type literals)
    if (decl.typeAnnotation.type !== 'TsTypeLiteral') {
      return null;
    }

    const properties: Property[] = [];

    for (const member of decl.typeAnnotation.members) {
      if (member.type === 'TsPropertySignature') {
        const prop = this.extractProperty(member);
        if (prop) {
          properties.push(prop);
        }
      }
    }

    // Extract type parameters
    const typeParameters = decl.typeParams?.parameters.map(param => ({
      name: param.name.value,
      constraint: param.constraint ? this.typeToString(param.constraint) : undefined,
      default: param.default ? this.typeToString(param.default) : undefined,
    }));

    return {
      name,
      kind: 'type',
      properties,
      typeParameters: typeParameters?.length ? typeParameters : undefined,
      sourceFile,
    };
  }

  private extractProperty(prop: TsPropertySignature): Property | null {
    // Get property name
    let name: string;
    if (prop.key.type === 'Identifier') {
      name = prop.key.value;
    } else if (prop.key.type === 'StringLiteral') {
      name = prop.key.value;
    } else {
      return null;
    }

    // Get type
    const type = this.extractPropertyType(prop.typeAnnotation);
    type.isOptional = prop.optional ?? false;

    // Infer key type from naming convention
    const keyType = this.inferKeyType(name);

    return {
      name,
      type,
      keyType,
    };
  }

  private extractPropertyType(typeAnnotation: TsTypeAnnotation | undefined): PropertyType {
    if (!typeAnnotation) {
      return {
        name: 'unknown',
        isArray: false,
        isOptional: false,
        isReference: false,
        isPrimitive: false,
      };
    }

    return this.resolveType(typeAnnotation.typeAnnotation);
  }

  private resolveType(tsType: TsType): PropertyType {
    switch (tsType.type) {
      case 'TsKeywordType':
        return {
          name: this.keywordToString(tsType.kind),
          isArray: false,
          isOptional: false,
          isReference: false,
          isPrimitive: true,
        };

      case 'TsTypeReference':
        const typeName = tsType.typeName.type === 'Identifier'
          ? tsType.typeName.value
          : 'unknown';

        // Check if it's an Array type
        if (typeName === 'Array' && tsType.typeParams?.params.length) {
          const elementType = this.resolveType(tsType.typeParams.params[0]);
          return {
            ...elementType,
            isArray: true,
          };
        }

        // Check for generic type arguments
        const typeArguments = tsType.typeParams?.params.map(p => this.resolveType(p));

        const isPrimitive = isPrimitiveType(typeName);
        return {
          name: typeName,
          isArray: false,
          isOptional: false,
          typeArguments: typeArguments?.length ? typeArguments : undefined,
          isReference: !isPrimitive,
          referenceTo: !isPrimitive ? typeName : undefined,
          isPrimitive,
        };

      case 'TsArrayType':
        const elementType = this.resolveType(tsType.elemType);
        return {
          ...elementType,
          isArray: true,
        };

      case 'TsUnionType':
        const unionTypes = tsType.types.map(t => this.resolveType(t));
        // Filter out null/undefined for optional check
        const nonNullTypes = unionTypes.filter(t =>
          t.name !== 'null' && t.name !== 'undefined'
        );
        const hasNullOrUndefined = unionTypes.length !== nonNullTypes.length;

        if (nonNullTypes.length === 1) {
          return {
            ...nonNullTypes[0],
            isOptional: hasNullOrUndefined,
          };
        }

        return {
          name: unionTypes.map(t => t.name).join(' | '),
          isArray: false,
          isOptional: hasNullOrUndefined,
          isReference: false,
          isPrimitive: false,
          unionTypes,
        };

      case 'TsLiteralType':
        if (tsType.literal.type === 'StringLiteral') {
          return {
            name: 'string',
            isArray: false,
            isOptional: false,
            isReference: false,
            isPrimitive: true,
            literalValue: tsType.literal.value,
          };
        } else if (tsType.literal.type === 'NumericLiteral') {
          return {
            name: 'number',
            isArray: false,
            isOptional: false,
            isReference: false,
            isPrimitive: true,
            literalValue: tsType.literal.value,
          };
        } else if (tsType.literal.type === 'BooleanLiteral') {
          return {
            name: 'boolean',
            isArray: false,
            isOptional: false,
            isReference: false,
            isPrimitive: true,
            literalValue: tsType.literal.value,
          };
        }
        return {
          name: 'unknown',
          isArray: false,
          isOptional: false,
          isReference: false,
          isPrimitive: false,
        };

      default:
        return {
          name: 'unknown',
          isArray: false,
          isOptional: false,
          isReference: false,
          isPrimitive: false,
        };
    }
  }

  private keywordToString(kind: string): string {
    const mapping: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'null': 'null',
      'undefined': 'undefined',
      'void': 'void',
      'never': 'never',
      'unknown': 'unknown',
      'any': 'any',
      'bigint': 'bigint',
      'symbol': 'symbol',
      'object': 'object',
    };
    return mapping[kind] || kind;
  }

  private typeToString(tsType: TsType): string {
    const resolved = this.resolveType(tsType);
    let result = resolved.name;
    if (resolved.typeArguments?.length) {
      result += `<${resolved.typeArguments.map(t => t.name).join(', ')}>`;
    }
    if (resolved.isArray) {
      result += '[]';
    }
    return result;
  }

  private inferKeyType(name: string): 'PK' | 'FK' | 'UK' | undefined {
    // Primary key patterns
    if (name === 'id' || name === 'ID' || name === '_id') {
      return 'PK';
    }

    // Foreign key patterns (ends with Id and has a prefix)
    if (name.endsWith('Id') && name.length > 2) {
      return 'FK';
    }

    return undefined;
  }

  private resolveRelationships(entities: Entity[]): Relationship[] {
    const relationships: Relationship[] = [];

    for (const entity of entities) {
      // Property references
      for (const prop of entity.properties) {
        if (prop.type.isReference && prop.type.referenceTo) {
          if (this.entityMap.has(prop.type.referenceTo)) {
            const rel = this.createRelationship(entity.name, prop);
            relationships.push(rel);
          }
        }
      }

      // Extends relationships
      if (entity.extends) {
        for (const parentName of entity.extends) {
          if (this.entityMap.has(parentName)) {
            relationships.push({
              from: entity.name,
              to: parentName,
              cardinality: 'one-to-one',
              label: 'extends',
              isIdentifying: true,
            });
          }
        }
      }
    }

    return this.deduplicateRelationships(relationships);
  }

  private createRelationship(entityName: string, prop: Property): Relationship {
    const cardinality = this.determineCardinality(
      prop.type.isArray,
      prop.type.isOptional
    );

    return {
      from: entityName,
      to: prop.type.referenceTo!,
      cardinality,
      label: prop.name,
      isIdentifying: !prop.type.isOptional,
    };
  }

  private determineCardinality(
    isArray: boolean,
    isOptional: boolean
  ): RelationshipCardinality {
    if (isArray) {
      return isOptional ? 'one-to-zero-or-more' : 'one-to-many';
    }
    return isOptional ? 'one-to-zero-or-one' : 'one-to-one';
  }

  private deduplicateRelationships(rels: Relationship[]): Relationship[] {
    const seen = new Set<string>();
    return rels.filter(rel => {
      const key = `${rel.from}->${rel.to}:${rel.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
