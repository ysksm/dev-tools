import type {
  ERDiagram,
  Entity,
  Relationship,
  Property,
  PropertyType,
  RelationshipCardinality,
} from '../../models/index.ts';

/**
 * Options for Mermaid diagram generation
 */
export interface MermaidOptions {
  /** Show entity properties */
  showProperties?: boolean;
  /** Show JSDoc comments as property descriptions */
  showComments?: boolean;
  /** Show key type markers (PK, FK, UK) */
  showKeyTypes?: boolean;
  /** Include entity attributes in output */
  showAttributes?: boolean;
}

const DEFAULT_OPTIONS: Required<MermaidOptions> = {
  showProperties: true,
  showComments: false,
  showKeyTypes: true,
  showAttributes: true,
};

/**
 * Generator for Mermaid erDiagram format
 */
export class MermaidGenerator {
  private options: Required<MermaidOptions>;

  constructor(options: MermaidOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate Mermaid erDiagram from ERDiagram
   * @param diagram - ER diagram to convert
   * @returns Mermaid diagram string
   */
  generate(diagram: ERDiagram): string {
    const lines: string[] = ['erDiagram'];

    // Generate relationships
    for (const rel of diagram.relationships) {
      lines.push(this.generateRelationship(rel));
    }

    // Generate entity definitions with attributes
    if (this.options.showProperties && this.options.showAttributes) {
      for (const entity of diagram.entities) {
        lines.push(...this.generateEntity(entity));
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate relationship line
   */
  private generateRelationship(rel: Relationship): string {
    const leftMarker = this.getLeftMarker(rel.cardinality);
    const rightMarker = this.getRightMarker(rel.cardinality);
    const lineStyle = rel.isIdentifying ? '--' : '..';

    // Escape label if needed
    const label = rel.label.includes(' ') || rel.label.includes('"')
      ? `"${rel.label.replace(/"/g, '\\"')}"`
      : rel.label;

    return `    ${rel.from} ${leftMarker}${lineStyle}${rightMarker} ${rel.to} : ${label}`;
  }

  /**
   * Get left side marker based on cardinality
   */
  private getLeftMarker(cardinality: RelationshipCardinality): string {
    switch (cardinality) {
      case 'one-to-one':
      case 'one-to-many':
      case 'one-to-zero-or-one':
      case 'one-to-zero-or-more':
        return '||';
      case 'zero-or-one-to-one':
      case 'zero-or-one-to-many':
        return '|o';
      case 'many-to-one':
      case 'many-to-many':
        return '}o';
      default:
        return '||';
    }
  }

  /**
   * Get right side marker based on cardinality
   */
  private getRightMarker(cardinality: RelationshipCardinality): string {
    switch (cardinality) {
      case 'one-to-one':
      case 'zero-or-one-to-one':
      case 'many-to-one':
        return '||';
      case 'one-to-zero-or-one':
        return 'o|';
      case 'one-to-many':
      case 'zero-or-one-to-many':
        return '|{';
      case 'one-to-zero-or-more':
      case 'many-to-many':
        return 'o{';
      default:
        return '||';
    }
  }

  /**
   * Generate entity definition with attributes
   */
  private generateEntity(entity: Entity): string[] {
    const lines: string[] = [];
    lines.push(`    ${entity.name} {`);

    for (const prop of entity.properties) {
      lines.push(this.generateProperty(prop));
    }

    lines.push('    }');
    return lines;
  }

  /**
   * Generate property line
   */
  private generateProperty(prop: Property): string {
    const typeName = this.formatTypeName(prop.type);
    const propName = this.sanitizeName(prop.name);

    let line = `        ${typeName} ${propName}`;

    // Add key type marker
    if (this.options.showKeyTypes && prop.keyType) {
      line += ` ${prop.keyType}`;
    }

    // Add comment
    if (this.options.showComments && prop.jsdoc?.description) {
      const comment = prop.jsdoc.description
        .replace(/"/g, '\\"')
        .replace(/\n/g, ' ')
        .slice(0, 50); // Truncate long comments
      line += ` "${comment}"`;
    }

    return line;
  }

  /**
   * Format type name for Mermaid
   */
  private formatTypeName(type: PropertyType): string {
    let name = this.sanitizeTypeName(type.name);

    // Handle generic types
    if (type.typeArguments && type.typeArguments.length > 0) {
      const args = type.typeArguments.map(t => this.formatTypeName(t)).join('-');
      name = `${name}~${args}~`;
    }

    // Handle arrays
    if (type.isArray) {
      name = `${name}[]`;
    }

    return name;
  }

  /**
   * Sanitize type name for Mermaid compatibility
   */
  private sanitizeTypeName(name: string): string {
    // Replace characters that might cause issues in Mermaid
    return name
      .replace(/\s*\|\s*/g, '-or-') // Union types
      .replace(/[<>]/g, '')         // Remove angle brackets
      .replace(/[,\s]+/g, '-')      // Replace commas and spaces
      .replace(/[^a-zA-Z0-9_\-\[\]~]/g, ''); // Remove other special chars
  }

  /**
   * Sanitize property name for Mermaid compatibility
   */
  private sanitizeName(name: string): string {
    // Property names with special characters need to be quoted or sanitized
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return name;
    }
    // Replace special characters
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }
}

/**
 * Generate Mermaid diagram from source code
 */
export async function generateMermaidFromSource(
  source: string,
  options?: MermaidOptions
): Promise<string> {
  const { TscParser } = await import('../parser/tsc/TscParser.ts');
  const parser = new TscParser();
  const diagram = await parser.parseSource(source);
  const generator = new MermaidGenerator(options);
  return generator.generate(diagram);
}

/**
 * Generate Mermaid diagram from files
 */
export async function generateMermaidFromFiles(
  filePaths: string[],
  options?: MermaidOptions
): Promise<string> {
  const { TscParser } = await import('../parser/tsc/TscParser.ts');
  const parser = new TscParser();
  const diagram = await parser.parseFiles(filePaths);
  const generator = new MermaidGenerator(options);
  return generator.generate(diagram);
}
