import * as ts from 'typescript';
import type { ITypeScriptParser } from '../index.ts';
import type {
  ERDiagram,
  Entity,
  Property,
  PropertyType,
  Relationship,
  JSDocInfo,
  JSDocTag,
  RelationshipCardinality
} from '../../../models/index.ts';
import { isPrimitiveType } from '../../../models/index.ts';

/**
 * TypeScript parser using TypeScript Compiler API
 */
export class TscParser implements ITypeScriptParser {
  private entityMap: Map<string, Entity> = new Map();
  private typeChecker: ts.TypeChecker | null = null;

  async parseFiles(filePaths: string[]): Promise<ERDiagram> {
    // Create program for type checking
    const program = ts.createProgram(filePaths, {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      strict: true,
    });

    this.typeChecker = program.getTypeChecker();

    const entities: Entity[] = [];

    for (const filePath of filePaths) {
      const sourceFile = program.getSourceFile(filePath);
      if (sourceFile) {
        const fileEntities = this.extractEntities(sourceFile);
        entities.push(...fileEntities);
      }
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
        parserEngine: 'tsc',
      },
    };
  }

  async parseSource(source: string, fileName = 'virtual.ts'): Promise<ERDiagram> {
    // Create a virtual source file
    const sourceFile = ts.createSourceFile(
      fileName,
      source,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS
    );

    // For source parsing, we don't have a full program so no type checker
    this.typeChecker = null;

    const entities = this.extractEntities(sourceFile);

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
        parserEngine: 'tsc',
      },
    };
  }

  private extractEntities(sourceFile: ts.SourceFile): Entity[] {
    const entities: Entity[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isInterfaceDeclaration(node)) {
        const entity = this.extractInterface(node, sourceFile.fileName);
        entities.push(entity);
      } else if (ts.isTypeAliasDeclaration(node)) {
        const entity = this.extractTypeAlias(node, sourceFile.fileName);
        if (entity) {
          entities.push(entity);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return entities;
  }

  private extractInterface(node: ts.InterfaceDeclaration, sourceFile: string): Entity {
    const name = node.name.text;
    const properties: Property[] = [];

    for (const member of node.members) {
      if (ts.isPropertySignature(member)) {
        const prop = this.extractProperty(member);
        if (prop) {
          properties.push(prop);
        }
      }
    }

    // Extract extends
    const extendsNames = node.heritageClauses
      ?.filter(clause => clause.token === ts.SyntaxKind.ExtendsKeyword)
      .flatMap(clause => clause.types.map(type => {
        if (ts.isIdentifier(type.expression)) {
          return type.expression.text;
        }
        return null;
      }))
      .filter((n): n is string => n !== null);

    // Extract type parameters
    const typeParameters = node.typeParameters?.map(param => ({
      name: param.name.text,
      constraint: param.constraint ? this.typeNodeToString(param.constraint) : undefined,
      default: param.default ? this.typeNodeToString(param.default) : undefined,
    }));

    // Extract JSDoc
    const jsdoc = this.extractJSDoc(node);

    return {
      name,
      kind: 'interface',
      properties,
      extends: extendsNames?.length ? extendsNames : undefined,
      typeParameters: typeParameters?.length ? typeParameters : undefined,
      jsdoc,
      sourceFile,
    };
  }

  private extractTypeAlias(node: ts.TypeAliasDeclaration, sourceFile: string): Entity | null {
    const name = node.name.text;

    // Only handle object types (type literals)
    if (!ts.isTypeLiteralNode(node.type)) {
      return null;
    }

    const properties: Property[] = [];

    for (const member of node.type.members) {
      if (ts.isPropertySignature(member)) {
        const prop = this.extractProperty(member);
        if (prop) {
          properties.push(prop);
        }
      }
    }

    // Extract type parameters
    const typeParameters = node.typeParameters?.map(param => ({
      name: param.name.text,
      constraint: param.constraint ? this.typeNodeToString(param.constraint) : undefined,
      default: param.default ? this.typeNodeToString(param.default) : undefined,
    }));

    // Extract JSDoc
    const jsdoc = this.extractJSDoc(node);

    return {
      name,
      kind: 'type',
      properties,
      typeParameters: typeParameters?.length ? typeParameters : undefined,
      jsdoc,
      sourceFile,
    };
  }

  private extractProperty(prop: ts.PropertySignature): Property | null {
    // Get property name
    let name: string;
    if (ts.isIdentifier(prop.name)) {
      name = prop.name.text;
    } else if (ts.isStringLiteral(prop.name)) {
      name = prop.name.text;
    } else {
      return null;
    }

    // Get type
    const type = this.extractPropertyType(prop.type);
    type.isOptional = prop.questionToken !== undefined;

    // Extract JSDoc
    const jsdoc = this.extractJSDoc(prop);

    // Infer key type from JSDoc or naming convention
    const keyType = this.inferKeyType(name, jsdoc);

    return {
      name,
      type,
      keyType,
      jsdoc,
    };
  }

  private extractPropertyType(typeNode: ts.TypeNode | undefined): PropertyType {
    if (!typeNode) {
      return {
        name: 'unknown',
        isArray: false,
        isOptional: false,
        isReference: false,
        isPrimitive: false,
      };
    }

    return this.resolveTypeNode(typeNode);
  }

  private resolveTypeNode(typeNode: ts.TypeNode): PropertyType {
    // Keyword types (string, number, boolean, etc.)
    if (this.isKeywordType(typeNode.kind)) {
      const name = this.keywordToString(typeNode.kind);
      return {
        name,
        isArray: false,
        isOptional: false,
        isReference: false,
        isPrimitive: true,
      };
    }

    // Type reference (User, Post, Array<T>, etc.)
    if (ts.isTypeReferenceNode(typeNode)) {
      const typeName = ts.isIdentifier(typeNode.typeName)
        ? typeNode.typeName.text
        : typeNode.typeName.getText();

      // Check if it's an Array type
      if (typeName === 'Array' && typeNode.typeArguments?.length) {
        const elementType = this.resolveTypeNode(typeNode.typeArguments[0]);
        return {
          ...elementType,
          isArray: true,
        };
      }

      // Check for generic type arguments
      const typeArguments = typeNode.typeArguments?.map(t => this.resolveTypeNode(t));

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
    }

    // Array type (T[])
    if (ts.isArrayTypeNode(typeNode)) {
      const elementType = this.resolveTypeNode(typeNode.elementType);
      return {
        ...elementType,
        isArray: true,
      };
    }

    // Union type (A | B | null)
    if (ts.isUnionTypeNode(typeNode)) {
      const unionTypes = typeNode.types.map(t => this.resolveTypeNode(t));

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
    }

    // Literal types
    if (ts.isLiteralTypeNode(typeNode)) {
      const literal = typeNode.literal;
      if (ts.isStringLiteral(literal)) {
        return {
          name: 'string',
          isArray: false,
          isOptional: false,
          isReference: false,
          isPrimitive: true,
          literalValue: literal.text,
        };
      } else if (ts.isNumericLiteral(literal)) {
        return {
          name: 'number',
          isArray: false,
          isOptional: false,
          isReference: false,
          isPrimitive: true,
          literalValue: Number(literal.text),
        };
      } else if (literal.kind === ts.SyntaxKind.TrueKeyword) {
        return {
          name: 'boolean',
          isArray: false,
          isOptional: false,
          isReference: false,
          isPrimitive: true,
          literalValue: true,
        };
      } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
        return {
          name: 'boolean',
          isArray: false,
          isOptional: false,
          isReference: false,
          isPrimitive: true,
          literalValue: false,
        };
      }
    }

    return {
      name: 'unknown',
      isArray: false,
      isOptional: false,
      isReference: false,
      isPrimitive: false,
    };
  }

  private isKeywordType(kind: ts.SyntaxKind): boolean {
    return [
      ts.SyntaxKind.StringKeyword,
      ts.SyntaxKind.NumberKeyword,
      ts.SyntaxKind.BooleanKeyword,
      ts.SyntaxKind.NullKeyword,
      ts.SyntaxKind.UndefinedKeyword,
      ts.SyntaxKind.VoidKeyword,
      ts.SyntaxKind.NeverKeyword,
      ts.SyntaxKind.UnknownKeyword,
      ts.SyntaxKind.AnyKeyword,
      ts.SyntaxKind.BigIntKeyword,
      ts.SyntaxKind.SymbolKeyword,
      ts.SyntaxKind.ObjectKeyword,
    ].includes(kind);
  }

  private keywordToString(kind: ts.SyntaxKind): string {
    const mapping: Partial<Record<ts.SyntaxKind, string>> = {
      [ts.SyntaxKind.StringKeyword]: 'string',
      [ts.SyntaxKind.NumberKeyword]: 'number',
      [ts.SyntaxKind.BooleanKeyword]: 'boolean',
      [ts.SyntaxKind.NullKeyword]: 'null',
      [ts.SyntaxKind.UndefinedKeyword]: 'undefined',
      [ts.SyntaxKind.VoidKeyword]: 'void',
      [ts.SyntaxKind.NeverKeyword]: 'never',
      [ts.SyntaxKind.UnknownKeyword]: 'unknown',
      [ts.SyntaxKind.AnyKeyword]: 'any',
      [ts.SyntaxKind.BigIntKeyword]: 'bigint',
      [ts.SyntaxKind.SymbolKeyword]: 'symbol',
      [ts.SyntaxKind.ObjectKeyword]: 'object',
    };
    return mapping[kind] || 'unknown';
  }

  private typeNodeToString(typeNode: ts.TypeNode): string {
    const resolved = this.resolveTypeNode(typeNode);
    let result = resolved.name;
    if (resolved.typeArguments?.length) {
      result += `<${resolved.typeArguments.map(t => t.name).join(', ')}>`;
    }
    if (resolved.isArray) {
      result += '[]';
    }
    return result;
  }

  private extractJSDoc(node: ts.Node): JSDocInfo | undefined {
    const jsdocComments = ts.getJSDocCommentsAndTags(node);
    if (jsdocComments.length === 0) return undefined;

    const tags: JSDocTag[] = [];
    let description: string | undefined;

    for (const comment of jsdocComments) {
      if (ts.isJSDoc(comment)) {
        if (comment.comment) {
          description = typeof comment.comment === 'string'
            ? comment.comment
            : comment.comment.map(c => c.text).join('');
        }

        if (comment.tags) {
          for (const tag of comment.tags) {
            tags.push({
              name: tag.tagName.text,
              text: tag.comment
                ? (typeof tag.comment === 'string'
                    ? tag.comment
                    : tag.comment.map(c => c.text).join(''))
                : undefined,
            });
          }
        }
      }
    }

    if (!description && tags.length === 0) return undefined;

    return {
      description: description?.trim(),
      tags,
    };
  }

  private inferKeyType(name: string, jsdoc?: JSDocInfo): 'PK' | 'FK' | 'UK' | undefined {
    // Check JSDoc tags first
    if (jsdoc?.tags) {
      if (jsdoc.tags.some(t => t.name === 'pk' || t.name === 'primaryKey')) {
        return 'PK';
      }
      if (jsdoc.tags.some(t => t.name === 'fk' || t.name === 'foreignKey')) {
        return 'FK';
      }
      if (jsdoc.tags.some(t => t.name === 'unique')) {
        return 'UK';
      }
    }

    // Fallback to naming convention
    if (name === 'id' || name === 'ID' || name === '_id') {
      return 'PK';
    }

    if (name.endsWith('Id') && name.length > 2) {
      return 'FK';
    }

    return undefined;
  }

  private resolveRelationships(entities: Entity[]): Relationship[] {
    const relationships: Relationship[] = [];
    const entityNames = new Set(entities.map(e => e.name));

    for (const entity of entities) {
      // Property references
      for (const prop of entity.properties) {
        // Direct entity reference (posts: Post[], profile: Profile)
        if (prop.type.isReference && prop.type.referenceTo && this.entityMap.has(prop.type.referenceTo)) {
          const rel = this.createRelationship(entity.name, prop);
          relationships.push(rel);
        }
        // FK type inference (assigneeId: UserId → User)
        else if (prop.keyType === 'FK') {
          const targetEntity = this.inferTargetEntityFromFkType(
            prop.type,
            entityNames
          );
          if (targetEntity) {
            relationships.push({
              from: entity.name,
              to: targetEntity,
              cardinality: this.determineCardinality(false, prop.type.isOptional),
              label: prop.name,
              isIdentifying: !prop.type.isOptional,
            });
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

  /**
   * Infer target entity from FK type name
   * UserId → User, UserStoryId → UserStory
   */
  private inferTargetEntityFromFkType(
    propType: PropertyType,
    entityNames: Set<string>
  ): string | null {
    const typeName = propType.referenceTo || propType.name;

    // Only process type names ending with "Id"
    if (typeName.endsWith('Id') && typeName.length > 2) {
      const baseType = typeName.slice(0, -2);  // UserId → User
      if (entityNames.has(baseType)) {
        return baseType;
      }
    }

    return null;
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
